import { useState } from "react";
import { Text, View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

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
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy p-8 rounded-[32px] w-full max-w-sm border border-border-slate shadow-2xl space-y-6">
        <View className="space-y-2 items-center">
          <Text className="text-white text-3xl font-bold tracking-tight">Create Account</Text>
          <Text className="text-cyan-glow text-sm font-medium uppercase tracking-wider">Register Station Pilot</Text>
        </View>

        <View className="space-y-4">
          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Operator Alias</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4">
              <TextInput 
                placeholder="Full name"
                placeholderTextColor="#64748B"
                className="text-white text-sm"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Email Terminal</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4">
              <TextInput 
                placeholder="Email address"
                placeholderTextColor="#64748B"
                className="text-white text-sm"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Access Key</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4">
              <TextInput 
                placeholder="••••••••••••"
                placeholderTextColor="#64748B"
                className="text-white text-sm"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleSignup}
          disabled={isSubmitting}
          className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
        >
          <Text className="text-midnight font-bold text-base">{isSubmitting ? "Registering" : "Register & Launch"}</Text>
        </Pressable>

        {message ? <Text className="text-muted text-sm text-center">{message}</Text> : null}

        {canResendConfirmation ? (
          <Pressable
            onPress={handleResendConfirmation}
            disabled={isSubmitting}
            className="w-full bg-elevated-navy border border-border-slate py-3 rounded-2xl items-center justify-center"
          >
            <Text className="text-white font-semibold text-sm">
              {isSubmitting ? "Sending Confirmation" : "Resend Confirmation Email"}
            </Text>
          </Pressable>
        ) : null}

        <View className="flex-row justify-center space-x-1 gap-x-1">
          <Text className="text-muted text-sm">Registered Pilot?</Text>
          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Text className="text-cyan-glow font-bold text-sm">Login</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
