import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { login } from '../api/login';
import { getToken, storeToken } from '../api/tokenHandler';
import { getUserProfile } from '../api/profile';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, removeProfile } from '../api/profileHandler';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, redirect to Main
    (async () => {
      const token = await getToken();
      console.log('existing token', token);
      const profile = await getProfile();
      if (profile) {
        navigation.replace('Main');
      }
    })();
    }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const resp = await login(email, password);
      console.log('login success', resp);
      setError(null);
        console.log('storing token', resp.token);
        await storeToken(resp.token);
        // Check whether profile exists yet
        try {
          const profileResp = await getUserProfile();
          if (profileResp?.profile) {
            navigation.replace('Main');
          } else {
            navigation.replace('CreateProfile');
          }
        } catch (e: any) {
          // If profile not found (or any get profile error), route to create profile
          console.log('error fetching profile after login', e);
          navigation.replace('CreateProfile');
        }
    } catch (err: any) {
      console.log('login error', err);
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex-1 bg-white justify-center items-center px-4">
      <VStack className="w-full max-w-sm gap-6">
        {/* Title */}
        <Text className="text-3xl font-bold text-center">Login</Text>

        {/* Error Message */}
        {error && (
          <Box className="bg-red-100 rounded p-3">
            <Text className="text-red-700 text-center">{error}</Text>
          </Box>
        )}

        {/* Email Input */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold">Email</Text>
          <Input className="border border-gray-300 rounded">
            <InputField
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Input>
        </VStack>

        {/* Password Input */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold">Password</Text>
          <Input className="border border-gray-300 rounded">
            <InputField
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry={!showPassword}
              type={showPassword ? 'text' : 'password'}
            />
            <InputSlot onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#6B7280"
              />
            </InputSlot>
          </Input>
        </VStack>

        {/* Login Button */}
        <Button
          onPress={handleLogin}
          disabled={loading}
          className="bg-blue-500 rounded py-2 mt-4"
        >
          <ButtonText>{loading ? 'Logging in...' : 'Login'}</ButtonText>
        </Button>

        {/* Sign Up Link */}
        <HStack className="justify-center gap-1">
          <Text className="text-gray-600">Don't have an account yet? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text className="text-blue-500 font-semibold">Create one</Text>
          </Pressable>
        </HStack>

        {/* Platform Info */}
        <Text className="text-gray-500 text-center text-sm mt-6">
          Running on {Platform.OS}
        </Text>
      </VStack>
    </Box>
  );
}

