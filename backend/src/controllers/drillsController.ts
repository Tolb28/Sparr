import { Request, Response } from "express";
import { pool } from "../config/db";
import cloudinary from "cloudinary";
import { cloudinaryService } from "../services/cloudinaryService";

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
    // 1. Map through the rows to add the new property
    const drillsWithUrls = rows.map((drill) => ({
      ...drill,                               // Keep all original database columns
      source_url: drill.source ? cloudinaryService.generateDrillUrl(`${drill.source}/preview`) : undefined,
      video_url: drill.source ? cloudinaryService.generateVideoUrl(`${drill.source}/video`) : undefined,
    }));
    console.log('Drills with URLs:', drillsWithUrls);

    // 2. Return the new, updated array
    res.json({ drills: drillsWithUrls });
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
    const drill = rows[0];
    if (drill.source) drill.video_url = cloudinaryService.generateVideoUrl(`${drill.source}/video`);
    res.json({ drill });
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

export const getDrillsGrouped = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        d.*,
        COALESCE(c.name, 'Unclassified') as category_name
      FROM drills d
      LEFT JOIN category c ON d.category_id_category = c.id_category
      ORDER BY COALESCE(c.name, 'Unclassified') ASC, d.id_drills ASC
    `);

    // Group by category
    const grouped: { [key: string]: any[] } = {};
    rows.forEach((drill) => {
      const catName = drill.category_name;
      if (drill.source) {
        drill.source_url = cloudinaryService.generateDrillUrl(`${drill.source}/preview`);
        drill.video_url = cloudinaryService.generateVideoUrl(`${drill.source}/video`);
      }
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(drill);
      console.log("drill source_url: ", drill.source_url);
    });

    // Convert to array of {categoryName, items}
    const result = Object.entries(grouped).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));

    res.json({ grouped: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getDrillPreview = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT source FROM drills WHERE id_drills=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Drill not found" });

    const source = rows[0].source;
    if (!source) return res.status(404).json({ error: "No preview available" });

    // source is the Cloudinary public_id (e.g., "drills/1")
    // Add /preview suffix to get the actual preview public_id
    const previewPublicId = `${source}/preview`;
    // Generate the Cloudinary URL via cloudinaryService
    const cloudinaryUrl = cloudinaryService.generateDrillUrl(previewPublicId);
    
    res.json({ url: cloudinaryUrl });
  } catch (err) {
    console.error('Error in getDrillPreview:', err);
    res.status(500).json({ error: "Server error" });
  }
};
