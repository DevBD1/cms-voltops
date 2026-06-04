import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { ActionButton } from "@/components/ActionButton";

type ReceiptRow = {
  receiptNo: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  issuedAt: string;
};

type SessionRow = {
  id: number;
  startedAt?: string | null;
  endedAt?: string | null;
  energyKwh: string | null;
  durationMinutes: string | null;
  totalPrice: string | null;
  status: string;
  plug?: {
    plugCode: string;
    powerKw: string;
    plugType: string;
    station?: {
      stationCode: string;
      name: string;
      city: string;
      district: string;
    };
  };
  receipt?: ReceiptRow | null;
  live?: {
    elapsedSeconds: number;
    estimatedEnergyKwh: number;
    estimatedPrice: number;
    batteryPercent: number;
    chargeSpeedKw: number;
    currency: string;
  };
};

type PulseMode = "current" | "history";

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatDuration(value?: string | null): string {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "Unknown";
  }

  return `${Math.round(minutes)} min`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: string | null, currency = "TRY"): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `0.00 ${currency}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

function formatEnergy(value?: string | null): string {
  const energy = Number(value);

  if (!Number.isFinite(energy)) {
    return "0.0 kWh";
  }

  return `${energy.toFixed(1)} kWh`;
}

export default function ActiveSession() {
  const [mode, setMode] = useState<PulseMode>("current");
  const [session, setSession] = useState<SessionRow | null>(null);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [selectedReceiptSession, setSelectedReceiptSession] = useState<SessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadActiveSession(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const sessions = await apiRequest<SessionRow[]>("/api/mobile/sessions?status=active");
      setSession(sessions[0] ?? null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load active session");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHistory(showLoading = false) {
    if (showLoading) {
      setIsHistoryLoading(true);
    }

    try {
      const sessions = await apiRequest<SessionRow[]>("/api/mobile/sessions?status=completed");
      setHistory(sessions);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load session history");
    } finally {
      setIsHistoryLoading(false);
    }
  }

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
      await loadHistory();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to terminate session");
    } finally {
      setIsTerminating(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadFocusedData(showLoading = false) {
        if (!isMounted) return;
        await loadActiveSession(showLoading);

        if (mode === "history" && isMounted) {
          await loadHistory(showLoading);
        }
      }

      loadFocusedData(true);
      const intervalId = setInterval(() => {
        if (isMounted) {
          loadActiveSession();
        }
      }, 5000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, [mode]),
  );

  useEffect(() => {
    if (mode === "history") {
      loadHistory(true);
    }
  }, [mode]);

  const batteryPercent = session?.live?.batteryPercent;
  const energyKwh = session?.live?.estimatedEnergyKwh ?? (session?.energyKwh ? Number(session.energyKwh) : 0);
  const elapsedSeconds = session?.live?.elapsedSeconds ?? (session?.durationMinutes ? Number(session.durationMinutes) * 60 : 0);
  const runningCost = session?.live?.estimatedPrice ?? (session?.totalPrice ? Number(session.totalPrice) : 0);
  const currency = session?.live?.currency ?? "TRY";
  const chargeSpeedKw = session?.live?.chargeSpeedKw ?? (session?.plug ? Number(session.plug.powerKw) : 0);
  const selectedReceipt = selectedReceiptSession?.receipt;

  return (
    <View className="flex-1 bg-midnight relative">
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

      <SafeAreaView className="flex-1 px-6 py-6 z-10">
        <View className="flex-row justify-between items-center w-full py-4">
          <View className="flex-row items-center space-x-2">
            <View className="bg-cyan-glow/10 p-2 rounded-xl border border-cyan-glow/20">
              <Text className="text-cyan-glow font-bold text-lg">EV</Text>
            </View>
            <Text className="text-white font-semibold text-2xl tracking-tight" style={{ fontFamily: "Sora" }}>
              VoltOps
            </Text>
          </View>
          <View className="bg-slate-navy/90 border border-border-slate px-4 py-2 rounded-2xl">
            <Text className="text-white text-xs font-bold" style={{ fontFamily: "Sora" }}>
              THE PULSE
            </Text>
          </View>
        </View>

        <View className="flex-row gap-x-2 bg-slate-navy border border-border-slate rounded-full p-1 mb-4">
          {(["current", "history"] as PulseMode[]).map((item) => {
            const isActive = mode === item;

            return (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                className={`flex-1 py-3 rounded-full items-center justify-center ${isActive ? "bg-cyan-glow/10 border border-cyan-glow" : "border border-transparent"}`}
              >
                <Text className={`text-[11px] font-bold uppercase ${isActive ? "text-cyan-glow" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "current" ? (
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center items-center">
              <View className="relative w-64 h-64 items-center justify-center">
                <View className="absolute inset-0 bg-cyan-glow/5 rounded-full scale-110 blur-2xl" />

                <View className="w-full h-full rounded-full border-[12px] border-slate-navy items-center justify-center relative">
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
                        style={
                          session
                            ? { shadowColor: "#39FF14", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }
                            : {}
                        }
                      />
                      <Text className={`text-[9px] font-bold uppercase tracking-wider ${session ? "text-neon-green" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                        {session ? "CHARGING ACTIVE" : "DISCONNECTED"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="space-y-4 mb-6">
              <View className="flex-row gap-x-4">
                <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
                  <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                    Energy Charged
                  </Text>
                  <Text className="text-neon-green text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                    {`${energyKwh.toFixed(1)} kWh`}
                  </Text>
                </View>
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
                <View className="flex-1 bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-col">
                  <Text className="text-muted text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                    Session Duration
                  </Text>
                  <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                    {formatElapsedTime(elapsedSeconds)}
                  </Text>
                </View>
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

            {errorMessage ? <Text className="text-red-400 text-xs text-center mb-4">{errorMessage}</Text> : null}

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
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="flex-1">
            <View className="space-y-3">
              {errorMessage ? <Text className="text-red-400 text-xs text-center mb-2">{errorMessage}</Text> : null}

              {isHistoryLoading ? (
                <View className="bg-slate-navy p-6 rounded-[24px] border border-border-slate">
                  <Text className="text-muted text-xs text-center" style={{ fontFamily: "Inter" }}>
                    Loading session history...
                  </Text>
                </View>
              ) : history.length === 0 ? (
                <View className="bg-slate-navy p-6 rounded-[24px] border border-border-slate">
                  <Text className="text-white text-base font-bold text-center" style={{ fontFamily: "Sora" }}>
                    No completed sessions yet
                  </Text>
                  <Text className="text-muted text-xs text-center mt-2" style={{ fontFamily: "Inter" }}>
                    Completed charge sessions and receipts will appear here.
                  </Text>
                </View>
              ) : (
                history.map((item) => {
                  const station = item.plug?.station;
                  const receiptCurrency = item.receipt?.currency ?? "TRY";

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedReceiptSession(item)}
                      className="bg-slate-navy p-5 rounded-[24px] border border-border-slate active:scale-[0.98]"
                    >
                      <View className="flex-row justify-between gap-x-4">
                        <View className="flex-1">
                          <Text className="text-white text-lg font-bold" style={{ fontFamily: "Sora" }}>
                            Session #{item.id}
                          </Text>
                          <Text className="text-muted text-xs mt-1" style={{ fontFamily: "Inter" }}>
                            {station ? `${station.name} - ${station.district}` : item.plug?.plugCode ?? "Unknown charger"}
                          </Text>
                          <Text className="text-muted text-xs mt-2" style={{ fontFamily: "Inter" }}>
                            {item.plug ? `${item.plug.plugType} • ${Number(item.plug.powerKw).toFixed(0)} kW` : "Unknown plug"}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-cyan-glow text-[10px] font-bold uppercase" style={{ fontFamily: "Inter" }}>
                            Receipt
                          </Text>
                          <Text className="text-muted text-xs mt-2" style={{ fontFamily: "Inter" }}>
                            {formatDate(item.startedAt)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row gap-x-3 mt-4">
                        <View className="flex-1 bg-elevated-navy/40 rounded-2xl px-3 py-2 border border-border-slate">
                          <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                            Energy
                          </Text>
                          <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                            {formatEnergy(item.energyKwh)}
                          </Text>
                        </View>
                        <View className="flex-1 bg-elevated-navy/40 rounded-2xl px-3 py-2 border border-border-slate">
                          <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                            Duration
                          </Text>
                          <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                            {formatDuration(item.durationMinutes)}
                          </Text>
                        </View>
                        <View className="flex-1 bg-elevated-navy/40 rounded-2xl px-3 py-2 border border-border-slate">
                          <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                            Total
                          </Text>
                          <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                            {formatMoney(item.totalPrice, receiptCurrency)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={selectedReceiptSession !== null} transparent animationType="slide" onRequestClose={() => setSelectedReceiptSession(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={() => setSelectedReceiptSession(null)} />
          <View className="bg-slate-navy border border-border-slate rounded-t-[32px] px-6 pt-5 pb-8">
            {selectedReceiptSession ? (
              <View className="space-y-4">
                <View className="flex-row items-start justify-between gap-x-4">
                  <View className="flex-1">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest" style={{ fontFamily: "Inter" }}>
                      Receipt
                    </Text>
                    <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                      {selectedReceipt?.receiptNo ?? `Session #${selectedReceiptSession.id}`}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedReceiptSession(null)}
                    className="w-10 h-10 rounded-full bg-elevated-navy border border-border-slate items-center justify-center"
                  >
                    <Text className="text-white text-lg">x</Text>
                  </Pressable>
                </View>

                <View className="bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                  <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                    Session
                  </Text>
                  <Text className="text-white text-sm font-semibold mt-1" style={{ fontFamily: "Inter" }}>
                    #{selectedReceiptSession.id} • {formatDate(selectedReceiptSession.startedAt)}
                  </Text>
                  <Text className="text-muted text-sm mt-1" style={{ fontFamily: "Inter" }}>
                    {selectedReceiptSession.plug?.station
                      ? `${selectedReceiptSession.plug.station.name}, ${selectedReceiptSession.plug.station.district}`
                      : selectedReceiptSession.plug?.plugCode ?? "Unknown charger"}
                  </Text>
                </View>

                <View className="flex-row gap-x-3">
                  <View className="flex-1 bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Energy
                    </Text>
                    <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                      {formatEnergy(selectedReceiptSession.energyKwh)}
                    </Text>
                  </View>
                  <View className="flex-1 bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Duration
                    </Text>
                    <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                      {formatDuration(selectedReceiptSession.durationMinutes)}
                    </Text>
                  </View>
                </View>

                <View className="bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3 space-y-3">
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>
                      Subtotal
                    </Text>
                    <Text className="text-white text-sm font-semibold" style={{ fontFamily: "Inter" }}>
                      {formatMoney(selectedReceipt?.subtotal ?? selectedReceiptSession.totalPrice, selectedReceipt?.currency ?? "TRY")}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>
                      Tax
                    </Text>
                    <Text className="text-white text-sm font-semibold" style={{ fontFamily: "Inter" }}>
                      {formatMoney(selectedReceipt?.taxAmount, selectedReceipt?.currency ?? "TRY")}
                    </Text>
                  </View>
                  <View className="h-px bg-border-slate" />
                  <View className="flex-row justify-between">
                    <Text className="text-white text-base font-bold" style={{ fontFamily: "Sora" }}>
                      Total
                    </Text>
                    <Text className="text-cyan-glow text-base font-bold" style={{ fontFamily: "Sora" }}>
                      {formatMoney(selectedReceipt?.totalAmount ?? selectedReceiptSession.totalPrice, selectedReceipt?.currency ?? "TRY")}
                    </Text>
                  </View>
                </View>

                <Text className="text-muted text-[10px] text-center" style={{ fontFamily: "Inter" }}>
                  Issued {formatDate(selectedReceipt?.issuedAt)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
