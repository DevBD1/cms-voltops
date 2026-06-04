import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isFocusedConfirm, setIsFocusedConfirm] = useState(false);

  async function handleUpdatePassword() {
    setMessage(null);
    setIsSuccess(false);

    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/mobile/me");
      setIsSuccess(true);
      setMessage("Password updated.");
      router.replace("/(tabs)/map");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-midnight relative justify-center">
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          bottom: -220,
          right: -220,
          backgroundColor: "#2563EB",
        }}
      />

      <SafeAreaView className="px-8 py-6 z-10 w-full max-w-md mx-auto space-y-8">
        <View className="items-center space-y-2">
          <Text className="text-white text-3xl font-extrabold tracking-tight uppercase text-center" style={{ fontFamily: "Sora" }}>
            Reset Password
          </Text>
          <Text className="text-muted text-sm text-center" style={{ fontFamily: "Inter" }}>
            Choose a new access key.
          </Text>
        </View>

        <View className="space-y-4">
          <View className="space-y-1.5">
            <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
              New Password
            </Text>
            <View
              className={`flex-row items-center bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${
                isFocusedPassword ? "border-cyan-glow" : "border-border-slate"
              }`}
            >
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm outline-none"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsFocusedPassword(true)}
                onBlur={() => setIsFocusedPassword(false)}
              />
            </View>
          </View>

          <View className="space-y-1.5">
            <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
              Confirm Password
            </Text>
            <View
              className={`flex-row items-center bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${
                isFocusedConfirm ? "border-cyan-glow" : "border-border-slate"
              }`}
            >
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm outline-none"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setIsFocusedConfirm(true)}
                onBlur={() => setIsFocusedConfirm(false)}
              />
            </View>
          </View>
        </View>

        <View className="space-y-3 pt-2">
          <Pressable
            onPress={handleUpdatePassword}
            disabled={isSubmitting}
            className="w-full py-5 bg-white rounded-full items-center justify-center active:scale-[0.98] transition-transform shadow-lg"
            style={{
              shadowColor: "#FFF",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0A0E1A" size="small" />
            ) : (
              <Text className="text-midnight font-extrabold text-xs uppercase tracking-widest" style={{ fontFamily: "Sora" }}>
                Update Password
              </Text>
            )}
          </Pressable>

          {message ? (
            <Text className={`${isSuccess ? "text-cyan-glow" : "text-red-400"} text-xs text-center`} style={{ fontFamily: "Inter" }}>
              {message}
            </Text>
          ) : null}

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            className="w-full py-5 bg-transparent border border-cyan-glow rounded-full items-center justify-center active:bg-cyan-glow/5"
          >
            <Text className="text-cyan-glow font-bold text-xs uppercase tracking-widest" style={{ fontFamily: "Sora" }}>
              Back to Login
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
