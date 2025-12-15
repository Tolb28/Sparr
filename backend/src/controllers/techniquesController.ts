import { Request, Response } from "express";
import { pool } from "../db";

export const createTechnique = async (req: Request, res: Response) => {
  try {
    const { title, description, source } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });
    const { rows } = await pool.query(
      `INSERT INTO techniques (title, description, source) VALUES ($1,$2,$3) RETURNING *`,
      [title, description || null, source || null]
    );
    res.status(201).json({ technique: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTechniques = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM techniques ORDER BY id_techniques ASC");
    res.json({ techniques: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTechnique = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT * FROM techniques WHERE id_techniques=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ technique: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateTechnique = async (req: Request, res: Response) => {
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
    const query = `UPDATE techniques SET ${updates.join(", ")}, updated_at = NOW() WHERE id_techniques = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    res.json({ technique: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTechnique = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM techniques WHERE id_techniques=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
