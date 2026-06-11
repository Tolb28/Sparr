import { ServerIP } from "./tokenHandler";

interface RegisterResponse {
  token: string;
  user: { id: string; email: string; username?: string };
  needsProfileSetup?: boolean;
}

interface EmailVerificationRequiredResponse {
  status: 'email_verification_required';
  email: string;
}

export type RegisterResult = RegisterResponse | EmailVerificationRequiredResponse;

export async function register(email: string, password: string): Promise<RegisterResult> {
  const response = await fetch(`${ServerIP}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // 202 = email verification required
  if (response.status === 202) {
    return response.json() as Promise<EmailVerificationRequiredResponse>;
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`Server error: ${response.statusText}`);
    }
    throw new Error(errorData?.error || "Registration failed");
  }

  return response.json() as Promise<RegisterResponse>;
}

