import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1] as string;
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    // attach user id (extend Request type or use TS ignore)
    // @ts-ignore
    req.userId = payload.userId;
    // @ts-ignore
    req.isAdmin = Boolean(payload?.isAdmin);

    const requestedProfileIdRaw = req.headers['x-profile-id'];
    const requestedProfileId = Array.isArray(requestedProfileIdRaw)
      ? parseInt(requestedProfileIdRaw[0] as string, 10)
      : parseInt((requestedProfileIdRaw as string) || '', 10);

    if (requestedProfileId) {
      const { rows } = await pool.query(
        'SELECT id_profiles FROM profiles WHERE id_profiles = $1 AND user_id = $2 LIMIT 1',
        [requestedProfileId, payload.userId]
      );
      if (!rows[0]) {
        return res.status(403).json({ error: 'Invalid profile context' });
      }
      // @ts-ignore
      req.profileId = requestedProfileId;
    }

    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
