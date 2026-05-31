import { useEffect, useState } from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ProfileData = {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  vehicles: Array<{
    plateNumber: string;
    connectorType: string;
    relationshipType: string;
    isPrimary: boolean;
  }>;
};

export default function PilotProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const data = await apiRequest<ProfileData>("/api/mobile/me");

        if (isMounted) {
          setProfile(data);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load profile");
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View className="flex-1 bg-midnight p-6 pt-16">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-white text-3xl font-bold tracking-tight">Your Garage</Text>
          <Text className="text-cyan-glow text-xs uppercase tracking-widest font-semibold mt-1">
            Pilot & Vehicle Telemetry
          </Text>
        </View>
        
        <Pressable
          onPress={handleLogout}
          className="bg-elevated-navy border border-border-slate px-4 py-2 rounded-2xl active:bg-elevated-navy/80"
        >
          <Text className="text-red-400 text-xs font-bold">LOG OUT</Text>
        </Pressable>
      </View>

      <ScrollView className="space-y-6 gap-y-4">
        <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate flex-row items-center space-x-4 gap-x-4">
          <View className="h-16 w-16 bg-elevated-navy rounded-full items-center justify-center border border-cyan-glow/20">
            <Text className="text-cyan-glow text-xl font-bold">
              {profile?.user.firstName?.[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
          <View className="space-y-1">
            <Text className="text-white font-bold text-lg">
              {profile ? `${profile.user.firstName} ${profile.user.lastName}`.trim() : "Loading profile"}
            </Text>
            <Text className="text-muted text-xs">{profile?.user.email ?? errorMessage ?? "Account data pending"}</Text>
            <Text className="text-cyan-glow text-xs font-semibold">
              {profile ? `${profile.vehicles.length} Vehicles` : "Syncing"}
            </Text>
          </View>
        </View>

        <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate space-y-4">
          <Text className="text-white font-bold text-lg">Garage Vehicles</Text>
          
          {!profile || profile.vehicles.length === 0 ? (
            <View className="bg-elevated-navy p-4 rounded-2xl border border-border-slate">
              <Text className="text-muted text-sm font-semibold">No vehicles connected.</Text>
            </View>
          ) : (
            profile.vehicles.map((vehicle) => (
              <View key={vehicle.plateNumber} className="bg-elevated-navy p-4 rounded-2xl border border-border-slate space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-muted text-xs font-semibold">PLATE</Text>
                  <Text className="text-white font-bold text-xs">{vehicle.plateNumber}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted text-xs font-semibold">CONNECTOR</Text>
                  <Text className="text-cyan-glow font-bold text-xs">{vehicle.connectorType}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
