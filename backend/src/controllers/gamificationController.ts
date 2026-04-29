import { Request, Response } from 'express';
import {
  getBadgeCatalog,
  getProfileBadges,
  getProfileIdForUser,
  logWorkoutCompletion,
  recalculateProfileGamification,
} from '../services/gamificationService';
import { getProfileProgressCached } from '../services/cachedProgressService';
import { handleError, createError } from '../services/errorService';
import {
  validateAuthorization,
  validateProfileIdParam,
  validateRangeQuery,
} from '../middleware/validationMiddleware';

export const getBadgeCatalogController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    const profileId = await getProfileIdForUser(userId);
    if (!profileId) {
      throw createError(400, 'Profile required', 'INVALID_INPUT');
    }

    const badges = await getBadgeCatalog(profileId);
    res.json({ badges });
  } catch (error) {
    handleError(error, res);
  }
};

export const getProfileBadgesController = async (req: Request, res: Response) => {
  try {
    const profileId = validateProfileIdParam(req);
    // @ts-ignore
    const userId = req.userId;
    const isAdmin = Boolean((req as any).isAdmin);
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    const activeProfileId = (req as any).profileId;
    const ownProfileId = activeProfileId ?? (await getProfileIdForUser(userId));
    if (!ownProfileId) {
      throw createError(400, 'Profile required', 'INVALID_INPUT');
    }
    validateAuthorization(ownProfileId, profileId, isAdmin);

    const badges = await getProfileBadges(profileId);
    res.json({ badges });
  } catch (error) {
    handleError(error, res);
  }
};

export const getProfileProgressController = async (req: Request, res: Response) => {
  try {
    const profileId = validateProfileIdParam(req);
    const normalizedRange = validateRangeQuery(req);
    // @ts-ignore
    const userId = req.userId;
    const isAdmin = Boolean((req as any).isAdmin);
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    const activeProfileId = (req as any).profileId;
    const ownProfileId = activeProfileId ?? (await getProfileIdForUser(userId));
    if (!ownProfileId) {
      throw createError(400, 'Profile required', 'INVALID_INPUT');
    }
    validateAuthorization(ownProfileId, profileId, isAdmin);

    const progress = await getProfileProgressCached(profileId, normalizedRange);
    res.json(progress);
  } catch (error) {
    handleError(error, res);
  }
};

export const recalculateProfileController = async (req: Request, res: Response) => {
  try {
    const targetProfileId = validateProfileIdParam(req);

    // @ts-ignore
    const userId = req.userId;
    const isAdmin = Boolean((req as any).isAdmin);
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const activeProfileId = (req as any).profileId;
    const ownProfileId = activeProfileId ?? (await getProfileIdForUser(userId));
    if (!ownProfileId) {
      throw createError(400, 'Profile required', 'INVALID_INPUT');
    }

    validateAuthorization(ownProfileId, targetProfileId, isAdmin);

    const metrics = await recalculateProfileGamification(targetProfileId);
    res.json({ success: true, metrics });
  } catch (error) {
    handleError(error, res);
  }
};

export const logWorkoutCompletionController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const isAdmin = Boolean((req as any).isAdmin);
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    // @ts-ignore
    const activeProfileId = (req as any).profileId;
    const ownProfileId = activeProfileId ?? (await getProfileIdForUser(userId));
    if (!ownProfileId) {
      throw createError(400, 'Profile required', 'INVALID_INPUT');
    }
    validateAuthorization(ownProfileId, ownProfileId, isAdmin);

    const { training_id, duration_seconds } = req.body;

    const completion = await logWorkoutCompletion(
      ownProfileId,
      training_id ?? null,
      duration_seconds ?? null
    );

    res.json({ success: true, completion });
  } catch (error) {
    handleError(error, res);
  }
};
