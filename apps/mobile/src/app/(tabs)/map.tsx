import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Text, View, ScrollView, Pressable, Image, StyleSheet } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { apiRequest } from "@/lib/api";
import { ActionButton } from "@/components/ActionButton";

type StationRow = {
  stationCode: string;
  name: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  status: string;
  totalPlugs: number;
  availablePlugs: number;
  maxPowerKw: number;
  plugTypes: string[];
};

type PlugRow = {
  plugCode: string;
  plugType: string;
  powerKw: string;
  currentType: string;
  status: string;
};

type StationDetails = StationRow & {
  plugs: PlugRow[];
};

type ProfileData = {
  vehicles: Array<{
    plateNumber: string;
    connectorType: string;
    relationshipType: string;
    isPrimary: boolean;
  }>;
};

type SessionRow = {
  id: number;
  status: string;
  plugCode: string;
};

const fallbackRegion: Region = {
  latitude: 41.037,
  longitude: 29.01,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function getStationCoordinate(station: StationRow) {
  return {
    latitude: Number(station.latitude),
    longitude: Number(station.longitude),
  };
}

function getStationRegion(stations: StationRow[]): Region {
  if (stations.length === 0) {
    return fallbackRegion;
  }

  const coordinates = stations.map(getStationCoordinate).filter((coordinate) => Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude));

  if (coordinates.length === 0) {
    return fallbackRegion;
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.8, 0.03),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.8, 0.03),
  };
}

