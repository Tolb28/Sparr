import { Request, Response } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password} = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);

    const query = `INSERT INTO users (email, password_hash)
                   VALUES ($1, $2)
                   RETURNING id, email, created_at`;
    const values = [email, hashed];

    const { rows } = await pool.query(query, values);
    return res.status(201).json({ user: rows[0] });
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" }); // unique_violation
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    // create token (keep payload small)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  // auth middleware sets req.userId
  // @ts-ignore
  const userId = req.userId;
  const { rows } = await pool.query("SELECT id, email, created_at FROM users WHERE id=$1", [userId]);
  return res.json({ user: rows[0] });
};

export const updateUser = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId;
  const { email, password } = req.body;

  // Build the SET clause dynamically (because email or password may be optional)
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (email) {
    updates.push(`email = $${idx}`);
    values.push(email);
    idx++;
  }

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${idx}`);
    values.push(hashed);
    idx++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update." });
  }

  // Add the WHERE condition
  values.push(userId);

  const query = `
    UPDATE users
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING id, email, created_at, updated_at;
  `;

  const { rows } = await pool.query(query, values);

  res.json({ user: rows[0] });
};
