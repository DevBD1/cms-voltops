import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ActionButtonVariant = "primary" | "danger" | "neutral";

type ActionButtonProps = {
  label: string;
  iconName: IconName;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ActionButtonVariant;
};

const variantColors: Record<ActionButtonVariant, readonly [string, string]> = {
  primary: ["#2563EB", "#00E5FF"],
  danger: ["#EF4444", "#991B1B"],
  neutral: ["#1E293B", "#334155"],
};

export function ActionButton({ label, iconName, onPress, disabled = false, loading = false, variant = "primary" }: ActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="w-full h-14 rounded-2xl overflow-hidden active:scale-[0.98]"
      style={{ opacity: isDisabled ? 0.55 : 1 }}
    >
      <LinearGradient
        colors={variantColors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="flex-1 items-center justify-center"
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <View className="flex-row items-center justify-center gap-x-2 px-4">
            <Ionicons name={iconName} color="#FFF" size={18} />
            <Text className="text-white text-sm font-bold" style={{ fontFamily: "Sora" }}>
              {label}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
