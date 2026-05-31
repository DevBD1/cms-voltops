import { useEffect, useState } from "react";
import { Text, View, Pressable, TextInput, ScrollView } from "react-native";
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
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest<TicketRow>("/api/mobile/tickets", {
        method: "POST",
        body: JSON.stringify({
          stationCode: stationCode.trim() || undefined,
          title: description.trim().slice(0, 80) || "Support ticket",
          description,
        }),
      });
      setDescription("");
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
    <View className="flex-1 bg-midnight p-6 pt-16">
      <View className="mb-6">
        <Text className="text-white text-3xl font-bold tracking-tight">Help Desk</Text>
        <Text className="text-cyan-glow text-xs uppercase tracking-widest font-semibold mt-1">
          Support & Incident Dispatch
        </Text>
      </View>

      <ScrollView className="space-y-6 gap-y-4">
        <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate space-y-4">
          <Text className="text-white font-bold text-lg">Log Live Incident</Text>
          
          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Select Station</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4">
              <TextInput 
                placeholder={stations[0]?.stationCode ?? "Station code"}
                placeholderTextColor="#64748B"
                className="text-white text-sm"
                value={stationCode}
                onChangeText={setStationCode}
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Describe Bug / Fault</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4 min-h-[80px]">
              <TextInput 
                placeholder="Describe the issue"
                placeholderTextColor="#64748B"
                className="text-white text-sm"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <Pressable
            onPress={handleCreateTicket}
            disabled={isSubmitting}
            className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
          >
            <Text className="text-midnight font-bold text-base">{isSubmitting ? "Filing Ticket" : "File Support Ticket"}</Text>
          </Pressable>

          {errorMessage ? <Text className="text-red-400 text-sm">{errorMessage}</Text> : null}
        </View>

        <View className="space-y-3">
          <Text className="text-white font-bold text-lg">Active Tickets</Text>

          {tickets.length === 0 ? (
            <View className="bg-slate-navy p-4 rounded-2xl border border-border-slate">
              <Text className="text-muted text-sm font-semibold">No active tickets.</Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View
                key={ticket.id}
                className="bg-slate-navy p-4 rounded-2xl border border-border-slate flex-row justify-between items-center"
              >
                <View className="space-y-1 flex-1 pr-3">
                  <Text className="text-white font-bold">#{ticket.id} - {ticket.title}</Text>
                  <Text className="text-muted text-xs">{ticket.priority} priority</Text>
                </View>
                <View className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full">
                  <Text className="text-yellow-500 text-xs font-bold">{ticket.status.toUpperCase()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
