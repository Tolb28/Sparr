import { pool } from "../config/db";

export type AuthEventStatus = "success" | "failure" | "info";
export type AuthProvider = "local" | "google" | "supabase";

type AuthEventInput = {
  eventType: string;
  status: AuthEventStatus;
  provider: AuthProvider;
  userId?: string | null;
  profileId?: number | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
};

const toJson = (input: Record<string, unknown> | null | undefined) => {
  if (!input) return null;
  return JSON.stringify(input);
};

export async function logAuthEvent(event: AuthEventInput): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  console.log("auth_event", payload);

  await pool.query(
    `INSERT INTO auth_events
      (event_type, status, provider, user_id, profile_id, request_id, ip_address, user_agent, message, metadata)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      event.eventType,
      event.status,
      event.provider,
      event.userId ?? null,
      event.profileId ?? null,
      event.requestId ?? null,
      event.ipAddress ?? null,
      event.userAgent ?? null,
      event.message ?? null,
      toJson(event.metadata),
    ]
  );
}

export async function logAuthEventSafe(event: AuthEventInput): Promise<void> {
  try {
    await logAuthEvent(event);
  } catch (error) {
    console.error("Failed to persist auth event", {
      eventType: event.eventType,
      provider: event.provider,
      userId: event.userId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