export default function StationMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationDetails | null>(null);
  const [selectedPlugCode, setSelectedPlugCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStationLoading, setIsStationLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [stationRows, profileData, activeSessions] = await Promise.all([
          apiRequest<StationRow[]>("/api/mobile/stations"),
          apiRequest<ProfileData>("/api/mobile/me"),
          apiRequest<SessionRow[]>("/api/mobile/sessions?status=active"),
        ]);

        if (!isMounted) return;

        setStations(stationRows ?? []);
        setProfile(profileData);
        setActiveSession(activeSessions[0] ?? null);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load station catalog");
        setStations([]);
        setProfile(null);
        setActiveSession(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refreshVehicleContext() {
        try {
          const [profileData, activeSessions] = await Promise.all([
            apiRequest<ProfileData>("/api/mobile/me"),
            apiRequest<SessionRow[]>("/api/mobile/sessions?status=active"),
          ]);

          if (isActive) {
            setProfile(profileData);
            setActiveSession(activeSessions[0] ?? null);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to refresh garage data");
          }
        }
      }

      refreshVehicleContext();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const selectedVehicle = useMemo(() => {
    const vehicles = profile?.vehicles ?? [];
    return vehicles.find((vehicle) => vehicle.isPrimary) ?? vehicles[0] ?? null;
  }, [profile]);

  const availablePlugs = useMemo(() => selectedStation?.plugs.filter((plug) => plug.status === "available") ?? [], [selectedStation]);
  const selectedPlug = useMemo(
    () => availablePlugs.find((plug) => plug.plugCode === selectedPlugCode) ?? availablePlugs[0] ?? null,
    [availablePlugs, selectedPlugCode],
  );

  const onlineLabel = useMemo(() => {
    if (isLoading) return "SYNCING";
    if (errorMessage) return "OFFLINE";
    return "ONLINE";
  }, [errorMessage, isLoading]);
  const mapRegion = useMemo(() => getStationRegion(stations), [stations]);

  useEffect(() => {
    const coordinates = stations.map(getStationCoordinate).filter((coordinate) => Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude));

    if (coordinates.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: { top: 140, right: 60, bottom: 320, left: 60 },
    });
  }, [stations]);

  async function loadStationDetails(stationCode: string) {
    setIsStationLoading(true);
    setErrorMessage(null);

    try {
      const station = await apiRequest<StationDetails>(`/api/mobile/stations/${stationCode}`);
      const firstAvailablePlug = station.plugs.find((plug) => plug.status === "available") ?? null;

      setSelectedStation(station);
      setSelectedPlugCode(firstAvailablePlug?.plugCode ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load station plugs");
      setSelectedStation(null);
      setSelectedPlugCode(null);
    } finally {
      setIsStationLoading(false);
    }
  }

  async function startSession() {
    if (!selectedVehicle || !selectedPlug || activeSession || isStarting) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const session = await apiRequest<SessionRow>("/api/mobile/sessions", {
        method: "POST",
        body: JSON.stringify({
          plugCode: selectedPlug.plugCode,
          vehiclePlateNumber: selectedVehicle.plateNumber,
        }),
      });

      setActiveSession(session);
      router.push("/(tabs)/pulse");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start charge session");
    } finally {
      setIsStarting(false);
    }
  }

  function handleExploreAction() {
    if (activeSession) {
      router.push("/(tabs)/pulse");
      return;
    }

    if (!selectedVehicle) {
      router.push("/(tabs)/profile");
      return;
    }

    void startSession();
  }

  const actionLabel = activeSession
    ? "View active session"
    : !selectedVehicle
      ? "Add vehicle first"
      : selectedPlug
        ? "Start charging"
        : "Select an available plug";
  const actionIcon = activeSession ? "pulse-outline" : !selectedVehicle ? "car-sport-outline" : selectedPlug ? "flash-outline" : "location-outline";
  const actionDisabled = !activeSession && Boolean(selectedVehicle) && (!selectedPlug || isStationLoading);

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Native world map with API-backed charger positions */}
      <View className="absolute inset-0 z-0 opacity-80">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {stations.map((station) => {
            const coordinate = getStationCoordinate(station);

            if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
              return null;
            }

            const isSelected = selectedStation?.stationCode === station.stationCode;

            return (
              <Marker
                key={station.stationCode}
                coordinate={coordinate}
                title={station.name}
                description={`${station.availablePlugs}/${station.totalPlugs} plugs available`}
                onPress={() => loadStationDetails(station.stationCode)}
                pinColor={isSelected ? "#00E5FF" : station.availablePlugs > 0 ? "#39FF14" : "#94A3B8"}
              />
            );
          })}
        </MapView>
      </View>

      {/* Map Gradient Overlays */}
      <LinearGradient
        pointerEvents="none"
        colors={["#0A0E1A", "transparent", "#0A0E1A"]}
        className="absolute inset-0 z-1"
      />

      <SafeAreaView pointerEvents="box-none" edges={["top", "left", "right"]} className="flex-1 justify-between z-10">
        {/* Header App Bar Info */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <View>
            <Text className="text-white text-3xl font-extrabold tracking-tight" style={{ fontFamily: "Sora" }}>
              VoltOps
            </Text>
            <Text className="text-cyan-glow text-[10px] uppercase tracking-widest font-bold mt-0.5">
              Station Finder
            </Text>
          </View>

          <View className="flex-row items-center space-x-3 gap-x-3">
            <View className="bg-slate-navy/90 border border-border-slate px-4 py-2.5 rounded-2xl">
              <Text className="text-white text-xs font-bold">{onlineLabel}</Text>
            </View>
            <View className="w-10 h-10 rounded-full border border-cyan-glow/20 overflow-hidden bg-slate-navy">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJu4NbgKHQnN3fT5UMg3woNTJNF4HWfkSPNsqTd4fQHOX4PQqGSazaEeeUYrKhP7xePiRfUT1QaZgdDp2wDcpUDvjnrTAHKF0fOigkr6IqL9YWE7uD4YbdmtKgLFSOpAVOn_MDAb4JAioHdaUuW5YkoS9Wc_eAM-sNehEb2i9ye3-nlebaDhNJ_TBKT9Kxdhzx_whxi3OJddvmT_F-WEsE7uGEhO5rLVvmxzEUCW8YnJdkZRynPoFb4zVNow4zU1P_46IWnaLKVQ",
                }}
                className="w-full h-full"
              />
            </View>
          </View>
        </View>

        <View pointerEvents="none" className="flex-1" />

        {/* Sliding Bottom Panel / Scroll list */}
        <View className="bg-slate-navy rounded-t-[32px] border-t border-border-slate p-6 space-y-4">
          <View className="flex-row justify-center pb-2">
            <View className="w-12 h-1 bg-border-slate rounded-full opacity-40" />
          </View>

          {/* Details header */}
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-white font-bold text-lg" style={{ fontFamily: "Sora" }}>
                {selectedStation?.name ?? "Select a station"}
              </Text>
              <Text className="text-muted text-xs mt-1" style={{ fontFamily: "Inter" }}>
                📍 {selectedStation ? `${selectedStation.district}, ${selectedStation.city}` : "Click a charging node on map"}
              </Text>
            </View>
            <View className="bg-elevated-navy px-3 py-1.5 rounded-full border border-cyan-glow/10">
              <Text className="text-cyan-glow text-[10px] font-bold uppercase tracking-wider">
                {selectedStation ? "OPEN" : "WAITING"}
              </Text>
            </View>
          </View>

          {/* Plug selectors */}
          {availablePlugs.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
              <View className="flex-row gap-x-3 pr-4">
                {availablePlugs.map((plug) => {
                  const isSelected = selectedPlug?.plugCode === plug.plugCode;

                  return (
                    <Pressable
                      key={plug.plugCode}
                      onPress={() => setSelectedPlugCode(plug.plugCode)}
                      className={`flex-shrink-0 p-4 rounded-2xl border min-w-[150px] ${
                        isSelected ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy/40"
                      }`}
                    >
                      <View className="flex-row items-center space-x-2 gap-x-2 mb-2">
                        <Text className="text-cyan-glow">🔌</Text>
                        <Text className="text-cyan-glow text-[9px] font-bold tracking-widest uppercase">
                          {plug.status}
                        </Text>
                      </View>
                      <Text className="text-white font-bold text-sm">{plug.plugType}</Text>
                      <Text className="text-muted text-[10px] font-semibold mt-0.5">
                        {Number(plug.powerKw).toFixed(0)} kW • {plug.currentType}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View className="py-2 bg-elevated-navy/20 p-4 rounded-2xl border border-border-slate border-dashed">
              <Text className="text-muted text-xs text-center" style={{ fontFamily: "Inter" }}>
                Select an online station node to list compatible CCS & Type-2 plug points.
              </Text>
            </View>
          )}

          {errorMessage ? (
            <Text className="text-red-400 text-xs text-center">{errorMessage}</Text>
          ) : null}

          <ActionButton
            label={actionLabel}
            iconName={actionIcon}
            onPress={handleExploreAction}
            disabled={actionDisabled}
            loading={isStarting}
            variant={activeSession ? "neutral" : "primary"}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
