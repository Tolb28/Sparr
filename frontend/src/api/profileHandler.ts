import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { deleteToken } from "./tokenHandler";
import { clearCachedProfileResponse } from "./profileCache";

type ProfileData = {
  id_profiles: number;
  display_name?: string;
  username?: string; 
  location?: string; 
  avatar?: string | null;
  avatar_url?: string | null;
}

const ACTIVE_PROFILE_KEY = "active_profile_id";

export async function storeProfile(profile: ProfileData) {
  if (Platform.OS === "web") {
    localStorage.setItem("profile", JSON.stringify(profile));
  } else {
    await SecureStore.setItemAsync("profile", JSON.stringify(profile));
  }
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
  clearCachedProfileResponse();
  if (Platform.OS === "web") {
    localStorage.removeItem("profile");
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  } else {
    await SecureStore.deleteItemAsync("profile");
    await SecureStore.deleteItemAsync(ACTIVE_PROFILE_KEY);
  }
}

export async function setActiveProfileId(profileId: number) {
  const value = String(profileId);
  if (Platform.OS === 'web') {
    localStorage.setItem(ACTIVE_PROFILE_KEY, value);
  } else {
    await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, value);
  }
}

export async function getActiveProfileId() {
  const raw = Platform.OS === 'web'
    ? localStorage.getItem(ACTIVE_PROFILE_KEY)
    : await SecureStore.getItemAsync(ACTIVE_PROFILE_KEY);
  const parsed = parseInt(raw || '', 10);
  return parsed || null;
}

