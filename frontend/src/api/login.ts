import { ServerIP } from "./tokenHandler";

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
  needsProfileSetup?: boolean;
}

const parseErrorResponse = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    const err: any = new Error(data?.error || fallback);
    if (data?.code) err.code = data.code;
    if (data) err.data = data;
    throw err;
  } catch (e: any) {
    if (e instanceof Error && (e as any).data) throw e;
    throw new Error(`Server error: ${response.statusText || fallback}`);
  }
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${ServerIP}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Login failed");
  }

  return response.json();
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${ServerIP}/auth/google/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Google login failed");
  }

  return response.json();
}

export async function resolveGoogleConflictDecision(
  token: string,
  decision: "mine" | "not_mine",
  conflictUserId: string
): Promise<{ success: boolean; needsProfileSetup: boolean }> {
  const response = await fetch(`${ServerIP}/auth/google/conflict-decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ decision, conflictUserId }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Failed to resolve ownership conflict");
  }

  return response.json();
}

