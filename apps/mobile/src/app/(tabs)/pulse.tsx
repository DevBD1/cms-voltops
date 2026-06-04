import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { ActionButton } from "@/components/ActionButton";

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
  live?: {
    elapsedSeconds: number;
    estimatedEnergyKwh: number;
    estimatedPrice: number;
    batteryPercent: number;
    chargeSpeedKw: number;
    currency: string;
  };
};

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export default function ActiveSession() {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminating, setIsTerminating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function terminateSession() {
    if (!session) return;

    setIsTerminating(true);

    try {
      await apiRequest(`/api/mobile/sessions/${session.id}/end`, {
        method: "POST",
        body: JSON.stringify({ energyKwh: Math.max(session.live?.estimatedEnergyKwh ?? (Number(session.energyKwh) || 0), 0.1) }),
      });
      setSession(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to terminate session");
    } finally {
      setIsTerminating(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSession(showLoading = false) {
        if (showLoading) {
          setIsLoading(true);
        }

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

      loadSession(true);
      const intervalId = setInterval(loadSession, 5000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, []),
  );

  const batteryPercent = session?.live?.batteryPercent;
  const energyKwh = session?.live?.estimatedEnergyKwh ?? (session?.energyKwh ? Number(session.energyKwh) : 0);
  const elapsedSeconds = session?.live?.elapsedSeconds ?? (session?.durationMinutes ? Number(session.durationMinutes) * 60 : 0);
  const runningCost = session?.live?.estimatedPrice ?? (session?.totalPrice ? Number(session.totalPrice) : 0);
  const currency = session?.live?.currency ?? "TRY";
  const chargeSpeedKw = session?.live?.chargeSpeedKw ?? (session?.plug ? Number(session.plug.powerKw) : 0);

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Ambient background glows */}
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          right: -200,
          backgroundColor: "#2563EB",
        }}
      />
      <View
        className="absolute w-[600px] h-[600px] rounded-full opacity-5 blur-[100px]"
        style={{
          bottom: -200,
          left: -200,
          backgroundColor: "#00E5FF",
        }}
      />

      <SafeAreaView className="flex-1 justify-between px-6 py-6 z-10">
        {/* Header App Bar */}
        <View className="flex-row justify-between items-center w-full py-4">
          <View className="flex-row items-center space-x-2">
            <View className="bg-cyan-glow/10 p-2 rounded-xl border border-cyan-glow/20">
              <Text className="text-cyan-glow font-bold text-lg">⚡</Text>
            </View>
            <Text className="text-white font-semibold text-2xl tracking-tight" style={{ fontFamily: "Sora" }}>
              VoltOps
            </Text>
          </View>
          <View className="bg-slate-navy/90 border border-border-slate px-4 py-2 rounded-2xl">
            <Text className="text-white text-xs font-bold" style={{ fontFamily: "Sora" }}>THE PULSE</Text>
          </View>
        </View>

        {/* Central Charging Ring */}
        <View className="flex-1 justify-center items-center">
          <View className="relative w-64 h-64 items-center justify-center">
            {/* Ambient Cyan Aura */}
            <View className="absolute inset-0 bg-cyan-glow/5 rounded-full scale-110 blur-2xl" />

            {/* Outer static ring */}
            <View className="w-full h-full rounded-full border-[12px] border-slate-navy items-center justify-center relative">

              {/* Spinning progress indicators mock */}
              <View
                className="absolute inset-0 rounded-full border-[12px] border-cyan-glow opacity-80"
                style={{
                  borderBottomColor: "transparent",
                  borderRightColor: "transparent",
                }}
              />

              <View className="items-center">
                <Text className="text-white text-6xl font-extrabold tracking-tighter" style={{ fontFamily: "Sora" }}>
                  {session && batteryPercent !== undefined ? `${batteryPercent.toFixed(0)}%` : "Idle"}
                </Text>

                <View className="flex-row items-center space-x-1.5 gap-x-1.5 mt-2 bg-elevated-navy/80 px-3 py-1 rounded-full border border-border-slate">
                  <View
                    className={`w-1.5 h-1.5 rounded-full ${session ? "bg-neon-green" : "bg-muted"}`}
                    style={session ? { shadowColor: "#39FF14", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 } : {}}
                  />
                  <Text className={`text-[9px] font-bold uppercase tracking-wider ${session ? "text-neon-green" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                    {session ? "CHARGING ACTIVE" : "DISCONNECTED"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Metrics Grid */}
        <View className="space-y-4 mb-6">
          <View className="flex-row gap-x-4">
            {/* Card 1 */}
            <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
              <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                Energy Charged
              </Text>
              <Text className="text-neon-green text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                {`${energyKwh.toFixed(1)} kWh`}
              </Text>
            </View>
            {/* Card 2 */}
            <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
              <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                Charge Speed
              </Text>
              <Text className="text-cyan-glow text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                {`${chargeSpeedKw.toFixed(0)} kW`}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-x-4">
            {/* Card 3 */}
            <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
              <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                Session Duration
              </Text>
              <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                {formatElapsedTime(elapsedSeconds)}
              </Text>
            </View>
            {/* Card 4 */}
            <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
              <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                Running Cost
              </Text>
              <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                {`${runningCost.toFixed(2)} ${currency}`}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <Text className="text-red-400 text-xs text-center mb-4">{errorMessage}</Text>
        ) : null}

        <View className="w-full pb-4">
          <ActionButton
            label={session ? "Stop charging" : isLoading ? "Checking session" : "No active session"}
            iconName={session ? "stop-circle-outline" : "battery-dead-outline"}
            onPress={terminateSession}
            disabled={!session || isTerminating}
            loading={isTerminating}
            variant={session ? "danger" : "neutral"}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
