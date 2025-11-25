import React, { useState } from 'react';
import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { register } from '../api/register';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';

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
      navigation.replace('Main');
    } catch (err: any) {
      console.log('register error', err);
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex-1 bg-white justify-center items-center px-4">
      <VStack className="w-full max-w-sm gap-6">
        {/* Title */}
        <Text className="text-3xl font-bold text-center">Register</Text>

        {/* Error Message */}
        {error && (
          <Box className="bg-red-100 rounded p-3">
            <Text className="text-red-700 text-center text-sm">{error}</Text>
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

        {/* Username Input */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold">Username</Text>
          <Input className="border border-gray-300 rounded">
            <InputField
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
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
              secureTextEntry
            />
          </Input>
        </VStack>

        {/* Register Button */}
        <Button
          onPress={handleRegister}
          disabled={loading}
          className="bg-blue-500 rounded py-3 mt-4"
        >
          <ButtonText>
            {loading ? 'Creating...' : 'Create Account'}
          </ButtonText>
        </Button>

        {/* Login Link */}
        <HStack className="justify-center gap-1">
          <Text className="text-gray-600">Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text className="text-blue-500 font-semibold">Log in</Text>
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
