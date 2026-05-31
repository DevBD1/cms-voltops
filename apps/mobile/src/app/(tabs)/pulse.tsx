import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";

import { apiRequest } from "@/lib/api";

type SessionRow = {
  id: number;
  energyKwh: string | null;
  durationMinutes: string | null;
  totalPrice: string | null;
  status: string;
  plug?: {
    plugCode: string;
    powerKw: string;
    plugType: string;
  };
};

export default function ActiveSession() {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const sessions = await apiRequest<SessionRow[]>("/api/mobile/sessions?status=active");

        if (isMounted) {
          setSession(sessions[0] ?? null);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load active session");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View className="flex-1 bg-midnight p-6 pt-16 items-center justify-between">
      <View className="w-full">
        <Text className="text-white text-3xl font-bold tracking-tight text-center">The Pulse</Text>
        <Text className="text-cyan-glow text-xs uppercase tracking-widest font-semibold text-center mt-1">
          Active Charge Session
        </Text>
      </View>

      <View className="relative w-64 h-64 items-center justify-center">
        <View className="absolute inset-0 bg-cyan-glow/5 rounded-full scale-105 blur-2xl" />
        
        <View className="w-full h-full rounded-full border-[8px] border-border-slate items-center justify-center">
          <View className="absolute inset-0 rounded-full border-[8px] border-cyan-glow opacity-80" style={{ borderBottomColor: 'transparent', borderRightColor: 'transparent' }} />
          
          <View className="items-center space-y-1">
            <Text className="text-white text-4xl font-extrabold tracking-tighter">
              {isLoading ? "Syncing" : session ? session.status.toUpperCase() : "Idle"}
            </Text>
            <Text className="text-cyan-glow font-bold text-xs uppercase tracking-widest">
              {errorMessage ? "Connection Error" : "Charge Session"}
            </Text>
          </View>
        </View>
      </View>

      <View className="w-full space-y-4">
        <View className="flex-row gap-4">
          <View className="flex-1 bg-slate-navy p-4 rounded-2xl border border-border-slate items-center">
            <Text className="text-muted text-xs font-semibold uppercase">Power</Text>
            <Text className="text-white text-lg font-bold mt-1">
              {session?.plug ? `${Number(session.plug.powerKw).toFixed(0)} kW` : "--"}
            </Text>
          </View>
          <View className="flex-1 bg-slate-navy p-4 rounded-2xl border border-border-slate items-center">
            <Text className="text-muted text-xs font-semibold uppercase">Cost</Text>
            <Text className="text-cyan-glow text-lg font-bold mt-1">
              {session?.totalPrice ? `TRY ${Number(session.totalPrice).toFixed(2)}` : "--"}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1 bg-slate-navy p-4 rounded-2xl border border-border-slate items-center">
            <Text className="text-muted text-xs font-semibold uppercase">Duration</Text>
            <Text className="text-white text-lg font-bold mt-1">
              {session?.durationMinutes ? `${Number(session.durationMinutes).toFixed(0)} min` : "--"}
            </Text>
          </View>
          <View className="flex-1 bg-slate-navy p-4 rounded-2xl border border-border-slate items-center">
            <Text className="text-muted text-xs font-semibold uppercase">Added</Text>
            <Text className="text-white text-lg font-bold mt-1">
              {session?.energyKwh ? `${Number(session.energyKwh).toFixed(1)} kWh` : "--"}
            </Text>
          </View>
        </View>
      </View>

      <Pressable className="w-full bg-red-500/10 border border-red-500/20 active:bg-red-500/25 py-4 rounded-2xl items-center justify-center mb-4">
        <Text className="text-red-400 font-bold text-base">
          {session ? "Terminate Session" : "No Active Session"}
        </Text>
      </Pressable>
    </View>
  );
}
