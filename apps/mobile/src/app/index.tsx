import { Redirect } from "expo-router";

export default function Index() {
  // In production, check auth state and token. Redirect appropriately.
  return <Redirect href="/onboarding" />;
}
