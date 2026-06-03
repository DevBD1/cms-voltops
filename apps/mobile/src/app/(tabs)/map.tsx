import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Text, View, ScrollView, Pressable } from "react-native";

import { apiRequest } from "@/lib/api";

type StationRow = {
  stationCode: string;
  name: string;
  city: string;
  district: string;
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

export default function StationMap() {
  const router = useRouter();
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

        if (!isMounted) {
          return;
        }

        setStations(stationRows ?? []);
        setProfile(profileData);
        setActiveSession(activeSessions[0] ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load station catalog");
        setStations([]);
        setProfile(null);
        setActiveSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
    if (isLoading) {
      return "SYNCING";
    }

    if (errorMessage) {
      return "OFFLINE";
    }

    return "ONLINE";
  }, [errorMessage, isLoading]);

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

  const startDisabled = !selectedVehicle || !selectedPlug || Boolean(activeSession) || isStationLoading || isStarting;
  const startLabel = activeSession
    ? "Active Session Running"
    : !selectedVehicle
      ? "Add Vehicle To Start"
      : selectedPlug
        ? isStarting
          ? "Starting Session"
          : "Start Charge Session"
        : "No Available Plug";

  return (
    <View className="flex-1 bg-midnight p-6 pt-16">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-white text-3xl font-bold tracking-tight">VoltOps</Text>
          <Text className="text-cyan-glow text-xs uppercase tracking-widest font-semibold">Station Finder</Text>
        </View>
        <View className="bg-slate-navy border border-border-slate px-4 py-2 rounded-2xl">
          <Text className="text-white text-xs font-bold">{onlineLabel}</Text>
        </View>
      </View>

      <View className="flex-1 bg-slate-navy rounded-[32px] border border-border-slate overflow-hidden relative justify-center items-center mb-6 min-h-[220px]">
        <View className="absolute inset-0 opacity-10 flex items-center justify-center">
          <View className="w-[150%] h-[150%] rounded-full border border-white" />
          <View className="w-[100%] h-[100%] rounded-full border border-white" />
          <View className="w-[50%] h-[50%] rounded-full border border-white" />
        </View>

        {stations.slice(0, 4).map((station, index) => (
          <View
            key={station.stationCode}
            className="absolute p-3 bg-cyan-glow/20 rounded-full border border-cyan-glow items-center justify-center"
            style={{
              top: `${25 + index * 14}%`,
              left: `${24 + index * 13}%`,
            }}
          >
            <View className="w-3 h-3 bg-cyan-glow rounded-full shadow shadow-cyan-glow" />
          </View>
        ))}

        <Text className="text-muted text-sm font-semibold tracking-wider uppercase z-10 bg-midnight/80 px-4 py-2 rounded-full border border-border-slate">
          {stations.length} Stations Online
        </Text>
      </View>

      <Text className="text-white font-bold text-lg mb-3">Nearby Super-Chargers</Text>
      <ScrollView className="space-y-3 gap-y-2 flex-grow-0 h-56">
        {isLoading ? (
          <View className="bg-slate-navy p-4 rounded-2xl border border-border-slate">
            <Text className="text-muted text-sm font-semibold">Loading station catalog...</Text>
          </View>
        ) : errorMessage ? (
          <View className="bg-slate-navy p-4 rounded-2xl border border-border-slate">
            <Text className="text-white font-bold">Supabase connection failed</Text>
            <Text className="text-muted text-xs mt-1">{errorMessage}</Text>
          </View>
        ) : (
          stations.map((station) => {
            const isSelected = selectedStation?.stationCode === station.stationCode;

            return (
              <Pressable
                key={station.stationCode}
                onPress={() => loadStationDetails(station.stationCode)}
                className={`bg-slate-navy p-4 rounded-2xl border flex-row justify-between items-center active:bg-elevated-navy ${
                  isSelected ? "border-cyan-glow" : "border-border-slate"
                }`}
              >
                <View className="space-y-1 flex-1 pr-3">
                  <Text className="text-white font-bold">{station.name}</Text>
                  <Text className="text-muted text-xs">
                    {station.district}, {station.city}
                    {station.maxPowerKw
                      ? ` - ${Number(station.maxPowerKw).toFixed(0)} kW ${station.plugTypes.join("/")}`
                      : " - Plug data pending"}
                  </Text>
                </View>
                <Text className="text-cyan-glow font-bold">
                  {station.availablePlugs}/{station.totalPlugs} Free
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View className="bg-slate-navy p-4 rounded-2xl border border-border-slate mt-4">
        <View className="flex-row justify-between items-start gap-x-3">
          <View className="flex-1">
            <Text className="text-white font-bold">{selectedStation?.name ?? "Select a station"}</Text>
            <Text className="text-muted text-xs mt-1">
              {selectedVehicle
                ? `Vehicle ${selectedVehicle.plateNumber}`
                : "A vehicle is required before starting a charge session."}
            </Text>
          </View>
          <Text className="text-cyan-glow text-xs font-bold">
            {isStationLoading ? "LOADING" : `${availablePlugs.length} FREE`}
          </Text>
        </View>

        {availablePlugs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            <View className="flex-row gap-x-2">
              {availablePlugs.map((plug) => {
                const isSelected = selectedPlug?.plugCode === plug.plugCode;

                return (
                  <Pressable
                    key={plug.plugCode}
                    onPress={() => setSelectedPlugCode(plug.plugCode)}
                    className={`px-4 py-3 rounded-2xl border ${isSelected ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy"}`}
                  >
                    <Text className="text-white text-xs font-bold">{plug.plugCode}</Text>
                    <Text className="text-muted text-xs mt-1">
                      {Number(plug.powerKw).toFixed(0)} kW {plug.plugType}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {errorMessage ? <Text className="text-red-400 text-xs mt-3">{errorMessage}</Text> : null}

        <Pressable
          onPress={startSession}
          disabled={startDisabled}
          className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center mt-4 disabled:opacity-50"
        >
          <Text className="text-midnight font-bold text-base">{startLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
