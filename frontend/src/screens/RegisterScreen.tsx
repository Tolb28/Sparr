import React, { useState } from 'react';
import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { register } from '../api/register';
import { storeToken } from '../api/tokenHandler';
import { login } from '../api/login';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { colors, theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
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
      // After successful register, auto-login to receive token and route to CreateProfile
      try {
        const loginResp = await login(email, password);
        if (loginResp?.token) {
          await storeToken(loginResp.token);
        }
      } catch (e) {
        console.log('auto-login after register failed', e);
      }
      // Always navigate to create profile on first-time sign up
      navigation.replace('CreateProfile');
    } catch (err: any) {
      console.log('register error', err);
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex-1 justify-center items-center px-4" style={{ backgroundColor: colors.background.primary }}>
      <VStack className="w-full max-w-sm gap-6">
        {/* Title */}
        <Text className="text-3xl font-bold text-center" style={{ color: colors.text.primary }}>Register</Text>

        {/* Error Message */}
        {error && (
          <Box className="rounded p-3" style={{ backgroundColor: colors.error.light }}>
            <Text className="text-center text-sm" style={{ color: colors.error.main }}>{error}</Text>
          </Box>
        )}

        {/* Email Input */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold" style={{ color: colors.text.primary }}>Email</Text>
          <Input className="border rounded" style={{ borderColor: colors.border.medium }}>
            <InputField
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.text.tertiary}
            />
          </Input>
        </VStack>

        {/* Username is collected when creating a profile. */}

        {/* Password Input */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold" style={{ color: colors.text.primary }}>Password</Text>
          <Input className="border rounded" style={{ borderColor: colors.border.medium }}>
            <InputField
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry
              placeholderTextColor={colors.text.tertiary}
            />
          </Input>
        </VStack>

        {/* Register Button */}
        <Button
          onPress={handleRegister}
          disabled={loading}
          className="rounded py-2 mt-4"
          style={{ backgroundColor: theme.primary }}
        >
          <ButtonText style={{ color: theme.buttonText }}>
            {loading ? 'Creating...' : 'Create Account'}
          </ButtonText>
        </Button>

        {/* Login Link */}
        <HStack className="justify-center gap-1">
          <Text style={{ color: colors.text.secondary }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text className="font-semibold" style={{ color: theme.primary }}>Log in</Text>
          </Pressable>
        </HStack>

        {/* Platform Info */}
        <Text className="text-center text-sm mt-6" style={{ color: colors.text.tertiary }}>
          Running on {Platform.OS}
        </Text>
      </VStack>
    </Box>
  );
}
