import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { plugs, stations } from '../db/schema';
import { HttpError } from '../utils/http';

type Station = typeof stations.$inferSelect;
type Plug = typeof plugs.$inferSelect;
export type PlugStatus = 'available' | 'in_use' | 'fault' | 'offline';
export type StationStatus = 'active' | 'maintenance' | 'offline';

export interface StationSummary extends Station {
  totalPlugs: number;
  availablePlugs: number;
  maxPowerKw: number;
  plugTypes: string[];
  distanceKm?: number;
}

export interface PlugDetails extends Plug {
  station: Station;
}

function distanceKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const fromLatitudeRad = (fromLatitude * Math.PI) / 180;
  const toLatitudeRad = (toLatitude * Math.PI) / 180;
  const halfChord =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRad) * Math.cos(toLatitudeRad) * Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord)) * 100) / 100;
}

export class CatalogService {
  async listStations(options?: { latitude?: number; longitude?: number; radiusKm?: number }): Promise<StationSummary[]> {
    const [stationRows, plugRows] = await Promise.all([db.select().from(stations), db.select().from(plugs)]);
    const summaries = stationRows.map((station) => this.toStationSummary(station, plugRows));

    if (options?.latitude === undefined || options.longitude === undefined) {
      return summaries;
    }

    const radiusKm = options.radiusKm ?? 25;

    return summaries
      .map((station) => ({
        ...station,
        distanceKm: distanceKm(options.latitude!, options.longitude!, Number(station.latitude), Number(station.longitude)),
      }))
      .filter((station) => station.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getStation(stationCode: string): Promise<StationSummary & { plugs: PlugDetails[] }> {
    const station = await this.findStation(stationCode);

    return {
      ...this.toStationSummary(station, await db.select().from(plugs)),
      plugs: await this.listPlugs({ stationCode }),
    };
  }

  async listPlugs(filters?: { stationCode?: string; status?: string }): Promise<PlugDetails[]> {
    const plugRows = await db.select().from(plugs);
    const stationRows = await db.select().from(stations);

    return plugRows
      .filter((plug) => (filters?.stationCode ? plug.stationCode === filters.stationCode : true))
      .filter((plug) => (filters?.status ? plug.status === filters.status : true))
      .map((plug) => this.toPlugDetails(plug, stationRows));
  }

  async setStationStatus(stationCode: string, status: StationStatus): Promise<StationSummary> {
    const [station] = await db
      .update(stations)
      .set({ status, updatedAt: new Date() })
      .where(eq(stations.stationCode, stationCode))
      .returning();

    if (!station) {
      throw new HttpError(404, 'Station not found');
    }

    return this.toStationSummary(station, await db.select().from(plugs));
  }

  async setPlugStatus(plugCode: string, status: PlugStatus): Promise<PlugDetails> {
    const [plug] = await db.update(plugs).set({ status, updatedAt: new Date() }).where(eq(plugs.plugCode, plugCode)).returning();

    if (!plug) {
      throw new HttpError(404, 'Plug not found');
    }

    return this.toPlugDetails(plug, await db.select().from(stations));
  }

  private async findStation(stationCode: string): Promise<Station> {
    const [station] = await db.select().from(stations).where(eq(stations.stationCode, stationCode));

    if (!station) {
      throw new HttpError(404, 'Station not found');
    }

    return station;
  }

  private toStationSummary(station: Station, plugRows: Plug[]): StationSummary {
    const stationPlugs = plugRows.filter((plug) => plug.stationCode === station.stationCode);

    return {
      ...station,
      totalPlugs: stationPlugs.length,
      availablePlugs: stationPlugs.filter((plug) => plug.status === 'available').length,
      maxPowerKw: Math.max(...stationPlugs.map((plug) => Number(plug.powerKw)), 0),
      plugTypes: [...new Set(stationPlugs.map((plug) => plug.plugType))],
    };
  }

  private toPlugDetails(plug: Plug, stationRows: Station[]): PlugDetails {
    const station = stationRows.find((item) => item.stationCode === plug.stationCode);

    if (!station) {
      throw new HttpError(500, `Plug ${plug.plugCode} has no station`);
    }

    return { ...plug, station };
  }
}
