import { useState } from "react";
import { Text, View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setIsSubmitting(true);
    setErrorMessage(null);

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

  return (
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy p-8 rounded-[32px] w-full max-w-sm border border-border-slate shadow-2xl space-y-6">
        <View className="space-y-2 items-center">
          <Text className="text-white text-3xl font-bold tracking-tight">Welcome Back</Text>
          <Text className="text-cyan-glow text-sm font-medium uppercase tracking-wider">Cockpit Authentication</Text>
        </View>

        <View className="space-y-4">
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
          onPress={handleLogin}
          disabled={isSubmitting}
          className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan-glow/20"
        >
          <Text className="text-midnight font-bold text-base">{isSubmitting ? "Signing In" : "Initialize Cockpit"}</Text>
        </Pressable>

        {errorMessage ? <Text className="text-red-400 text-sm text-center">{errorMessage}</Text> : null}

        <View className="flex-row justify-center space-x-1 gap-x-1">
          <Text className="text-muted text-sm">New Operator?</Text>
          <Pressable onPress={() => router.push("/(auth)/signup")}>
            <Text className="text-cyan-glow font-bold text-sm">Register</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
