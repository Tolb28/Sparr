import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getUserProfile } from '../api/profileInfo';

type Profile = {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  weight_class_id?: number | null;
  boxing_style_id?: number | null;
  img_path?: string | null;
  title_weight?: string | null;
  title_style?: string | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile();
        console.log('Profile data:', data);
        // backend returns { profile: {...} }
        const p = data?.profile ?? data;
        if (mounted) setProfile(p);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }] }>
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile?.img_path ? (
              <Image source={{ uri: profile.img_path }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={100} color="#888" />
            )}
          </View>
          <Text style={styles.nickname}>{profile?.display_name ?? 'Nickname'}</Text>
          <Text style={styles.username}>{profile?.username ?? 'username'}</Text>
          <Text style={styles.club}>{profile?.location ?? 'Affiliated Club'}</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Bio:</Text> {profile?.bio ?? 'No bio provided.'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Weightclass:</Text> {profile?.title_weight ?? '—'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Boxing style:</Text> {profile?.title_style ?? '—'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs Section */}
        <View style={styles.tabBar}>
          <TouchableOpacity>
            <Ionicons name="person-outline" size={26} color="#000" />
          </TouchableOpacity>
          <View style={styles.activeTab}>
            <MaterialCommunityIcons name="grid" size={26} color="#000" />
          </View>
          <TouchableOpacity>
            <Feather name="calendar" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Image Grid */}
        <View style={styles.grid}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.gridItem}>
              <Feather name="image" size={36} color="#aaa" />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 80 },
  profileSection: { alignItems: "center", padding: 20 },
  avatarContainer: { marginBottom: 10 },
  nickname: { fontSize: 22, fontWeight: "bold" },
  username: { color: "#555" },
  club: { color: "#777", marginBottom: 15 },
  infoBlock: { width: "100%", marginBottom: 20 },
  infoText: { fontSize: 14, marginVertical: 2 },
  bold: { fontWeight: "bold" },
  editButton: {
    backgroundColor: "#ddd",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  editButtonText: { color: "#000", fontWeight: "500" },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  gridItem: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});

