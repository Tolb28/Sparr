import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Boxing App API is running!");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// TESTING

import { pool } from './db';

pool
  .connect()
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection failed', err));

