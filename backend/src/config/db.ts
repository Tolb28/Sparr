// src/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
