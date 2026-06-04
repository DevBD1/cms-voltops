import { useState } from "react";
import { Text, View, Pressable, TextInput, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  async function handleLogin() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/mobile/me");
      router.replace("/(tabs)/map");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Enter your email address first.");
      setSuccessMessage(null);
      return;
    }

    setIsResettingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const redirectTo = getAuthRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    setIsResettingPassword(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password reset email sent. Check your inbox and spam folder.");
  }

  return (
    <View className="flex-1 bg-midnight relative justify-center">
      {/* Subtle Ambient Radial Glow */}
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          right: -200,
          backgroundColor: "#2563EB",
        }}
      />

      <SafeAreaView className="px-8 py-6 z-10 w-full max-w-md mx-auto space-y-8">
        {/* Brand Header */}
        <View className="items-center space-y-4">
          <View className="w-24 h-24 rounded-full items-center justify-center bg-slate-navy border border-cyan-glow/10" style={{ shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 }}>
            <Image
              source={require("../../../assets/icon.png")}
              className="w-16 h-16"
              resizeMode="contain"
            />
          </View>
          <View className="space-y-1 items-center">
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase" style={{ fontFamily: "Sora" }}>
              Welcome Back
            </Text>
            <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>
              Energize your journey with VoltOps.
            </Text>
          </View>
        </View>

        {/* Input Fields */}
        <View className="space-y-4">
          {/* Email field */}
          <View className="space-y-1.5">
            <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
              Email Address
            </Text>
            <View
              className={`flex-row items-center bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${
                isFocusedEmail ? "border-cyan-glow" : "border-border-slate"
              }`}
            >
              <Text className="text-muted mr-3 text-lg">✉️</Text>
              <TextInput
                placeholder="driver@voltops.io"
                placeholderTextColor="#64748B"
                className="flex-1 text-white text-sm outline-none"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocusedEmail(true)}
                onBlur={() => setIsFocusedEmail(false)}
              />
            </View>
          </View>

          {/* Password field */}
          <View className="space-y-1.5">
            <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
              Password
            </Text>
            <View
              className={`flex-row items-center bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${
                isFocusedPassword ? "border-cyan-glow" : "border-border-slate"
              }`}
            >
              <Text className="text-muted mr-3 text-lg">🔒</Text>
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

          {/* Forgot password */}
          <View className="flex-row justify-end py-1">
            <Pressable onPress={handlePasswordReset} disabled={isSubmitting || isResettingPassword}>
              <Text className="text-cyan-glow text-xs font-semibold" style={{ fontFamily: "Inter" }}>
                {isResettingPassword ? "SENDING RESET..." : "FORGOT PASSWORD?"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3 pt-2">
          <Pressable
            onPress={handleLogin}
            disabled={isSubmitting || isResettingPassword}
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
                Sign In
              </Text>
            )}
          </Pressable>

          {errorMessage ? <Text className="text-red-400 text-xs text-center" style={{ fontFamily: "Inter" }}>{errorMessage}</Text> : null}
          {successMessage ? <Text className="text-cyan-glow text-xs text-center" style={{ fontFamily: "Inter" }}>{successMessage}</Text> : null}

          <View className="h-2" />

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            className="w-full py-5 bg-transparent border border-cyan-glow rounded-full items-center justify-center active:bg-cyan-glow/5"
          >
            <Text className="text-cyan-glow font-bold text-xs uppercase tracking-widest" style={{ fontFamily: "Sora" }}>
              Create an Account
            </Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}
