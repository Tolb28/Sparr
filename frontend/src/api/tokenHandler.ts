import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function storeToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem("token", token);
  } else {
    await SecureStore.setItemAsync("authToken", token);
  }
}

export async function getToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  } else {
    return await SecureStore.getItemAsync("authToken");
  }
}

export async function deleteToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem("token");
  } else {
    await SecureStore.deleteItemAsync("authToken");
  }
}

export const ServerIP =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? "http://localhost:4000/api" : "http://10.0.0.35:4000/api");





  
