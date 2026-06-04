import { useState } from "react";
import { Text, View, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [tckn, setTckn] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const [isFocusedName, setIsFocusedName] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPhone, setIsFocusedPhone] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isFocusedTckn, setIsFocusedTckn] = useState(false);

  async function handleSignup() {
    setIsSubmitting(true);
    setMessage(null);
    setCanResendConfirmation(false);

    const emailRedirectTo = getAuthRedirectUrl();
    console.log("Supabase signup redirect:", emailRedirectTo);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          tckn: tckn.trim(),
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      setMessage("If this is a new account, check your inbox. If this email is already confirmed, use Login.");
      setCanResendConfirmation(true);
      setIsSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/mobile/me");
      router.replace("/(tabs)/map");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Confirmation requested. If this account is still unconfirmed, Supabase will send an email. If it is already confirmed, use Login.");
    setCanResendConfirmation(true);
  }

  return (
    <View className="flex-1 bg-midnight relative">
      {/* Background ambient glow */}
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          left: -200,
          backgroundColor: "#2563EB",
        }}
      />

      <SafeAreaView className="flex-1 z-10 w-full max-w-md mx-auto px-6">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }} className="space-y-6">

          {/* Header titles */}
          <View className="items-center space-y-2 mb-4">
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase" style={{ fontFamily: "Sora" }}>
              Create Account
            </Text>
            <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>
              Register Station Pilot
            </Text>
          </View>

          {/* Registration Input Fields */}
          <View className="space-y-4">
            {/* Alias name */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                Operator Alias
              </Text>
              <View className={`bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${isFocusedName ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor="#64748B"
                  className="text-white text-sm outline-none"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setIsFocusedName(true)}
                  onBlur={() => setIsFocusedName(false)}
                />
              </View>
            </View>

            {/* Email Address */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                Email Address
              </Text>
              <View className={`bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${isFocusedEmail ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="pilot@voltops.io"
                  placeholderTextColor="#64748B"
                  className="text-white text-sm outline-none"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocusedEmail(true)}
                  onBlur={() => setIsFocusedEmail(false)}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                Phone Number
              </Text>
              <View className={`bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${isFocusedPhone ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#64748B"
                  className="text-white text-sm outline-none"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setIsFocusedPhone(true)}
                  onBlur={() => setIsFocusedPhone(false)}
                />
              </View>
            </View>

            {/* Password */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                Access Key
              </Text>
              <View className={`bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${isFocusedPassword ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  className="text-white text-sm outline-none"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsFocusedPassword(true)}
                  onBlur={() => setIsFocusedPassword(false)}
                />
              </View>
            </View>

            {/* Optional TCKN ID */}
            <View className="space-y-1.5">
              <View className="flex-row justify-between items-center px-1">
                <Text className="text-muted text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: "Inter" }}>
                  TCKN Verification Number
                </Text>
                <Text className="text-muted/40 text-[9px] italic" style={{ fontFamily: "Inter" }}>OPTIONAL</Text>
              </View>
              <View className={`bg-slate-navy rounded-2xl px-4 py-4 border transition-all ${isFocusedTckn ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="11-digit national ID"
                  placeholderTextColor="#64748B"
                  className="text-white text-sm outline-none"
                  keyboardType="number-pad"
                  maxLength={11}
                  value={tckn}
                  onChangeText={setTckn}
                  onFocus={() => setIsFocusedTckn(true)}
                  onBlur={() => setIsFocusedTckn(false)}
                />
              </View>
            </View>
          </View>

          {/* CTA & Actions */}
          <View className="space-y-4 pt-4">
            <Pressable
              onPress={handleSignup}
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
                <View className="flex-row items-center justify-center space-x-2 gap-x-2">
                  <Text className="text-midnight font-extrabold text-xs uppercase tracking-widest" style={{ fontFamily: "Sora" }}>
                    Register & Launch
                  </Text>
                </View>
              )}
            </Pressable>

            {message ? <Text className="text-muted text-xs text-center leading-5 px-2" style={{ fontFamily: "Inter" }}>{message}</Text> : null}

            {canResendConfirmation ? (
              <Pressable
                onPress={handleResendConfirmation}
                disabled={isSubmitting}
                className="w-full bg-elevated-navy border border-border-slate py-4 rounded-2xl items-center justify-center active:bg-elevated-navy/80"
              >
                <Text className="text-white font-semibold text-sm" style={{ fontFamily: "Inter" }}>
                  {isSubmitting ? "Sending Confirmation" : "Resend Confirmation Email"}
                </Text>
              </Pressable>
            ) : null}

            <View className="flex-row justify-center space-x-1.5 gap-x-1.5 py-2">
              <Text className="text-muted text-sm" style={{ fontFamily: "Inter" }}>Registered Pilot?</Text>
              <Pressable onPress={() => router.push("/(auth)/login")}>
                <Text className="text-cyan-glow font-bold text-sm" style={{ fontFamily: "Inter" }}>Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
