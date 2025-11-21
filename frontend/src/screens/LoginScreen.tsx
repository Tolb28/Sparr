import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { login } from '../api/login';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      console.log('Validation failed - email:', email, 'password:', password);
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const resp = await login(email, password);
      console.log('login success', resp);
      setError(null);
      // You can store resp.token here (AsyncStorage, context, etc.) if needed
      navigation.replace('Main');
    } catch (err: any) {
      console.log('login error', err);
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => { setEmail(text); setError(null); }}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={(text) => { setPassword(text); setError(null); }}
        style={styles.input}
        secureTextEntry
      />
      <Button title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <View style={{ height: 8 }} />
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ alignSelf: 'center', marginTop: 8 }}>
        <Text style={{ color: '#007AFF' }}>Don't have an account yet? Create one</Text>
      </TouchableOpacity>
      <Text style={styles.platformText}>Running on {Platform.OS}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 },
  platformText: { marginTop: 20, textAlign: 'center', color: 'gray' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 12 },
});

