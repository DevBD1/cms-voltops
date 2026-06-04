import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingSockets() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Ambient Radial Glow */}
      <View
        className="absolute w-[700px] h-[700px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -250,
          right: -250,
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

      <SafeAreaView className="flex-1 justify-between px-8 py-6 z-10">
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
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-muted font-medium text-xs tracking-widest uppercase">Skip</Text>
          </Pressable>
        </View>

        {/* Hero Section: Technical Charging Station Card */}
        <View className="flex-1 justify-center my-4">
          <View
            className="w-full bg-slate-navy rounded-[32px] p-8 border border-border-slate shadow-2xl relative overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
              elevation: 15,
            }}
          >
            {/* Interface Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-muted text-[10px] uppercase font-bold tracking-widest" style={{ fontFamily: "Inter" }}>
                  STATION_ID
                </Text>
                <Text className="text-white text-lg font-bold mt-0.5" style={{ fontFamily: "Sora" }}>
                  VLT-7704-BETA
                </Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-elevated-navy border border-border-slate items-center justify-center">
                <Text className="text-cyan-glow text-lg">🔌</Text>
              </View>
            </View>

            {/* Technical Grid Layout */}
            <View className="space-y-4">
              {/* Charging Point 1: Available */}
              <View className="bg-elevated-navy/40 p-4 rounded-2xl flex-row items-center justify-between border border-border-slate">
                <View className="flex-row items-center space-x-3 gap-x-3">
                  <View className="w-10 h-10 rounded-lg bg-elevated-navy items-center justify-center">
                    <Text className="text-cyan-glow text-base">⚡</Text>
                  </View>
                  <View>
                    <Text className="font-bold text-white text-sm" style={{ fontFamily: "Inter" }}>CCS Type 2</Text>
                    <Text className="text-muted text-[10px] uppercase font-semibold mt-0.5">150 kW DC</Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex-row items-center space-x-1.5 gap-x-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#39FF14]" />
                  <Text className="text-[#39FF14] text-[9px] font-bold uppercase tracking-wider">Available</Text>
                </View>
              </View>

              {/* Charging Point 2: In Use */}
              <View className="bg-elevated-navy/40 p-4 rounded-2xl flex-row items-center justify-between border border-border-slate">
                <View className="flex-row items-center space-x-3 gap-x-3">
                  <View className="w-10 h-10 rounded-lg bg-elevated-navy items-center justify-center">
                    <Text className="text-cyan-glow text-base">🔌</Text>
                  </View>
                  <View>
                    <Text className="font-bold text-white text-sm" style={{ fontFamily: "Inter" }}>AC Type 2</Text>
                    <Text className="text-muted text-[10px] uppercase font-semibold mt-0.5">22 kW AC</Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-full bg-cyan-glow/10 border border-cyan-glow/20 flex-row items-center space-x-1.5 gap-x-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-cyan-glow" />
                  <Text className="text-cyan-glow text-[9px] font-bold uppercase tracking-wider">In Use</Text>
                </View>
              </View>
            </View>

            {/* Card Footer Detail */}
            <View className="mt-6 pt-5 border-t border-white/[0.05] flex-row items-center justify-between">
              <View>
                <Text className="text-muted text-[9px] uppercase font-bold tracking-widest">Peak Performance</Text>
                <Text className="text-white font-medium text-xs mt-0.5">Ultra-Flow Mode Active</Text>
              </View>
              <Text className="text-cyan-glow/30 text-2xl font-bold">🔘</Text>
            </View>
          </View>
        </View>

        {/* Onboarding Text Content */}
        <View className="space-y-4 mb-6">
          <View className="space-y-2 text-center">
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase leading-none" style={{ fontFamily: "Sora" }}>
              Smart Charging,{"\n"}
              <Text className="text-cyan-glow">Simplified.</Text>
            </Text>
            <Text className="text-muted text-sm leading-relaxed" style={{ fontFamily: "Inter" }}>
              Experience seamless power delivery. Our high-power network automatically matches your vehicle’s peak charging rate for maximum efficiency.
            </Text>
          </View>

          {/* Progress Indicators */}
          <View className="flex-row space-x-2 py-4 justify-center">
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
            <View className="h-1.5 w-8 rounded-full bg-cyan-glow" />
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
          </View>
        </View>

        {/* Action Button */}
        <View className="w-full pb-4">
          <Pressable onPress={() => router.push("/onboarding/step3")} className="active:scale-[0.98] transition-transform">
            <LinearGradient
              colors={["#2563EB", "#00E5FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-full py-5 rounded-full items-center justify-center shadow-lg"
              style={{
                shadowColor: "#00E5FF",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 15,
                elevation: 8,
              }}
            >
              <Text className="text-white font-bold text-base tracking-widest uppercase">Next</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
