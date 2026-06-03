import { useEffect, useState } from "react";
import { Text, View, Pressable, ScrollView, TextInput } from "react-native";
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

type ConnectorType = "CCS" | "Type-2" | "CHAdeMO";

const connectorTypes: ConnectorType[] = ["CCS", "Type-2", "CHAdeMO"];

export default function PilotProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [connectorType, setConnectorType] = useState<ConnectorType>("CCS");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingPlate, setRemovingPlate] = useState<string | null>(null);

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

  async function handleAddVehicle() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const data = await apiRequest<ProfileData>("/api/mobile/vehicles", {
        method: "POST",
        body: JSON.stringify({ plateNumber, connectorType }),
      });

      setProfile(data);
      setPlateNumber("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add vehicle");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveVehicle(vehiclePlateNumber: string) {
    setRemovingPlate(vehiclePlateNumber);
    setErrorMessage(null);

    try {
      const data = await apiRequest<ProfileData>(`/api/mobile/vehicles/${encodeURIComponent(vehiclePlateNumber)}`, {
        method: "DELETE",
      });

      setProfile(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to remove vehicle");
    } finally {
      setRemovingPlate(null);
    }
  }

  const canSubmitVehicle = plateNumber.trim().length > 0 && !isSubmitting;

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
          <Text className="text-white font-bold text-lg">Add Vehicle</Text>

          <View className="space-y-1">
            <Text className="text-muted text-xs font-semibold uppercase px-1">Plate Number</Text>
            <View className="bg-elevated-navy border border-border-slate rounded-2xl p-4">
              <TextInput
                placeholder="34ABC123"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
                className="text-white text-sm"
                value={plateNumber}
                onChangeText={setPlateNumber}
              />
            </View>
          </View>

          <View className="flex-row gap-x-2">
            {connectorTypes.map((item) => {
              const isSelected = connectorType === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setConnectorType(item)}
                  className={`flex-1 py-3 rounded-2xl border items-center ${isSelected ? "border-cyan-glow bg-cyan-glow/10" : "border-border-slate bg-elevated-navy"}`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? "text-cyan-glow" : "text-muted"}`}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleAddVehicle}
            disabled={!canSubmitVehicle}
            className="w-full bg-cyan-glow active:bg-cyan-glow/85 py-4 rounded-2xl items-center justify-center disabled:opacity-50"
          >
            <Text className="text-midnight font-bold text-base">{isSubmitting ? "Adding Vehicle" : "Add To Garage"}</Text>
          </Pressable>

          {errorMessage ? <Text className="text-red-400 text-sm">{errorMessage}</Text> : null}
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
                <View className="flex-row justify-between">
                  <Text className="text-muted text-xs font-semibold">STATUS</Text>
                  <Text className="text-white font-bold text-xs">{vehicle.isPrimary ? "PRIMARY" : vehicle.relationshipType.toUpperCase()}</Text>
                </View>
                <Pressable
                  onPress={() => handleRemoveVehicle(vehicle.plateNumber)}
                  disabled={removingPlate === vehicle.plateNumber}
                  className="bg-red-500/10 border border-red-500/20 py-3 rounded-2xl items-center disabled:opacity-50"
                >
                  <Text className="text-red-400 font-bold text-xs">
                    {removingPlate === vehicle.plateNumber ? "REMOVING" : "REMOVE"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
