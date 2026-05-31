import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#141A29",
          borderTopWidth: 0,
          elevation: 8,
          shadowOpacity: 0.1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#00E5FF",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen name="map" options={{ title: "Explore" }} />
      <Tabs.Screen name="pulse" options={{ title: "Pulse" }} />
      <Tabs.Screen name="support" options={{ title: "Help" }} />
      <Tabs.Screen name="profile" options={{ title: "Garage" }} />
    </Tabs>
  );
}
