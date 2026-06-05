import { Text, View, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingTracking() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight relative overflow-hidden">
      {/* Background city overlay at the bottom */}
      <View className="absolute bottom-0 left-0 right-0 h-[30%] opacity-15 pointer-events-none">
        <Image
          source={{
            uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-YvqjgOzZSuWtW-eCIIPKeHjO3pJZO3TeIuB292xfYK8FB4qJU4LJUB_z-0BEnxfrX89M5Thabn7mgBYqF1A4XIvdkZtM7Z3gLgpPYwTAu3Wyf1iFY8f3WKUHwiwIntjZ4wl-iN2gzDwhQpMBi5gN8JFv1ryHJNmiByJjLeIqu4y-bawgSOiNBT8SFVMsv9oAUX29s8AwFh7Fdk-jS9s_wGimv4BjLoUOD_DcT0xGiCNnNF6Ft0D5JuTPFupbC7R8TcJOLZRf9w",
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* Ambient glows */}
      <View
        className="absolute w-[600px] h-[600px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          left: -200,
          backgroundColor: "#2563EB",
        }}
      />
      <View
        className="absolute w-[500px] h-[500px] rounded-full opacity-5 blur-[100px]"
        style={{
          bottom: "10%",
          right: -150,
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

        {/* Floating Transaction / Receipt Card */}
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
            {/* Session Receipt Module */}
            <View className="space-y-4">
              <View className="flex-row justify-between items-end mb-4">
                <View>
                  <Text className="text-muted text-[10px] uppercase font-bold tracking-widest" style={{ fontFamily: "Inter" }}>
                    Session Receipt
                  </Text>
                  <Text className="text-white text-lg font-bold mt-0.5" style={{ fontFamily: "Sora" }}>
                    VoltOps Charger #12
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-xl bg-elevated-navy border border-border-slate items-center justify-center">
                  <Text className="text-cyan-glow text-lg">⚡</Text>
                </View>
              </View>

              {/* Delivered stats */}
              <View className="bg-elevated-navy/40 rounded-2xl p-4 border border-border-slate space-y-3">
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>Energy Delivered</Text>
                  <Text className="text-white font-bold text-sm" style={{ fontFamily: "Sora" }}>32.4 kWh</Text>
                </View>
                <View className="flex-row justify-between items-center py-1 border-t border-white/[0.05] pt-2">
                  <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>Total Cost</Text>
                  <Text className="text-cyan-glow font-bold text-sm" style={{ fontFamily: "Sora" }}>$14.50</Text>
                </View>
              </View>
            </View>

            {/* Assistance Ticket Module */}
            <View className="flex-row items-center justify-between bg-elevated-navy/50 rounded-full px-4 py-3.5 border border-border-slate mt-6">
              <View className="flex-row items-center space-x-2 gap-x-2">
                <View className="w-2 h-2 rounded-full bg-neon-green" style={{ shadowColor: "#39FF14", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5, elevation: 4 }} />
                <Text className="text-white text-xs font-semibold" style={{ fontFamily: "Inter" }}>Support Ticket #8842</Text>
              </View>
              <Text className="text-neon-green text-[9px] font-bold uppercase tracking-wider">Resolved</Text>
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View className="space-y-4 mb-6">
          <View className="space-y-2 text-center">
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase leading-none" style={{ fontFamily: "Sora" }}>
              Seamless{"\n"}
              <Text className="text-cyan-glow">Tracking.</Text>
            </Text>
            <Text className="text-muted text-sm leading-relaxed" style={{ fontFamily: "Inter" }}>
              Real-time billing and 24/7 support at your fingertips. Experience full transparency on every charge.
            </Text>
          </View>

          {/* Progress Indicators */}
          <View className="flex-row space-x-2 py-4 justify-center">
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
            <View className="h-1.5 w-8 rounded-full bg-cyan-glow" />
          </View>
        </View>

        {/* Action Button Let's Roll */}
        <View className="w-full pb-4">
          <Pressable onPress={() => router.replace("/(auth)/login")} className="active:scale-[0.98] transition-transform">
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
              <Text className="text-white font-bold text-base tracking-widest uppercase" style={{ fontFamily: "Sora" }}>
                Let's Roll
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
