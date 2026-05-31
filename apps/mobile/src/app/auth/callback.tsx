import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type CallbackState = "loading" | "error";

function getUrlParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [left, fragment] = url.split("#");
  const query = left.includes("?") ? left.split("?")[1] : "";

  if (query) {
    new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  }

  if (fragment) {
    new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));
  }

  return params;
}

async function createSessionFromUrl(url: string): Promise<void> {
  const params = getUrlParams(url);
  const errorDescription = params.get("error_description") ?? params.get("error");

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return;
  }

  throw new Error("Confirmation link is missing auth credentials.");
}

export default function AuthCallback() {
  const router = useRouter();
  const handledUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Confirming your account");
  const linkedUrl = Linking.useURL();

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url || handledUrlRef.current === url) {
        return;
      }

      handledUrlRef.current = url;

      try {
        await createSessionFromUrl(url);
        setMessage("Loading your account");
        await apiRequest("/api/mobile/me");
        router.replace("/(tabs)/map");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to confirm account");
      }
    }

    if (linkedUrl) {
      void handleUrl(linkedUrl);
      return;
    }

    void Linking.getInitialURL().then(handleUrl);
  }, [linkedUrl, router]);

  return (
    <View className="flex-1 bg-midnight items-center justify-center p-6">
      <View className="bg-slate-navy border border-border-slate rounded-[32px] p-8 w-full max-w-sm items-center space-y-5">
        {state === "loading" ? <ActivityIndicator color="#22D3EE" /> : null}
        <Text className="text-white text-2xl font-bold text-center">
          {state === "loading" ? "Confirming Email" : "Confirmation Failed"}
        </Text>
        <Text className="text-muted text-sm text-center leading-5">{message}</Text>
        {state === "error" ? (
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center"
          >
            <Text className="text-midnight font-bold text-base">Back to Login</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
