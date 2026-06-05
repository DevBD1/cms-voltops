import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import {
  cities,
  connectorTypes,
  districts,
  plugs,
  stations,
} from '../db/schema';
import { HttpError } from '../utils/http';

type Station = typeof stations.$inferSelect;
type Plug = typeof plugs.$inferSelect;
type ConnectorTypeRow = typeof connectorTypes.$inferSelect;
type District = typeof districts.$inferSelect;
type City = typeof cities.$inferSelect;

export type PlugStatus = 'available' | 'in_use' | 'fault' | 'offline';
export type StationStatus = 'active' | 'maintenance' | 'offline';

export interface StationSummary extends Station {
  city: string;
  district: string;
  countryCode: string;
  totalPlugs: number;
  availablePlugs: number;
  faultyPlugs: number;
  maxPowerKw: number;
  plugTypes: string[];
  distanceKm?: number;
}

export interface PlugDetails extends Plug {
  plugType: string;
  currentType: string;
  station: StationSummary;
  connectorType: ConnectorTypeRow;
}

type StationJoinedRow = {
  station: Station;
  district: District;
  city: City;
};

type PlugJoinedRow = {
  plug: Plug;
  connectorType: ConnectorTypeRow;
  station: Station;
  district: District;
  city: City;
};

function distanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const fromLatitudeRad = (fromLatitude * Math.PI) / 180;
  const toLatitudeRad = (toLatitude * Math.PI) / 180;
  const halfChord =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRad) *
      Math.cos(toLatitudeRad) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHalfChord = Math.min(1, Math.max(0, halfChord));

  return (
    Math.round(
      earthRadiusKm *
        2 *
        Math.atan2(
          Math.sqrt(clampedHalfChord),
          Math.sqrt(1 - clampedHalfChord),
        ) *
        100,
    ) / 100
  );
}

export class CatalogService {
  async ensureDistrictId(
    countryCode: string,
    cityName: string,
    districtName: string,
  ): Promise<number> {
    const normalizedCountry = countryCode.trim().toUpperCase() || 'TR';
    const normalizedCity = cityName.trim();
    const normalizedDistrict = districtName.trim();

    if (!normalizedCity || !normalizedDistrict) {
      throw new HttpError(400, 'city and district are required');
    }

    const [existingCity] = await db
      .select()
      .from(cities)
      .where(
        and(
          eq(cities.countryCode, normalizedCountry),
          eq(cities.name, normalizedCity),
        ),
      );

    const city =
      existingCity ??
      (
        await db
          .insert(cities)
          .values({ countryCode: normalizedCountry, name: normalizedCity })
          .onConflictDoNothing()
          .returning()
      )[0] ??
      (
        await db
          .select()
          .from(cities)
          .where(
            and(
              eq(cities.countryCode, normalizedCountry),
              eq(cities.name, normalizedCity),
            ),
          )
      )[0];

    const [existingDistrict] = await db
      .select()
      .from(districts)
      .where(
        and(
          eq(districts.cityId, city.id),
          eq(districts.name, normalizedDistrict),
        ),
      );

    const district =
      existingDistrict ??
      (
        await db
          .insert(districts)
          .values({ cityId: city.id, name: normalizedDistrict })
          .onConflictDoNothing()
          .returning()
      )[0] ??
      (
        await db
          .select()
          .from(districts)
          .where(
            and(
              eq(districts.cityId, city.id),
              eq(districts.name, normalizedDistrict),
            ),
          )
      )[0];

    return district.id;
  }

