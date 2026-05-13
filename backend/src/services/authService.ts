import { pool } from "../config/db";
import { supabaseAuthClient } from "../config/supabase";
import { logAuthEventSafe } from "./authAuditService";

type AuthProvider = "local" | "google";
type ConflictDecision = "mine" | "not_mine";

export class AuthServiceError extends Error {
  statusCode: number;
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    if (code) {
      this.code = code;
    }
  }
}

type AuthResult = {
  token: string;
  user: {
    id: string;
    email: string;
  };
  needsProfileSetup: boolean;
};

type GoogleConflictResult = {
  decisionRequired: true;
  token: string;
  conflictUserId: string;
  message: string;
};

type AuthEventContext = {
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const recoveryEmailFor = (email: string, userId: string) => {
  const [localRaw] = normalizeEmail(email).split("@");
  const local = (localRaw || "account").replace(/[^a-z0-9._+-]/g, "");
  const stamp = Date.now().toString();
  const shortId = userId.slice(0, 8);
  return `${local}+locked-${shortId}-${stamp}@recovery.sparr.local`;
};

const getNeedsProfileSetup = async (userId: string): Promise<boolean> => {
  const { rows } = await pool.query(
    "SELECT 1 FROM profiles WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  return !rows[0];
};

type AppUserRow = {
  id: string;
  email: string;
  account_status: string;
};

const getAppUserById = async (userId: string): Promise<AppUserRow | null> => {
  const { rows } = await pool.query(
    "SELECT id, email, account_status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const row = rows[0] as AppUserRow | undefined;
  return row ?? null;
};

const getAppUserByEmail = async (email: string): Promise<AppUserRow | null> => {
  const { rows } = await pool.query(
    "SELECT id, email, account_status FROM users WHERE email = $1 LIMIT 1",
    [normalizeEmail(email)]
  );
  const row = rows[0] as AppUserRow | undefined;
  return row ?? null;
};

const rotateUserEmailAndInactivate = async (
  userId: string,
  email: string,
  reason: string
): Promise<void> => {
  const recoveryEmail = recoveryEmailFor(email, userId);
  await pool.query(
    `UPDATE users
     SET email = $1,
         account_status = 'inaccessible',
         inaccessible_reason = $2,
         inaccessible_at = NOW(),
         updated_at = NOW()
     WHERE id = $3`,
    [recoveryEmail, reason, userId]
  );
};

const upsertAppUser = async ({
  id,
  email,
  provider,
  googleSub,
}: {
  id: string;
  email: string;
  provider: AuthProvider;
  googleSub: string | null;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, auth_provider, google_sub, account_status, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, $4, 'active', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           auth_provider = EXCLUDED.auth_provider,
           google_sub = COALESCE(EXCLUDED.google_sub, users.google_sub),
           account_status = 'active',
           updated_at = NOW()`,
    [id, normalizeEmail(email), provider, googleSub]
  );
};

const throwFromSupabaseError = (message: string, defaultCode: string): never => {
  throw new AuthServiceError(400, message, defaultCode);
};

export async function registerLocalUser(
  email: string,
  password: string,
  context: AuthEventContext = {}
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabaseAuthClient.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (error) {
    await logAuthEventSafe({
      eventType: "register_failed",
      status: "failure",
      provider: "local",
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      message: error.message,
      metadata: { email: normalizedEmail },
    });
    throwFromSupabaseError(error.message, "REGISTER_FAILED");
  }

  const user = data.user;
  if (!user || !user.email) {
    throw new AuthServiceError(500, "Registration failed", "REGISTER_NO_USER");
  }

  const appUserWithEmail = await getAppUserByEmail(user.email);
  if (appUserWithEmail && appUserWithEmail.id !== user.id && appUserWithEmail.account_status !== "inaccessible") {
    throw new AuthServiceError(409, "Email already exists", "EMAIL_ALREADY_EXISTS");
  }

  if (appUserWithEmail && appUserWithEmail.id !== user.id && appUserWithEmail.account_status === "inaccessible") {
    await rotateUserEmailAndInactivate(appUserWithEmail.id, appUserWithEmail.email, "supabase_registration_reuse");
  }

  await upsertAppUser({
    id: user.id,
    email: user.email,
    provider: "local",
    googleSub: null,
  });

  let token = data.session?.access_token ?? null;
  if (!token) {
    const signIn = await supabaseAuthClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signIn.error || !signIn.data.session?.access_token) {
      throw new AuthServiceError(
        400,
        signIn.error?.message || "Registration succeeded but login failed",
        "REGISTER_SIGNIN_FAILED"
      );
    }
    token = signIn.data.session.access_token;
  }

  const needsProfileSetup = await getNeedsProfileSetup(user.id);
  await logAuthEventSafe({
    eventType: "register_success",
    status: "success",
    provider: "local",
    userId: user.id,
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  });

  return {
    token,
    user: { id: user.id, email: user.email },
    needsProfileSetup,
  };
}

export async function loginLocalUser(
  email: string,
  password: string,
  context: AuthEventContext = {}
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    await logAuthEventSafe({
      eventType: "login_failed",
      status: "failure",
      provider: "local",
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      message: error.message,
      metadata: { email: normalizedEmail },
    });
    throw new AuthServiceError(400, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const user = data.user;
  const token = data.session?.access_token;
  if (!user || !user.email || !token) {
    throw new AuthServiceError(400, "Login failed", "LOGIN_FAILED");
  }

  const existing = await getAppUserById(user.id);
  if (existing?.account_status === "inaccessible") {
    throw new AuthServiceError(403, "Account is inaccessible", "ACCOUNT_INACCESSIBLE");
  }

  // Ensure we don't attempt to insert a new users row with an email that already exists
  // under a different app user ID. Handle the same conflict policy as registration.
  const appUserWithEmail = await getAppUserByEmail(user.email);
  if (appUserWithEmail && appUserWithEmail.id !== user.id && appUserWithEmail.account_status !== "inaccessible") {
    // There is an existing active app account for this email belonging to another user id.
    // Treat as a conflict so callers can surface an ownership decision (similar to Google flow).
    await logAuthEventSafe({
      eventType: "login_conflict",
      status: "info",
      provider: "local",
      userId: user.id,
      message: "Email ownership conflict on login",
      metadata: { conflictUserId: appUserWithEmail.id },
    });
    throw new AuthServiceError(409, "Email already exists", "EMAIL_CONFLICT");
  }

  if (appUserWithEmail && appUserWithEmail.id !== user.id && appUserWithEmail.account_status === "inaccessible") {
    // Reuse the same behavior as registration: rotate the old account email and inactivate it.
    await rotateUserEmailAndInactivate(appUserWithEmail.id, appUserWithEmail.email, "supabase_login_reuse");
  }

  await upsertAppUser({
    id: user.id,
    email: user.email,
    provider: "local",
    googleSub: null,
  });

  const needsProfileSetup = await getNeedsProfileSetup(user.id);
  await logAuthEventSafe({
    eventType: "login_success",
    status: "success",
    provider: "local",
    userId: user.id,
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  });

  return {
    token,
    user: { id: user.id, email: user.email },
    needsProfileSetup,
  };
}

export async function loginWithGoogleIdToken(
  idToken: string,
  context: AuthEventContext = {}
): Promise<AuthResult | GoogleConflictResult> {
  const { data, error } = await supabaseAuthClient.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) {
    await logAuthEventSafe({
      eventType: "google_login_failed",
      status: "failure",
      provider: "google",
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      message: error.message,
    });
    throwFromSupabaseError(error.message, "GOOGLE_LOGIN_FAILED");
  }

  const user = data.user;
  const token = data.session?.access_token;
  if (!user || !user.email || !token) {
    throw new AuthServiceError(400, "Google login failed", "GOOGLE_LOGIN_INVALID_SESSION");
  }

  const existingById = await getAppUserById(user.id);
  if (existingById?.account_status === "inaccessible") {
    throw new AuthServiceError(403, "Account is inaccessible", "ACCOUNT_INACCESSIBLE");
  }

  const existingByEmail = await getAppUserByEmail(user.email);
  if (existingByEmail && existingByEmail.id !== user.id && existingByEmail.account_status !== "inaccessible") {
    await logAuthEventSafe({
      eventType: "google_login_conflict",
      status: "info",
      provider: "google",
      userId: user.id,
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      message: "Email ownership decision required",
      metadata: {
        conflictUserId: existingByEmail.id,
      },
    });

    return {
      decisionRequired: true,
      token,
      conflictUserId: existingByEmail.id,
      message: "Account ownership decision required",
    };
  }

  if (existingByEmail && existingByEmail.id !== user.id && existingByEmail.account_status === "inaccessible") {
    await rotateUserEmailAndInactivate(existingByEmail.id, existingByEmail.email, "google_login_email_reuse");
  }

  await upsertAppUser({
    id: user.id,
    email: user.email,
    provider: "google",
    googleSub: user.user_metadata?.sub ? String(user.user_metadata.sub) : null,
  });

  const needsProfileSetup = await getNeedsProfileSetup(user.id);
  await logAuthEventSafe({
    eventType: "google_login_success",
    status: "success",
    provider: "google",
    userId: user.id,
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  });

  return {
    token,
    user: { id: user.id, email: user.email },
    needsProfileSetup,
  };
}

export async function resolveGoogleOwnershipConflict(params: {
  currentUserId: string;
  currentEmail: string;
  decision: ConflictDecision;
  conflictUserId: string;
  context?: AuthEventContext;
}): Promise<{ needsProfileSetup: boolean }> {
  const { currentUserId, currentEmail, decision, conflictUserId, context } = params;

  const normalizedCurrentEmail = normalizeEmail(currentEmail);
  const { rows } = await pool.query(
    "SELECT id, email, account_status FROM users WHERE id = $1 LIMIT 1",
    [conflictUserId]
  );
  const conflictUser = rows[0] as AppUserRow | undefined;
  if (!conflictUser) {
    throw new AuthServiceError(404, "Conflict account not found", "CONFLICT_ACCOUNT_NOT_FOUND");
  }

  if (normalizeEmail(conflictUser.email) !== normalizedCurrentEmail) {
    throw new AuthServiceError(400, "Conflict email mismatch", "CONFLICT_EMAIL_MISMATCH");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const recoveryEmail = recoveryEmailFor(conflictUser.email, conflictUser.id);
    await client.query(
      `UPDATE users
       SET email = $1,
           account_status = 'inaccessible',
           inaccessible_reason = $2,
           inaccessible_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [
        recoveryEmail,
        decision === "mine" ? "ownership_confirmed_transfer" : "ownership_denied",
        conflictUser.id,
      ]
    );

    if (decision === "mine") {
      await client.query(
        "UPDATE profiles SET user_id = $1 WHERE user_id = $2",
        [currentUserId, conflictUser.id]
      );
    }

    await client.query(
      `INSERT INTO users (id, email, password_hash, auth_provider, google_sub, account_status, created_at, updated_at)
       VALUES ($1, $2, NULL, 'google', NULL, 'active', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             auth_provider = EXCLUDED.auth_provider,
             account_status = 'active',
             updated_at = NOW()`,
      [currentUserId, normalizedCurrentEmail]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const needsProfileSetup = await getNeedsProfileSetup(currentUserId);
  await logAuthEventSafe({
    eventType: "google_login_conflict_resolved",
    status: "success",
    provider: "google",
    userId: currentUserId,
    requestId: context?.requestId ?? null,
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
    message: `Decision: ${decision}`,
    metadata: { conflictUserId },
  });

  return { needsProfileSetup };
}

