import Constants from "expo-constants";
import * as Linking from "expo-linking";

const customSchemeRedirectUrl = "voltops://auth/callback";

export function getAuthRedirectUrl(): string {
  if (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL) {
    if (__DEV__ && process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL.includes("localhost:3000")) {
      console.warn("EXPO_PUBLIC_AUTH_REDIRECT_URL points to localhost:3000. Mobile auth links should use exp:// or voltops://.");
    }

    return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  }

  if (Constants.appOwnership === "expo") {
    return Linking.createURL("/auth/callback");
  }

  return customSchemeRedirectUrl;
}
