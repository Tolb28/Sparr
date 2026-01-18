import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { deleteToken } from "./tokenHandler";

type ProfileData = {
  id_profiles: number;
  display_name?: string;
  username?: string; 
  location?: string; 
  avatar?: string | null;
  avatar_url?: string | null;
}

export async function storeProfile(profile: ProfileData) {
  if (Platform.OS === "web") {
    localStorage.setItem("profile", JSON.stringify(profile));
  } else {
    await SecureStore.setItemAsync("profile", JSON.stringify(profile));
  }
  console.log("Profile stored:", profile);
}

export async function getProfile() {
  if (Platform.OS === "web") {
    return localStorage.getItem("profile");
  } else {
    return await SecureStore.getItemAsync("profile");
  }
}

export async function removeProfile() {
  await deleteToken();
  if (Platform.OS === "web") {
    localStorage.removeItem("profile");
  } else {
    await SecureStore.deleteItemAsync("profile");
  }
}

export const ServerIP = Platform.OS === "web" ? "http://localhost:4000/api" : "http://10.0.0.38:4000/api";