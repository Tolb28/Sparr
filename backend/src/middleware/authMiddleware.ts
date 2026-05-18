import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db";
import { supabaseAuthClient } from "../config/supabase";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const authUser = data.user;
  // @ts-ignore
  req.userId = authUser.id;
  // @ts-ignore
  req.userEmail = authUser.email ?? null;
  // @ts-ignore
  req.isAdmin = authUser.app_metadata?.role === "admin";

  const { rows: userRows } = await pool.query(
    "SELECT account_status FROM users WHERE id = $1 LIMIT 1",
    [authUser.id]
  );
  const accountStatus = (userRows[0] as { account_status?: string } | undefined)?.account_status;
  if (accountStatus === "inaccessible") {
    return res.status(403).json({ error: "Account is inaccessible" });
  }

  const requestedProfileIdRaw = req.headers["x-profile-id"];
  const requestedProfileId = Array.isArray(requestedProfileIdRaw)
    ? parseInt(requestedProfileIdRaw[0] as string, 10)
    : parseInt((requestedProfileIdRaw as string) || "", 10);

  if (requestedProfileId) {
    const { rows } = await pool.query(
      "SELECT id_profiles FROM profiles WHERE id_profiles = $1 AND user_id = $2 LIMIT 1",
      [requestedProfileId, authUser.id]
    );
    if (!rows[0]) {
      return res.status(403).json({ error: "Invalid profile context" });
    }
    // @ts-ignore
    req.profileId = requestedProfileId;
  }

  next();
};