  async listStations(options?: {
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }): Promise<StationSummary[]> {
    const [stationRows, plugRows] = await Promise.all([
      this.loadStations(),
      this.loadPlugs(),
    ]);
    const summaries = stationRows.map((row) =>
      this.toStationSummary(
        row,
        plugRows.map((plugRow) => plugRow.plug),
      ),
    );

    if (options?.latitude === undefined || options.longitude === undefined) {
      return summaries;
    }

    const radiusKm = options.radiusKm ?? 25;

    return summaries
      .map((station) => ({
        ...station,
        distanceKm: distanceKm(
          options.latitude!,
          options.longitude!,
          Number(station.latitude),
          Number(station.longitude),
        ),
      }))
      .filter((station) => station.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getStation(
    stationCode: string,
  ): Promise<StationSummary & { plugs: PlugDetails[] }> {
    const station = await this.findStation(stationCode);
    const plugRows = await this.loadPlugs();

    return {
      ...this.toStationSummary(
        station,
        plugRows.map((plugRow) => plugRow.plug),
      ),
      plugs: plugRows
        .filter((row) => row.plug.stationCode === station.station.stationCode)
        .map((row) => this.toPlugDetails(row, plugRows)),
    };
  }

  async listPlugs(filters?: {
    stationCode?: string;
    status?: string;
  }): Promise<PlugDetails[]> {
    const rows = await this.loadPlugs(filters);
    return rows.map((row) => this.toPlugDetails(row, rows));
  }

  async setStationStatus(
    stationCode: string,
    status: StationStatus,
  ): Promise<StationSummary> {
    const [station] = await db
      .update(stations)
      .set({ status, updatedAt: new Date() })
      .where(eq(stations.stationCode, stationCode))
      .returning();

    if (!station) {
      throw new HttpError(404, 'Station not found');
    }

    const [joined] = await this.loadStations(stationCode);
    return this.toStationSummary(
      joined,
      (await this.loadPlugs()).map((plugRow) => plugRow.plug),
    );
  }

  async setPlugStatus(
    plugCode: string,
    status: PlugStatus,
  ): Promise<PlugDetails> {
    const [plug] = await db
      .update(plugs)
      .set({ status, updatedAt: new Date() })
      .where(eq(plugs.plugCode, plugCode))
      .returning();

    if (!plug) {
      throw new HttpError(404, 'Plug not found');
    }

    const rows = await this.loadPlugs();
    const row = rows.find((item) => item.plug.plugCode === plugCode);

    if (!row) {
      throw new HttpError(500, `Plug ${plugCode} could not be loaded`);
    }

    return this.toPlugDetails(row, rows);
  }

  private async loadStations(
    stationCode?: string,
  ): Promise<StationJoinedRow[]> {
    const query = db
      .select({
        station: stations,
        district: districts,
        city: cities,
      })
      .from(stations)
      .innerJoin(districts, eq(stations.districtId, districts.id))
      .innerJoin(cities, eq(districts.cityId, cities.id));

    return stationCode
      ? query.where(eq(stations.stationCode, stationCode))
      : query;
  }

  private async loadPlugs(filters?: {
    stationCode?: string;
    status?: string;
  }): Promise<PlugJoinedRow[]> {
    const conditions: SQL[] = [];

    if (filters?.stationCode) {
      conditions.push(eq(plugs.stationCode, filters.stationCode));
    }

    if (filters?.status) {
      conditions.push(eq(plugs.status, filters.status));
    }

    const query = db
      .select({
        plug: plugs,
        connectorType: connectorTypes,
        station: stations,
        district: districts,
        city: cities,
      })
      .from(plugs)
      .innerJoin(
        connectorTypes,
        eq(plugs.connectorTypeCode, connectorTypes.code),
      )
      .innerJoin(stations, eq(plugs.stationCode, stations.stationCode))
      .innerJoin(districts, eq(stations.districtId, districts.id))
      .innerJoin(cities, eq(districts.cityId, cities.id));

    return conditions.length > 0 ? query.where(and(...conditions)) : query;
  }

  private async findStation(stationCode: string): Promise<StationJoinedRow> {
    const [station] = await this.loadStations(stationCode);

    if (!station) {
      throw new HttpError(404, 'Station not found');
    }

    return station;
  }

  private toStationSummary(
    row: StationJoinedRow,
    plugRows: Plug[],
  ): StationSummary {
    const stationPlugs = plugRows.filter(
      (plug) => plug.stationCode === row.station.stationCode,
    );

    return {
      ...row.station,
      city: row.city.name,
      district: row.district.name,
      countryCode: row.city.countryCode,
      totalPlugs: stationPlugs.length,
      availablePlugs: stationPlugs.filter((plug) => plug.status === 'available')
        .length,
      faultyPlugs: stationPlugs.filter((plug) => plug.status === 'fault')
        .length,
      maxPowerKw: Math.max(
        ...stationPlugs.map((plug) => Number(plug.powerKw)),
        0,
      ),
      plugTypes: [
        ...new Set(stationPlugs.map((plug) => plug.connectorTypeCode)),
      ],
    };
  }

  private toPlugDetails(row: PlugJoinedRow, plugRows: PlugJoinedRow[]) {
    const station = this.toStationSummary(
      {
        station: row.station,
        district: row.district,
        city: row.city,
      },
      plugRows.map((plugRow) => plugRow.plug),
    );

    return {
      ...row.plug,
      plugType: row.connectorType.code,
      currentType: row.connectorType.currentType,
      connectorType: row.connectorType,
      station,
    };
  }
}
