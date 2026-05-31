import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import "./global.css";

export default function App() {
  return (
    <View className="flex-1 bg-midnight items-center justify-center p-8">
      <View className="bg-slate-navy p-8 rounded-[32px] items-center space-y-4">
        <Text className="text-white font-bold text-3xl tracking-tight">VoltOps Mobile</Text>
        <Text className="text-cyan-glow font-medium text-lg">Hyper-Charge Active</Text>
        <Text className="text-muted text-sm text-center">Tailwind CSS + NativeWind setup verified.</Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}
