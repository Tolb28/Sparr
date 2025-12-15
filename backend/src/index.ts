import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import authRouter from "./routes/auth";
// training routes are mounted on /api/auth via the auth router

dotenv.config();

// TESTING DATABASE CONNECTION

import { pool } from './db';

pool
  .connect()
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection failed', err));

// END TESTING DATABASE CONNECTION

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Boxing App API is running!"));
app.use("/api/auth", authRouter);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


