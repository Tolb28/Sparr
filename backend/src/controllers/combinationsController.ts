import { Request, Response } from "express";
import { pool } from "../config/db";
import { cloudinaryService } from "../services/cloudinaryService";

export const createCombination = async (req: Request, res: Response) => {
  try {
    const { title, description, source, techniques } = req.body; // techniques: array of technique ids
    if (!title) return res.status(400).json({ error: "Missing title" });

    const { rows } = await pool.query(
      `INSERT INTO combinations (title, description, source) VALUES ($1,$2,$3) RETURNING *`,
      [title, description || null, source || null]
    );

    const combo = rows[0];    if (combo.source) {
      combo.source_url = cloudinaryService.generateDrillUrl(`${combo.source}/preview`);
    }
    if (Array.isArray(techniques) && techniques.length > 0) {
      const insertVals: any[] = [];
      const placeholders: string[] = [];
      techniques.forEach((t: number, i: number) => {
        insertVals.push(combo.id_combinations, t);
        placeholders.push(`($${insertVals.length - 1}, $${insertVals.length})`);
      });
      await pool.query(`INSERT INTO combinations_techniques (combinations_id_combinations, techniques_id_techniques) VALUES ${placeholders.join(",")}`, insertVals);
    }

    res.status(201).json({ combination: combo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCombinations = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM combinations ORDER BY id_combinations ASC");
    const combinationsWithUrls = rows.map((combo) => ({
      ...combo,
      source_url: combo.source ? cloudinaryService.generateDrillUrl(`${combo.source}/preview`) : undefined,
      video_url: combo.source ? cloudinaryService.generateVideoUrl(`${combo.source}/video`) : undefined,
    }));
    res.json({ combinations: combinationsWithUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCombination = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT * FROM combinations WHERE id_combinations=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });

    const combo = rows[0];
    if (combo.source) {
      combo.source_url = cloudinaryService.generateDrillUrl(`${combo.source}/preview`);
      combo.video_url = cloudinaryService.generateVideoUrl(`${combo.source}/video`);
    }

    const { rows: techRows } = await pool.query(
      `SELECT t.* FROM combinations_techniques ct JOIN techniques t ON ct.techniques_id_techniques = t.id_techniques WHERE ct.combinations_id_combinations = $1`,
      [id]
    );

    res.json({ combination: combo, techniques: techRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateCombination = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { title, description, source, techniques } = req.body;

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

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE combinations SET ${updates.join(", ")}, updated_at = NOW() WHERE id_combinations = $${idx}`, values);
    }

    if (Array.isArray(techniques)) {
      // Replace techniques
      await pool.query("DELETE FROM combinations_techniques WHERE combinations_id_combinations=$1", [id]);
      if (techniques.length > 0) {
        const insertVals: any[] = [];
        const placeholders: string[] = [];
        techniques.forEach((t: number) => {
          insertVals.push(id, t);
          placeholders.push(`($${insertVals.length - 1}, $${insertVals.length})`);
        });
        await pool.query(`INSERT INTO combinations_techniques (combinations_id_combinations, techniques_id_techniques) VALUES ${placeholders.join(",")}`, insertVals);
      }
    }

    const { rows } = await pool.query("SELECT * FROM combinations WHERE id_combinations=$1", [id]);
    res.json({ combination: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCombination = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await pool.query("DELETE FROM combinations_techniques WHERE combinations_id_combinations=$1", [id]);
    await pool.query("DELETE FROM combinations WHERE id_combinations=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCombinationsGrouped = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.*,
        COALESCE(cat.name, 'Unclassified') as category_name
      FROM combinations c
      LEFT JOIN category cat ON c.category_id_category = cat.id_category
      ORDER BY COALESCE(cat.name, 'Unclassified') ASC, c.id_combinations ASC
    `);

    // Group by category
    const grouped: { [key: string]: any[] } = {};
    rows.forEach((combo) => {
      const catName = combo.category_name;
      if (combo.source) {
        combo.source_url = cloudinaryService.generateDrillUrl(`${combo.source}/preview`);
        combo.video_url = cloudinaryService.generateVideoUrl(`${combo.source}/video`);
      }
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(combo);
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

export const getCombinationPreview = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { rows } = await pool.query("SELECT source FROM combinations WHERE id_combinations=$1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Combination not found" });

    const source = rows[0].source;
    if (!source) return res.status(404).json({ error: "No preview available" });

    // source is the Cloudinary public_id (e.g., "combinations/1")
    // Add /preview suffix to get the actual preview public_id
    const previewPublicId = `${source}/preview`;
    // Generate the Cloudinary URL via cloudinaryService
    const cloudinaryUrl = cloudinaryService.generateDrillUrl(previewPublicId);
    
    res.json({ url: cloudinaryUrl });
  } catch (err) {
    console.error('Error in getCombinationPreview:', err);
    res.status(500).json({ error: "Server error" });
  }
};
