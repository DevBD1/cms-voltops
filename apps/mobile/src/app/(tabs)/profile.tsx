import { useEffect, useState } from "react";
import { Text, View, Pressable, ScrollView, TextInput, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ActionButton } from "@/components/ActionButton";

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

  const [isFocusedPlate, setIsFocusedPlate] = useState(false);

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
    if (!plateNumber.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const data = await apiRequest<ProfileData>("/api/mobile/vehicles", {
        method: "POST",
        body: JSON.stringify({ plateNumber: plateNumber.trim(), connectorType }),
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
    <View className="flex-1 bg-midnight relative">
      {/* Background ambient glows */}
      <View
        className="absolute w-[800px] h-[800px] rounded-full opacity-5 blur-[120px]"
        style={{
          top: -200,
          right: -200,
          backgroundColor: "#2563EB",
        }}
      />

      <SafeAreaView className="flex-1 z-10 px-6 pt-4">
        {/* Header App Bar */}
        <View className="flex-row justify-between items-center w-full mb-6">
          <View>
            <Text className="text-white text-3xl font-extrabold tracking-tight uppercase" style={{ fontFamily: "Sora" }}>
              Your Garage
            </Text>
            <Text className="text-cyan-glow text-xs uppercase tracking-widest font-semibold mt-1">
              Pilot & Vehicle Telemetry
            </Text>
          </View>

          <Pressable
            onPress={handleLogout}
            className="bg-elevated-navy border border-border-slate px-4 py-2.5 rounded-2xl active:bg-elevated-navy/80"
          >
            <Text className="text-red-400 text-[10px] font-bold tracking-wider uppercase">Log Out</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} className="space-y-6">

          {/* Showroom Vehicle Showcase Graphic Card */}
          <View className="w-full h-48 rounded-[32px] overflow-hidden border border-border-slate relative justify-end p-6 bg-slate-navy">
            <Image
              source={{
                uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9Qj96pv4UhegFLr-BJi_yYsbtP_bzioCcQQDfK776UQA6m2uNxFXGMFPT4J8g3hgGpiSmrHd6_RjGf6lzbgiStSxMfvTIsPzNB0iukFrMQxGe1id1dH9vZPiAGXV8WRUXmJYBEf926TUfB6N6zGy3ZdeJBSuS_IGo_weGuYzGA4tvdVYx3O_L8JnTs-cezpGaD6XwJQ6zWBw1XR_tLTqm2rd5mP4_PsRBbc7D1x9p6HMeSZUjP6sG1qndx69BFDjpVq3rNOZzSg",
              }}
              className="absolute inset-0 opacity-40"
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "#0A0E1A"]}
              className="absolute inset-0"
            />
            <View className="z-10 flex-row items-center space-x-3 gap-x-3">
              <View className="h-12 w-12 bg-elevated-navy/80 rounded-full border border-cyan-glow/20 items-center justify-center">
                <Text className="text-cyan-glow text-lg font-bold">👤</Text>
              </View>
              <View>
                <Text className="text-white text-base font-bold" style={{ fontFamily: "Sora" }}>
                  {profile ? `${profile.user.firstName} ${profile.user.lastName}` : "Loading operator..."}
                </Text>
                <Text className="text-muted text-[10px] font-semibold tracking-wider uppercase mt-0.5">
                  {profile?.user.email ?? "Account syncing"}
                </Text>
              </View>
            </View>
          </View>

          {/* Add Vehicle Cockpit Form */}
          <View className="bg-slate-navy p-6 rounded-[32px] border border-border-slate space-y-4">
            <Text className="text-white font-bold text-lg" style={{ fontFamily: "Sora" }}>Connect Vehicle</Text>

            {/* License plate input */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                License Plate Number
              </Text>
              <View className={`bg-elevated-navy border rounded-2xl px-4 py-3.5 transition-all ${isFocusedPlate ? "border-cyan-glow" : "border-border-slate"}`}>
                <TextInput
                  placeholder="E.g. VOLT-2024"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  className="text-white text-sm outline-none font-semibold"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  onFocus={() => setIsFocusedPlate(true)}
                  onBlur={() => setIsFocusedPlate(false)}
                />
              </View>
            </View>

            {/* Selector cards */}
            <View className="space-y-1.5">
              <Text className="text-muted text-[10px] font-bold tracking-widest uppercase ml-1" style={{ fontFamily: "Inter" }}>
                Connector Type
              </Text>
              <View className="flex-row space-x-2 gap-x-2">
                {connectorTypes.map((item) => {
                  const isSelected = connectorType === item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setConnectorType(item)}
                      className={`flex-1 py-3 rounded-full border items-center justify-center ${
                        isSelected ? "border-cyan-glow bg-cyan-glow/5" : "border-border-slate bg-elevated-navy/40"
                      }`}
                    >
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-cyan-glow" : "text-muted"}`} style={{ fontFamily: "Inter" }}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {errorMessage ? <Text className="text-red-400 text-xs text-center">{errorMessage}</Text> : null}

            <View className="mt-2">
              <ActionButton
                label={plateNumber.trim() ? "Save vehicle" : "Enter plate number"}
                iconName="save-outline"
                onPress={handleAddVehicle}
                disabled={!canSubmitVehicle}
                loading={isSubmitting}
              />
            </View>
          </View>

          {/* Garage connected list */}
          <View className="space-y-3">
            <Text className="text-white font-bold text-lg" style={{ fontFamily: "Sora" }}>Connected Vehicles</Text>

            {!profile || profile.vehicles.length === 0 ? (
              <View className="bg-slate-navy p-5 rounded-[24px] border border-border-slate">
                <Text className="text-muted text-xs text-center" style={{ fontFamily: "Inter" }}>
                  No connected vehicles. Register your EV specs.
                </Text>
              </View>
            ) : (
              profile.vehicles.map((vehicle) => (
                <View key={vehicle.plateNumber} className="bg-slate-navy p-6 rounded-[24px] border border-border-slate space-y-4">
                  <View className="flex-row justify-between items-center pb-2 border-b border-white/[0.05]">
                    <Text className="text-white font-bold text-base">{vehicle.plateNumber}</Text>
                    <View className="bg-elevated-navy border border-border-slate px-3 py-1 rounded-full">
                      <Text className="text-cyan-glow text-[10px] font-bold uppercase">{vehicle.connectorType}</Text>
                    </View>
                  </View>

                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-muted text-xs font-semibold">PILOT RELATION</Text>
                      <Text className="text-white font-bold text-xs">{vehicle.relationshipType.toUpperCase()}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted text-xs font-semibold">PRIMARY STATE</Text>
                      <Text className="text-white font-bold text-xs">{vehicle.isPrimary ? "YES" : "NO"}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveVehicle(vehicle.plateNumber)}
                    disabled={removingPlate === vehicle.plateNumber}
                    className="w-full bg-red-500/10 border border-red-500/20 py-3.5 rounded-full items-center justify-center disabled:opacity-50 active:bg-red-500/20"
                  >
                    {removingPlate === vehicle.plateNumber ? (
                      <ActivityIndicator color="#F87171" size="small" />
                    ) : (
                      <Text className="text-red-400 font-bold text-xs tracking-wider uppercase">Disconnect Vehicle</Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
