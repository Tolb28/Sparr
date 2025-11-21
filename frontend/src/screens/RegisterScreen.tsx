import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { register } from '../api/register';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const resp = await register(email, password);
      console.log('register success', resp);
      setError(null);
      // You can store resp.token here (AsyncStorage, context, etc.) if needed
      navigation.replace('Main');
    } catch (err: any) {
      console.log('register error', err);
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Register</Text>
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
        <Button title={loading ? 'Creating...' : 'Create Account'} onPress={handleRegister} disabled={loading} />
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'center', marginTop: 8 }}>
            <Text style={{ color: '#007AFF' }}>Already have an account? Log in</Text>
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
