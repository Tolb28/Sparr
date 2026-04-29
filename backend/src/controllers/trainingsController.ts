import { Request, Response } from "express";
import * as trainingService from "../services/trainingService";
import {
  ContentRecommendations,
  getPersonalizedContentRecommendations as getPersonalizedContentRecommendationsService,
} from "../services/contentRecommendationsService";

export const createTraining = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });
    const training = await trainingService.createTraining(title, description);
    res.status(201).json({ training });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTrainings = async (_req: Request, res: Response) => {
  try {
    const trainings = await trainingService.getTrainingSummaries();
    res.json({ trainings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const result = await trainingService.getTrainingById(id);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const addTrainingComponent = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { id_drills, id_combinations, id_techniques, length, reps, sets } = req.body;
    if (!id_drills && !id_combinations && !id_techniques)
      return res.status(400).json({ error: "Missing component reference" });

    const component = await trainingService.addComponent(id, {
      id_drills, id_combinations, id_techniques, length, reps, sets,
    });
    res.status(201).json({ component });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { title, description } = req.body;
    const training = await trainingService.updateTraining(id, { title, description });
    if (!training) return res.status(400).json({ error: "No fields to update" });
    res.json({ training });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTraining = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await trainingService.deleteTraining(id);
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
    const component = await trainingService.updateComponent(compId, { length, reps, sets });
    if (!component) return res.status(400).json({ error: "No fields to update" });
    res.json({ component });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTrainingComponent = async (req: Request, res: Response) => {
  try {
    const compId = parseInt(req.params.compId as string, 10);
    await trainingService.deleteComponent(compId);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const reorderTrainingComponents = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    await trainingService.reorderComponents(id, orderedIds);
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPersonalizedContentRecommendations = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authProfileId = req.profileId;
    const headerProfileIdRaw = req.headers['x-profile-id'];
    const headerProfileId = Array.isArray(headerProfileIdRaw)
      ? parseInt(headerProfileIdRaw[0] || '', 10)
      : parseInt((headerProfileIdRaw as string) || '', 10);

    const profileId = Number(authProfileId ?? headerProfileId);
    if (!Number.isInteger(profileId) || profileId <= 0) {
      return res.status(400).json({ success: false, error: "Profile ID required" });
    }

    const contentTypeRaw = String(req.query.contentType || 'all').toLowerCase();
    const allowedContentTypes = new Set(['all', 'techniques', 'drills', 'combinations']);
    if (!allowedContentTypes.has(contentTypeRaw)) {
      return res.status(400).json({ success: false, error: "Invalid contentType" });
    }

    const limitRaw = parseInt(String(req.query.limitPerType || req.query.limit || '8'), 10);
    const limitPerType = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;

    const includeReasonsRaw = String(req.query.includeReasons ?? 'true').toLowerCase();
    const includeReasons = includeReasonsRaw !== 'false' && includeReasonsRaw !== '0';

    const recommendations: ContentRecommendations = await getPersonalizedContentRecommendationsService(
      profileId,
      {
        contentType: contentTypeRaw as 'all' | 'techniques' | 'drills' | 'combinations',
        limitPerType,
        includeReasons,
      }
    );

    return res.json({ success: true, recommendations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
