import { Request, Response } from "express";
import { pool } from "../config/db";
import { supabaseAdminClient } from "../config/supabase";
import {
  AuthServiceError,
  loginLocalUser,
  loginWithGoogleIdToken,
  registerLocalUser,
  resolveGoogleOwnershipConflict,
} from "../services/authService";

const requestContext = (req: Request) => ({
  requestId: (req.headers["x-request-id"] as string | undefined) ?? null,
  ipAddress: req.ip ?? null,
  userAgent: req.headers["user-agent"] ?? null,
});

const handleAuthError = (err: unknown, res: Response, defaultMessage: string) => {
  if (err instanceof AuthServiceError) {
    const payload: Record<string, unknown> = { error: err.message };
    if (err.code) payload.code = err.code;
    return res.status(err.statusCode).json(payload);
  }
  console.error(err);
  return res.status(500).json({ error: defaultMessage });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await registerLocalUser(email, password, requestContext(req));
    return res.status(201).json(result);
  } catch (err) {
    return handleAuthError(err, res, "Registration failed");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await loginLocalUser(email, password, requestContext(req));
    return res.json(result);
  } catch (err) {
    return handleAuthError(err, res, "Login failed");
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      return res.status(400).json({ error: "Missing Google ID token" });
    }

    const result = await loginWithGoogleIdToken(idToken, requestContext(req));

    if ("decisionRequired" in result && result.decisionRequired) {
      return res.status(409).json({
        error: result.message,
        code: "EMAIL_CONFLICT",
        token: result.token,
        conflictUserId: result.conflictUserId,
        decisionRequired: true,
      });
    }

    return res.json(result);
  } catch (err) {
    return handleAuthError(err, res, "Google login failed");
  }
};

export const resolveGoogleConflictDecision = async (req: Request, res: Response) => {
  try {
    const { decision, conflictUserId } = req.body as {
      decision?: "mine" | "not_mine";
      conflictUserId?: string;
    };

    if (decision !== "mine" && decision !== "not_mine") {
      return res.status(400).json({ error: "decision must be 'mine' or 'not_mine'" });
    }
    if (!conflictUserId) {
      return res.status(400).json({ error: "Missing conflictUserId" });
    }

    // @ts-ignore
    const currentUserId = req.userId as string | undefined;
    // @ts-ignore
    const currentUserEmail = req.userEmail as string | undefined;
    if (!currentUserId || !currentUserEmail) {
      return res.status(401).json({ error: "Invalid auth context" });
    }

    const result = await resolveGoogleOwnershipConflict({
      currentUserId,
      currentEmail: currentUserEmail,
      decision,
      conflictUserId,
      context: requestContext(req),
    });

    return res.json({
      success: true,
      needsProfileSetup: result.needsProfileSetup,
    });
  } catch (err) {
    return handleAuthError(err, res, "Conflict resolution failed");
  }
};

export const getUser = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { rows } = await pool.query(
    "SELECT id, email, account_status, created_at, updated_at FROM users WHERE id = $1",
    [userId]
  );
  return res.json({ user: rows[0] ?? null });
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, password } = req.body as { email?: string; password?: string };
    if (!email && !password) {
      return res.status(400).json({ error: "No fields to update." });
    }

    const payload: { email?: string; password?: string } = {};
    if (email) payload.email = String(email).trim().toLowerCase();
    if (password) payload.password = password;

    const { error } = await supabaseAdminClient.auth.admin.updateUserById(userId, payload);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (payload.email) {
      await pool.query(
        "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2",
        [payload.email, userId]
      );
    } else {
      await pool.query(
        "UPDATE users SET updated_at = NOW() WHERE id = $1",
        [userId]
      );
    }

    const { rows } = await pool.query(
      "SELECT id, email, account_status, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    return res.json({ user: rows[0] ?? null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

