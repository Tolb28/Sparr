import { Request, Response } from "express";
import { pool } from "../config/db";

export const getProfileReferences = async (_req: Request, res: Response) => {
  try {
    const [boxingStylesResult, weightClassesResult] = await Promise.all([
      pool.query("SELECT id_boxing_style, title_style FROM boxing_style ORDER BY id_boxing_style ASC"),
      pool.query("SELECT id_weight_class, title_weight FROM weight_class ORDER BY id_weight_class ASC"),
    ]);

    res.json({
      boxing_styles: boxingStylesResult.rows,
      weight_classes: weightClassesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
