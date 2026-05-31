import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingSockets() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy p-8 rounded-[32px] w-full max-w-sm border border-border-slate shadow-2xl items-center space-y-6">
        <View className="h-16 w-16 bg-elevated-navy rounded-full items-center justify-center border border-cyan-glow/20">
          <Text className="text-cyan-glow text-2xl font-bold">02</Text>
        </View>

        <View className="space-y-2 items-center">
          <Text className="text-white text-3xl font-bold tracking-tight text-center">
            Compatibility
          </Text>
          <Text className="text-cyan-glow font-medium text-base tracking-wider uppercase">
            CCS & Type-2
          </Text>
        </View>

        <View className="w-full bg-elevated-navy border border-border-slate rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-white font-semibold">DC Fast Charge</Text>
          <View className="bg-cyan-glow/10 px-3 py-1 rounded-full border border-cyan-glow/25">
            <Text className="text-cyan-glow text-xs font-bold">ACTIVE</Text>
          </View>
        </View>

        <Text className="text-muted text-sm text-center leading-5 px-2">
          Compare rapid sockets, select your connector specifications, and optimize charging hardware compatibility profiles automatically.
        </Text>

        <View className="w-full flex-row space-x-3 gap-x-2">
          <Pressable
            onPress={() => router.back()}
            className="flex-1 bg-elevated-navy border border-border-slate py-4 rounded-2xl items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">Back</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push("/onboarding/step3")}
            className="flex-1 bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
          >
            <Text className="text-midnight font-bold text-base">Continue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
