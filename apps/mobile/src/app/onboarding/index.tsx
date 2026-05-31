import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingJourney() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy p-8 rounded-[32px] w-full max-w-sm border border-border-slate shadow-2xl items-center space-y-6">
        <View className="h-16 w-16 bg-elevated-navy rounded-full items-center justify-center border border-cyan-glow/20">
          <Text className="text-cyan-glow text-2xl font-bold">01</Text>
        </View>

        <View className="space-y-2 items-center">
          <Text className="text-white text-3xl font-bold tracking-tight text-center">
            VoltOps
          </Text>
          <Text className="text-cyan-glow font-medium text-base tracking-wider uppercase">
            Start Your Journey
          </Text>
        </View>

        <Text className="text-muted text-sm text-center leading-5 px-2">
          Experience hyper-charge telemetry and state-of-the-art charging speeds mapped directly in your cockpit dashboard.
        </Text>

        <Pressable
          onPress={() => router.push("/onboarding/step2")}
          className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
        >
          <Text className="text-midnight font-bold text-base">Next: Sockets</Text>
        </Pressable>
      </View>
    </View>
  );
}
