import { Text, View, Pressable, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function OnboardingJourney() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Ambient Blue Glow Overlays */}
      <View
        className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[100px]"
        style={{
          top: -200,
          right: -200,
          backgroundColor: "#2563EB",
        }}
      />
      <View
        className="absolute w-[500px] h-[500px] rounded-full opacity-5 blur-[80px]"
        style={{
          bottom: -150,
          left: -150,
          backgroundColor: "#00E5FF",
        }}
      />

      <SafeAreaView className="flex-1 justify-between px-8 py-6 z-10">
        {/* Top Header App Bar Anchor */}
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

        {/* Illustration Section */}
        <View className="flex-1 justify-center items-center my-6">
          <View
            className="w-full max-w-[320px] aspect-[0.7] rounded-[32px] overflow-hidden border border-border-slate shadow-2xl"
            style={{
              shadowColor: "#00E5FF",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Image
              source={{
                uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-Y6t37j7GTrmdoyc5yEw6qSZDQb9bJCdMQa9JmcTKg3kctYBFsuABxTLte0G9tYWmram8h5Sl5BaYXU1f5XxIe7PXcsS4ZL949OS0vfKPCAcQTnyjhnIkiNMPt_00kqCMdv_KdCilBA-ErYHPqMjB4oyRrzmxf73MivbtP7xyIVXx4Xjtm83y-BuZCc-irB0qriPbcoBh9WukUrUVQGAGLooYTHIJQbWKr4U8TpoRIWsS6cczoaiSud-lapD1enph1U8akvz06A",
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Content Area */}
        <View className="space-y-4 mb-6">
          <View className="space-y-2">
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase leading-none" style={{ fontFamily: "Sora" }}>
              Charge Without{"\n"}
              <Text className="text-cyan-glow">Boundaries</Text>
            </Text>
            <Text className="text-muted text-sm leading-relaxed max-w-[90%]" style={{ fontFamily: "Inter" }}>
              Experience the next generation of electric travel. Access a premium network of ultra-fast charging stations designed to keep you moving without compromise.
            </Text>
          </View>

          {/* Progress Indicators */}
          <View className="flex-row space-x-2 py-4">
            <View className="h-1.5 w-8 rounded-full bg-cyan-glow" />
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
            <View className="h-1.5 w-2 rounded-full bg-slate-navy" />
          </View>
        </View>

        {/* Action Button */}
        <View className="w-full pb-4">
          <Pressable onPress={() => router.push("/onboarding/step2")} className="active:scale-[0.98] transition-transform">
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
