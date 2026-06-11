import { ServerIP } from './tokenHandler';
import { getToken } from './tokenHandler';

export async function resendVerificationEmail(email: string): Promise<void> {
  const response = await fetch(`${ServerIP}/api/auth/email-verification/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to resend verification email');
  }
}

export async function checkVerificationStatus(): Promise<{ confirmed: boolean }> {
  const token = await getToken();
  if (!token) return { confirmed: false };
  const response = await fetch(`${ServerIP}/api/auth/email-verification/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { confirmed: false };
  return response.json();
}
