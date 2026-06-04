import { useEffect, useState } from "react";
import { Text, View, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";

type StationRow = {
  stationCode: string;
  name: string;
};

type TicketRow = {
  id: number;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
};

export default function SupportDesk() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [stationCode, setStationCode] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSupportData() {
    try {
      const [stationRows, ticketRows] = await Promise.all([
        apiRequest<StationRow[]>("/api/mobile/stations"),
        apiRequest<TicketRow[]>("/api/mobile/tickets"),
      ]);
      setStations(stationRows);
      setTickets(ticketRows);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load support data");
    }
  }

  async function handleCreateTicket() {
    if (!description.trim()) {
      setErrorMessage("Please describe the issue or fault first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest<TicketRow>("/api/mobile/tickets", {
        method: "POST",
        body: JSON.stringify({
          stationCode: stationCode.trim() || undefined,
          title: description.trim().slice(0, 80) || "Support ticket",
          description,
          priority: priority.toLowerCase(),
        }),
      });
      setDescription("");
      setStationCode("");
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

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Background ambient glows */}
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          right: -200,
          backgroundColor: "#2563EB",
        }}
      />

      <SafeAreaView className="flex-1 z-10 px-6 pt-4">
        {/* Header App Bar */}
        <View className="mb-6">
          <Text className="text-white text-3xl font-extrabold tracking-tight uppercase" style={{ fontFamily: "Sora" }}>
            Help Center
          </Text>
          <Text className="text-muted text-xs italic mt-1" style={{ fontFamily: "Inter" }}>
            We're here to help you move forward.
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="space-y-6">

          {/* Active Tickets List */}
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
                    <View key={ticket.id} className="bg-elevated-navy/40 p-4 rounded-xl flex-row justify-between items-center border border-border-slate">
                      <View className="space-y-1 flex-1 pr-3">
                        <Text className="text-muted text-[9px] uppercase font-bold tracking-wider" style={{ fontFamily: "Inter" }}>
                          Ticket #{ticket.id}
                        </Text>
                        <Text className="text-white font-bold text-sm" style={{ fontFamily: "Sora" }}>
                          {ticket.title}
                        </Text>
                      </View>
                      <View className={`px-2.5 py-1 rounded-full border ${
                        isResolved ? "bg-[#39FF14]/10 border-[#39FF14]/25" : "bg-cyan-glow/10 border-cyan-glow/25"
                      }`}>
                        <Text className={`text-[9px] font-bold uppercase tracking-wider ${
                          isResolved ? "text-[#39FF14]" : "text-cyan-glow"
                        }`} style={{ fontFamily: "Inter" }}>
                          {ticket.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Form Incident Report */}
          <View className="space-y-2">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest ml-1" style={{ fontFamily: "Inter" }}>
              Report An Issue
            </Text>

            <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate space-y-4">
              {/* Select Station Input */}
              <View className="space-y-1.5">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                  Station / Session ID
                </Text>
                <View className="bg-elevated-navy border border-border-slate rounded-2xl px-4 py-3.5">
                  <TextInput
                    placeholder={stations[0]?.stationCode ?? "E.g. VLT-7704-BETA"}
                    placeholderTextColor="#64748B"
                    className="text-white text-sm outline-none"
                    value={stationCode}
                    onChangeText={setStationCode}
                  />
                </View>
              </View>

              {/* Description Input */}
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

              {/* Priority Chips */}
              <View className="space-y-1.5">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                  Priority Level
                </Text>
                <View className="flex-row space-x-2 gap-x-2">
                  {["Low", "Medium", "High"].map((item) => {
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

              {/* Submit CTA */}
              <Pressable
                onPress={handleCreateTicket}
                disabled={isSubmitting}
                className="w-full py-4 bg-white rounded-full items-center justify-center active:scale-[0.98] transition-transform shadow-lg mt-2"
                style={{
                  shadowColor: "#FFF",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0A0E1A" size="small" />
                ) : (
                  <Text className="text-midnight font-extrabold text-xs uppercase tracking-widest" style={{ fontFamily: "Sora" }}>
                    Submit Request
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Contact Support Agent */}
          <View className="bg-slate-navy p-5 rounded-[24px] border border-border-slate flex-row items-center space-x-4 gap-x-4">
            <View className="w-12 h-12 rounded-full bg-cyan-glow/10 border border-cyan-glow/20 items-center justify-center">
              <Text className="text-cyan-glow text-lg">💬</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-sm" style={{ fontFamily: "Sora" }}>Live Chat Available</Text>
              <Text className="text-muted text-[10px] font-semibold mt-0.5" style={{ fontFamily: "Inter" }}>Avg. response time: 2 mins</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
