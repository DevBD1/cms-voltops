import { useEffect, useMemo, useState } from "react";
import { Text, View, ScrollView } from "react-native";

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

export default function StationMap() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStations() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await apiRequest<StationRow[]>("/api/mobile/stations");

        if (!isMounted) {
          return;
        }

        setStations(data ?? []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load station catalog");
        setStations([]);
      }

      setIsLoading(false);
    }

    loadStations();

    return () => {
      isMounted = false;
    };
  }, []);

  const onlineLabel = useMemo(() => {
    if (isLoading) {
      return "SYNCING";
    }

    if (errorMessage) {
      return "OFFLINE";
    }

    return "ONLINE";
  }, [errorMessage, isLoading]);

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
      <ScrollView className="space-y-3 gap-y-2 flex-grow-0 h-40">
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
            return (
              <View
                key={station.stationCode}
                className="bg-slate-navy p-4 rounded-2xl border border-border-slate flex-row justify-between items-center"
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
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
