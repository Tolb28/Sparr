import { Request, Response } from "express";
import { pool } from "../db";

async function getProfileIdForUser(userId: number) {
  const { rows } = await pool.query("SELECT id_profiles FROM profiles WHERE user_id=$1", [userId]);
  return rows[0]?.id_profiles || null;
}

export const createCalendar = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { title, privacy } = req.body;
    const profileId = await getProfileIdForUser(userId);

    const { rows } = await pool.query(
      `INSERT INTO training_calendar (title, id_created_by, privacy) VALUES ($1,$2,$3) RETURNING *`,
      [title, profileId, privacy || null]
    );

    res.status(201).json({ calendar: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const addTrainingToCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const { id_trainings, order, icon_name } = req.body;
    if (!id_trainings) return res.status(400).json({ error: "Missing training id" });
    const { rows } = await pool.query(
      `INSERT INTO training_calendar_trainings (id_training_calendar, id_trainings, "order", icon_name) VALUES ($1,$2,$3,$4) RETURNING *`,
      [calId, id_trainings, order || null, icon_name || null]
    );
    res.status(201).json({ item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const { title, privacy } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (title !== undefined) {
      updates.push(`title = $${idx}`);
      values.push(title);
      idx++;
    }
    if (privacy !== undefined) {
      updates.push(`privacy = $${idx}`);
      values.push(privacy);
      idx++;
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(calId);
    const { rows } = await pool.query(`UPDATE training_calendar SET ${updates.join(", ")}, updated_at = NOW() WHERE id_training_calendar = $${idx} RETURNING *`, values);
    res.json({ calendar: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM training_calendar_trainings WHERE id_training_calendar = $1", [calId]);
    await pool.query("DELETE FROM training_calendar WHERE id_training_calendar = $1", [calId]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTrainingFromCalendar = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId as string, 10);
    await pool.query("DELETE FROM training_calendar_trainings WHERE id_training_calendar_trainings = $1", [itemId]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT * FROM training_calendar WHERE id_training_calendar=$1", [calId]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const calendar = rows[0];

    const { rows: items } = await pool.query(
      `SELECT tct.*, tr.* FROM training_calendar_trainings tct JOIN trainings tr ON tct.id_trainings = tr.id_trainings WHERE tct.id_training_calendar = $1 ORDER BY tct."order" ASC`,
      [calId]
    );

    res.json({ calendar, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const listPublicCalendars = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM training_calendar WHERE privacy = 'public' ORDER BY id_training_calendar ASC");
    res.json({ calendars: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const selectCalendarForProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const calId = parseInt(req.params.id as string, 10);
    const profileId = await getProfileIdForUser(userId);
    if (!profileId) return res.status(400).json({ error: "Profile required" });

    // Upsert into profiles_training_calendar
    await pool.query(
      `DELETE FROM profiles_training_calendar WHERE profiles_id_profiles = $1`,
      [profileId]
    );
    const { rows } = await pool.query(
      `INSERT INTO profiles_training_calendar (profiles_id_profiles, training_calendar_id_training_calendar, visibility) VALUES ($1,$2,$3) RETURNING *`,
      [profileId, calId, 'private']
    );

    res.json({ selected: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSelectedCalendarForProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const profileId = await getProfileIdForUser(userId);
    if (!profileId) return res.status(404).json({ error: "Profile not found" });

    const { rows } = await pool.query(
      `SELECT tc.* FROM profiles_training_calendar ptc JOIN training_calendar tc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar WHERE ptc.profiles_id_profiles = $1 LIMIT 1`,
      [profileId]
    );

    if (!rows[0]) return res.json({ calendar: null });

    const cal = rows[0];
    const { rows: items } = await pool.query(
      `SELECT tct.*, tr.* FROM training_calendar_trainings tct JOIN trainings tr ON tct.id_trainings = tr.id_trainings WHERE tct.id_training_calendar = $1 ORDER BY tct."order" ASC`,
      [cal.id_training_calendar]
    );

    res.json({ calendar: cal, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
