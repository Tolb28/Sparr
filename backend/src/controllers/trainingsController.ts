import { Request, Response } from "express";
import { pool } from "../config/db";

export const createTraining = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });
    const { rows } = await pool.query(`INSERT INTO trainings (title, description) VALUES ($1,$2) RETURNING *`, [title, description || null]);
    res.status(201).json({ training: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTrainings = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM trainings ORDER BY id_trainings ASC");
    res.json({ trainings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT * FROM trainings WHERE id_trainings=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });

    const training = rows[0];
    const { rows: components } = await pool.query(
      `SELECT tc.*, d.title AS drill_title, c.title AS combination_title
       FROM trainings_components tc
       LEFT JOIN drills d ON tc.id_drills = d.id_drills
       LEFT JOIN combinations c ON tc.id_combinations = c.id_combinations
       WHERE tc.id_trainings = $1 ORDER BY tc.id_trainings_components ASC`,
      [id]
    );

    res.json({ training, components });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const addTrainingComponent = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { id_drills, id_combinations, length, reps, sets } = req.body;
    if (!id_drills && !id_combinations) return res.status(400).json({ error: "Missing component reference" });

    const { rows } = await pool.query(
      `INSERT INTO trainings_components (id_trainings, id_drills, id_combinations, length, reps, sets) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, id_drills || null, id_combinations || null, length || null, reps || null, sets || null]
    );
    res.status(201).json({ component: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { title, description } = req.body;
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
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(id);
    const { rows } = await pool.query(`UPDATE trainings SET ${updates.join(", ")}, updated_at = NOW() WHERE id_trainings = $${idx} RETURNING *`, values);
    res.json({ training: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM trainings_components WHERE id_trainings = $1", [id]);
    await pool.query("DELETE FROM trainings WHERE id_trainings = $1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateTrainingComponent = async (req: Request, res: Response) => {
  try {
    const compId = parseInt(req.params.compId as string, 10);
    const { length, reps, sets } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (length !== undefined) {
      updates.push(`length = $${idx}`);
      values.push(length);
      idx++;
    }
    if (reps !== undefined) {
      updates.push(`reps = $${idx}`);
      values.push(reps);
      idx++;
    }
    if (sets !== undefined) {
      updates.push(`sets = $${idx}`);
      values.push(sets);
      idx++;
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(compId);
    const { rows } = await pool.query(`UPDATE trainings_components SET ${updates.join(", ")}, updated_at = NOW() WHERE id_trainings_components = $${idx} RETURNING *`, values);
    res.json({ component: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTrainingComponent = async (req: Request, res: Response) => {
  try {
    const compId = parseInt(req.params.compId as string, 10);
    await pool.query("DELETE FROM trainings_components WHERE id_trainings_components=$1", [compId]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
