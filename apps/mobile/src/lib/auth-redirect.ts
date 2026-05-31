import Constants from "expo-constants";
import * as Linking from "expo-linking";

const customSchemeRedirectUrl = "voltops://auth/callback";

export function getAuthRedirectUrl(): string {
  if (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL) {
    return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  }

  if (Constants.appOwnership === "expo") {
    return Linking.createURL("/auth/callback");
  }

  return customSchemeRedirectUrl;
}
