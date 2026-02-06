import { Request, Response } from "express";
import { pool } from "../config/db";
import { cloudinaryService } from "../services/cloudinaryService";

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
    const techniquesWithUrls = rows.map((tech: any) => ({
      ...tech,
      source_url: tech.source ? cloudinaryService.generateDrillUrl(`${tech.source}/preview`) : undefined,
      video_url: tech.source ? cloudinaryService.generateVideoUrl(`${tech.source}/video`) : undefined,
    }));
    res.json({ techniques: techniquesWithUrls });
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
    const technique = rows[0];
    if (technique.source) technique.video_url = cloudinaryService.generateVideoUrl(`${technique.source}/video`);
    res.json({ technique });
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

export const getTechniquesGrouped = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        t.*,
        COALESCE(c.name, 'Unclassified') as category_name
      FROM techniques t
      LEFT JOIN category c ON t.category_id_category = c.id_category
      ORDER BY COALESCE(c.name, 'Unclassified') ASC, t.id_techniques ASC
    `);

    // Group by category
    const grouped: { [key: string]: any[] } = {};
    rows.forEach((tech) => {
      const catName = tech.category_name;
      if (tech.source) {
        tech.source_url = cloudinaryService.generateDrillUrl(`${tech.source}/preview`);
        tech.video_url = cloudinaryService.generateVideoUrl(`${tech.source}/video`);
      }
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(tech);
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

export const getTechniquePreview = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT source FROM techniques WHERE id_techniques=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Technique not found" });

    const source = rows[0].source;
    if (!source) return res.status(404).json({ error: "No preview available" });

    // source is the Cloudinary public_id (e.g., "techniques/1")
    // Add /preview suffix to get the actual preview public_id
    const previewPublicId = `${source}/preview`;
    // Generate the Cloudinary URL via cloudinaryService
    const cloudinaryUrl = cloudinaryService.generateDrillUrl(previewPublicId);
    
    res.json({ url: cloudinaryUrl });
  } catch (err) {
    console.error('Error in getTechniquePreview:', err);
    res.status(500).json({ error: "Server error" });
  }
};
