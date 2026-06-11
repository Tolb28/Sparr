import "./config/env"; // must be first — loads dotenv before any other imports
import express from "express";
import cors from "cors";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import authRouter from "./routes/auth";

// TESTING DATABASE CONNECTION

import { pool } from './config/db';

pool
  .connect()
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection failed', err));

// END TESTING DATABASE CONNECTION

const app = express();
app.use(cors());
// Only parse JSON for non-multipart requests
app.use(express.json());
// For file uploads, we let multer handle the body parsing in the routes

app.get("/", (req, res) => res.send("Boxing App API is running!"));
app.use("/api/auth", authRouter);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


