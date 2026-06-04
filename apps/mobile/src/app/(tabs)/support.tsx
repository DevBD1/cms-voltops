import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { ActionButton } from "@/components/ActionButton";

type StationRow = {
  stationCode: string;
  name: string;
  city: string;
  district: string;
  totalPlugs: number;
  availablePlugs: number;
};

type SessionRow = {
  id: number;
  status: string;
  startedAt?: string | null;
  plug?: {
    plugCode: string;
    plugType: string;
    powerKw: string;
    station?: {
      stationCode: string;
      name: string;
      city: string;
      district: string;
    };
  };
};

type TicketRow = {
  id: number;
  stationCode?: string | null;
  sessionId?: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
};

type ContextMode = "station" | "session";
type SelectedContext =
  | { type: "general" }
  | { type: "station"; stationCode: string }
  | { type: "session"; sessionId: number; stationCode?: string };

const priorities = ["Low", "Medium", "High"];

function formatSessionDate(value?: string | null): string {
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

function formatTicketDate(value?: string | null): string {
  return formatSessionDate(value);
}

function formatLabel(value?: string | null): string {
  if (!value) return "Not attached";
  return value;
}

export default function SupportDesk() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [contextMode, setContextMode] = useState<ContextMode>("station");
  const [selectedContext, setSelectedContext] = useState<SelectedContext>({ type: "general" });
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  async function loadSupportData() {
    try {
      const [stationRows, sessionRows, ticketRows] = await Promise.all([
        apiRequest<StationRow[]>("/api/mobile/stations"),
        apiRequest<SessionRow[]>("/api/mobile/sessions"),
        apiRequest<TicketRow[]>("/api/mobile/tickets"),
      ]);
      setStations(stationRows);
      setSessions(sessionRows);
      setTickets(ticketRows);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load support data");
    }
  }

  async function handleCreateTicket() {
    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setErrorMessage("Please describe the issue or fault first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        stationCode:
          selectedContext.type === "station"
            ? selectedContext.stationCode
            : selectedContext.type === "session"
              ? selectedContext.stationCode
              : undefined,
        sessionId: selectedContext.type === "session" ? selectedContext.sessionId : undefined,
        title: trimmedDescription.slice(0, 80) || "Support ticket",
        description: trimmedDescription,
        priority: priority.toLowerCase(),
      };

      await apiRequest<TicketRow>("/api/mobile/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDescription("");
      setSelectedContext({ type: "general" });
      await loadSupportData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    loadSupportData();
  }, []);

  const selectedContextLabel = useMemo(() => {
    if (selectedContext.type === "general") return "General issue";

    if (selectedContext.type === "station") {
      const station = stations.find((item) => item.stationCode === selectedContext.stationCode);
      return station ? station.name : "Selected station";
    }

    const session = sessions.find((item) => item.id === selectedContext.sessionId);
    const stationName = session?.plug?.station?.name;
    return stationName ? `Session #${selectedContext.sessionId} - ${stationName}` : `Session #${selectedContext.sessionId}`;
  }, [selectedContext, sessions, stations]);

  const selectedTicketStation = useMemo(() => {
    if (!selectedTicket?.stationCode) return null;
    return stations.find((item) => item.stationCode === selectedTicket.stationCode) ?? null;
  }, [selectedTicket, stations]);

  const selectedTicketSession = useMemo(() => {
    if (!selectedTicket?.sessionId) return null;
    return sessions.find((item) => item.id === selectedTicket.sessionId) ?? null;
  }, [selectedTicket, sessions]);

  const canSubmit = description.trim().length > 0 && !isSubmitting;

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

      <SafeAreaView className="flex-1 z-10 px-6 pt-4">
        <View className="mb-6">
          <Text className="text-white text-3xl font-extrabold tracking-tight uppercase" style={{ fontFamily: "Sora" }}>
            Help Center
          </Text>
          <Text className="text-muted text-xs italic mt-1" style={{ fontFamily: "Inter" }}>
            We're here to help you move forward.
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="space-y-6">
          <View className="space-y-2">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest ml-1" style={{ fontFamily: "Inter" }}>
              Active Tickets
            </Text>

            <View className="bg-slate-navy p-5 rounded-[24px] border border-border-slate space-y-3">
              {tickets.length === 0 ? (
                <Text className="text-muted text-xs text-center py-2" style={{ fontFamily: "Inter" }}>
                  No active logs found. All systems operational.
                </Text>
              ) : (
                tickets.map((ticket) => {
                  const isResolved = ticket.status === "resolved";

                  return (
                    <Pressable
                      key={ticket.id}
                      onPress={() => setSelectedTicket(ticket)}
                      className="bg-elevated-navy/40 p-4 rounded-xl flex-row justify-between items-center border border-border-slate active:scale-[0.98]"
                    >
                      <View className="space-y-1 flex-1 pr-3">
                        <Text className="text-muted text-[9px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                          Ticket #{ticket.id}
                        </Text>
                        <Text className="text-white font-bold text-sm" style={{ fontFamily: "Sora" }}>
                          {ticket.title}
                        </Text>
                      </View>
                      <View
                        className={`px-2.5 py-1 rounded-full border ${
                          isResolved ? "bg-[#39FF14]/10 border-[#39FF14]/25" : "bg-cyan-glow/10 border-cyan-glow/25"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase tracking-wider ${isResolved ? "text-[#39FF14]" : "text-cyan-glow"}`}
                          style={{ fontFamily: "Inter" }}
                        >
                          {ticket.status}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          <View className="space-y-2">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest ml-1" style={{ fontFamily: "Inter" }}>
              Report An Issue
            </Text>

            <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate space-y-4">
              <View className="space-y-2">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                  Issue Context
                </Text>

                <Pressable
                  onPress={() => setSelectedContext({ type: "general" })}
                  className={`p-4 rounded-2xl border ${selectedContext.type === "general" ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy/30"}`}
                >
                  <Text className={`text-sm font-bold ${selectedContext.type === "general" ? "text-cyan-glow" : "text-white"}`} style={{ fontFamily: "Sora" }}>
                    General issue
                  </Text>
                  <Text className="text-muted text-[10px] mt-1" style={{ fontFamily: "Inter" }}>
                    Use this when the issue is not tied to a specific charger or past session.
                  </Text>
                </Pressable>

                <View className="flex-row gap-x-2">
                  {(["station", "session"] as ContextMode[]).map((mode) => {
                    const isActive = contextMode === mode;

                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setContextMode(mode)}
                        className={`flex-1 py-3 rounded-full border items-center justify-center ${
                          isActive ? "border-cyan-glow bg-cyan-glow/5" : "border-border-slate bg-elevated-navy/40"
                        }`}
                      >
                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-cyan-glow" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                          {mode}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {contextMode === "station" ? (
                  <View className="space-y-2">
                    {stations.map((station) => {
                      const isSelected = selectedContext.type === "station" && selectedContext.stationCode === station.stationCode;

                      return (
                        <Pressable
                          key={station.stationCode}
                          onPress={() => setSelectedContext({ type: "station", stationCode: station.stationCode })}
                          className={`p-4 rounded-2xl border ${isSelected ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy/30"}`}
                        >
                          <View className="flex-row justify-between gap-x-3">
                            <View className="flex-1">
                              <Text className={`text-sm font-bold ${isSelected ? "text-cyan-glow" : "text-white"}`} style={{ fontFamily: "Sora" }}>
                                {station.name}
                              </Text>
                              <Text className="text-muted text-[10px] mt-1" style={{ fontFamily: "Inter" }}>
                                {station.district}, {station.city}
                              </Text>
                            </View>
                            <Text className="text-muted text-[10px] font-bold" style={{ fontFamily: "Inter" }}>
                              {station.availablePlugs}/{station.totalPlugs} plugs
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View className="space-y-2">
                    {sessions.length === 0 ? (
                      <View className="p-4 rounded-2xl border border-border-slate bg-elevated-navy/30">
                        <Text className="text-muted text-xs text-center" style={{ fontFamily: "Inter" }}>
                          No historical sessions yet.
                        </Text>
                      </View>
                    ) : (
                      sessions.map((session) => {
                        const isSelected = selectedContext.type === "session" && selectedContext.sessionId === session.id;
                        const station = session.plug?.station;

                        return (
                          <Pressable
                            key={session.id}
                            onPress={() => setSelectedContext({ type: "session", sessionId: session.id, stationCode: station?.stationCode })}
                            className={`p-4 rounded-2xl border ${isSelected ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy/30"}`}
                          >
                            <View className="flex-row justify-between gap-x-3">
                              <View className="flex-1">
                                <Text className={`text-sm font-bold ${isSelected ? "text-cyan-glow" : "text-white"}`} style={{ fontFamily: "Sora" }}>
                                  Session #{session.id}
                                </Text>
                                <Text className="text-muted text-[10px] mt-1" style={{ fontFamily: "Inter" }}>
                                  {station ? `${station.name} - ${station.district}` : session.plug?.plugCode ?? "Unknown charger"}
                                </Text>
                              </View>
                              <View className="items-end">
                                <Text className="text-muted text-[10px] font-bold uppercase" style={{ fontFamily: "Inter" }}>
                                  {session.status}
                                </Text>
                                <Text className="text-muted text-[10px] mt-1" style={{ fontFamily: "Inter" }}>
                                  {formatSessionDate(session.startedAt)}
                                </Text>
                              </View>
                            </View>
                            {session.plug ? (
                              <Text className="text-muted text-[10px] mt-2" style={{ fontFamily: "Inter" }}>
                                {session.plug.plugType} • {Number(session.plug.powerKw).toFixed(0)} kW
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </View>

              <View className="bg-elevated-navy/30 border border-border-slate rounded-2xl px-4 py-3">
                <Text className="text-muted text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                  Selected context
                </Text>
                <Text className="text-white text-sm font-bold mt-1" style={{ fontFamily: "Sora" }}>
                  {selectedContextLabel}
                </Text>
              </View>

              <View className="space-y-1.5">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                  Description / Fault logs
                </Text>
                <View className="bg-elevated-navy border border-border-slate rounded-2xl px-4 py-3.5 min-h-[90px]">
                  <TextInput
                    placeholder="Provide details about the issue..."
                    placeholderTextColor="#64748B"
                    className="text-white text-sm outline-none"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>

              <View className="space-y-1.5">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                  Priority Level
                </Text>
                <View className="flex-row space-x-2 gap-x-2">
                  {priorities.map((item) => {
                    const isActive = priority === item;

                    return (
                      <Pressable
                        key={item}
                        onPress={() => setPriority(item)}
                        className={`flex-1 py-3 rounded-full border items-center justify-center ${
                          isActive ? "border-cyan-glow bg-cyan-glow/5" : "border-border-slate bg-elevated-navy/40"
                        }`}
                      >
                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-cyan-glow" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {errorMessage ? (
                <Text className="text-red-400 text-xs text-center">{errorMessage}</Text>
              ) : null}

              <ActionButton
                label={description.trim() ? "Submit request" : "Describe issue first"}
                iconName="send-outline"
                onPress={handleCreateTicket}
                disabled={!canSubmit}
                loading={isSubmitting}
                variant="neutral"
              />
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>

      <Modal visible={selectedTicket !== null} transparent animationType="slide" onRequestClose={() => setSelectedTicket(null)}>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={() => setSelectedTicket(null)} />
          <View className="bg-slate-navy border border-border-slate rounded-t-[32px] px-6 pt-5 pb-8">
            {selectedTicket ? (
              <View className="space-y-4">
                <View className="flex-row items-start justify-between gap-x-4">
                  <View className="flex-1">
                    <Text className="text-muted text-[10px] uppercase font-bold tracking-widest" style={{ fontFamily: "Inter" }}>
                      Ticket #{selectedTicket.id}
                    </Text>
                    <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: "Sora" }}>
                      {selectedTicket.title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedTicket(null)}
                    className="w-10 h-10 rounded-full bg-elevated-navy border border-border-slate items-center justify-center"
                  >
                    <Text className="text-white text-lg">x</Text>
                  </Pressable>
                </View>

                <View className="flex-row gap-x-3">
                  <View className="flex-1 bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Status
                    </Text>
                    <Text className="text-cyan-glow text-sm font-bold uppercase mt-1" style={{ fontFamily: "Sora" }}>
                      {selectedTicket.status}
                    </Text>
                  </View>
                  <View className="flex-1 bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Priority
                    </Text>
                    <Text className="text-white text-sm font-bold uppercase mt-1" style={{ fontFamily: "Sora" }}>
                      {selectedTicket.priority}
                    </Text>
                  </View>
                </View>

                <View className="bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3 space-y-3">
                  <View>
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Created
                    </Text>
                    <Text className="text-white text-sm font-semibold mt-1" style={{ fontFamily: "Inter" }}>
                      {formatTicketDate(selectedTicket.createdAt)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                      Context
                    </Text>
                    <Text className="text-white text-sm font-semibold mt-1" style={{ fontFamily: "Inter" }}>
                      Station: {selectedTicketStation ? `${selectedTicketStation.name}, ${selectedTicketStation.district}` : formatLabel(selectedTicket.stationCode)}
                    </Text>
                    <Text className="text-white text-sm font-semibold mt-1" style={{ fontFamily: "Inter" }}>
                      Session:{" "}
                      {selectedTicketSession
                        ? `#${selectedTicketSession.id} - ${selectedTicketSession.plug?.plugType ?? "Unknown plug"}`
                        : selectedTicket.sessionId
                          ? `#${selectedTicket.sessionId}`
                          : "Not attached"}
                    </Text>
                  </View>
                </View>

                <View className="bg-elevated-navy/40 rounded-2xl border border-border-slate px-4 py-3">
                  <Text className="text-muted text-[9px] uppercase font-bold" style={{ fontFamily: "Inter" }}>
                    Description
                  </Text>
                  <Text className="text-white text-sm leading-6 mt-2" style={{ fontFamily: "Inter" }}>
                    {selectedTicket.description}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
