import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingTracking() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy p-8 rounded-[32px] w-full max-w-sm border border-border-slate shadow-2xl items-center space-y-6">
        <View className="h-16 w-16 bg-elevated-navy rounded-full items-center justify-center border border-cyan-glow/20">
          <Text className="text-cyan-glow text-2xl font-bold">03</Text>
        </View>

        <View className="space-y-2 items-center">
          <Text className="text-white text-3xl font-bold tracking-tight text-center">
            The Pulse
          </Text>
          <Text className="text-cyan-glow font-medium text-base tracking-wider uppercase">
            Live Telemetry
          </Text>
        </View>

        <View className="w-full space-y-2">
          <View className="flex-row justify-between text-xs px-1">
            <Text className="text-muted">Charging Speed</Text>
            <Text className="text-white font-bold">Live</Text>
          </View>
          <View className="w-full h-1 bg-border-slate rounded-full overflow-hidden">
            <View className="w-2/3 h-full bg-cyan-glow rounded-full" />
          </View>
        </View>

        <Text className="text-muted text-sm text-center leading-5 px-2">
          Gain deep visibility into active power spikes, voltage safety nets, and real-time charging cost tracking.
        </Text>

        <View className="w-full flex-row space-x-3 gap-x-2">
          <Pressable
            onPress={() => router.back()}
            className="flex-1 bg-elevated-navy border border-border-slate py-4 rounded-2xl items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">Back</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="flex-1 bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
          >
            <Text className="text-midnight font-bold text-base">Get Started</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
