import { Platform } from "react-native";
import * as Keychain from "react-native-keychain";

export async function storeToken(token : any) {
  if (Platform.OS === "web") {
    // Use localStorage on web
    localStorage.setItem("token", token);
  } else {
    // Use secure storage on mobile
    await Keychain.setGenericPassword("authToken", token);
  }
}

export async function getToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  } else {
    const creds = await Keychain.getGenericPassword();
    return creds ? creds.password : null;
  }
}
