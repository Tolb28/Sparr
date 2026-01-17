import { Request, Response } from "express";
import { pool } from "../config/db";

export const createDrill = async (req: Request, res: Response) => {
  try {
    const { title, description, source } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });

    const { rows } = await pool.query(
      `INSERT INTO drills (title, description, source) VALUES ($1,$2,$3) RETURNING *`,
      [title, description || null, source || null]
    );

    res.status(201).json({ drill: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getDrills = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM drills ORDER BY id_drills ASC");
    res.json({ drills: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getDrill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT * FROM drills WHERE id_drills=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ drill: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateDrill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { title, description, source } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push(`title = $${idx}`);
      values.push(title);
      idx++;
    }
    if (description !== undefined) {
      updates.push(`description = $${idx}`);
      values.push(description);
      idx++;
    }
    if (source !== undefined) {
      updates.push(`source = $${idx}`);
      values.push(source);
      idx++;
    }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(id);
    const query = `UPDATE drills SET ${updates.join(", ")}, updated_at = NOW() WHERE id_drills = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    res.json({ drill: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteDrill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM drills WHERE id_drills=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
