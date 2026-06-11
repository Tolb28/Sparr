import { Request, Response } from 'express';
import {
  getBadgeCatalog,
  getProfileBadges,
  getProfileIdForUser,
  getHoursBreakdown,
  getSessionsBreakdown,
  logWorkoutCompletion,
  recalculateProfileGamification,
} from '../services/gamificationService';
import {
  completeChallengeForProfile,
  getChallengeForProfile,
  listChallengesForProfile,
  logManualChallengeProgressForProfile,
  startChallengeForProfile,
} from '../services/challengeService';
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
    const activeProfileId = (req as any).profileId;
    const profileId = activeProfileId ?? (await getProfileIdForUser(userId));
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
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

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
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

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

export const getHoursBreakdownController = async (req: Request, res: Response) => {
  try {
    const profileId = validateProfileIdParam(req);
    // @ts-ignore
    const userId = req.userId;
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const validRanges = ['week', 'month', 'year', 'lifetime'];
    const range = validRanges.includes(req.query.range as string)
      ? (req.query.range as 'week' | 'month' | 'year' | 'lifetime')
      : 'month';

    const breakdown = await getHoursBreakdown(profileId, range);
    res.json({ range, breakdown });
  } catch (error) {
    handleError(error, res);
  }
};

export const getSessionsBreakdownController = async (req: Request, res: Response) => {
  try {
    const profileId = validateProfileIdParam(req);
    // @ts-ignore
    const userId = req.userId;
    if (!userId) {
      throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const validRanges = ['week', 'month', 'year', 'lifetime'];
    const range = validRanges.includes(req.query.range as string)
      ? (req.query.range as 'week' | 'month' | 'year' | 'lifetime')
      : 'week';
    const rawOffset = Number(req.query.offset ?? 0);
    const offsetDays = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const breakdown = await getSessionsBreakdown(profileId, range, offsetDays);
    res.json({ range, breakdown });
  } catch (error) {
    handleError(error, res);
  }
};

async function resolveOwnProfileId(req: Request): Promise<number> {
  // @ts-ignore
  const userId = req.userId;
  if (!userId) {
    throw createError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  // @ts-ignore
  const activeProfileId = (req as any).profileId;
  const ownProfileId = activeProfileId ?? (await getProfileIdForUser(userId));
  if (!ownProfileId) {
    throw createError(400, 'Profile required', 'INVALID_INPUT');
  }
  return ownProfileId;
}

function validateChallengeId(req: Request): number {
  const challengeId = Number(req.params.challengeId);
  if (!Number.isInteger(challengeId) || challengeId <= 0) {
    throw createError(400, 'Invalid challenge ID', 'INVALID_INPUT');
  }
  return challengeId;
}

export const listChallengesController = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveOwnProfileId(req);
    const challenges = await listChallengesForProfile(profileId);
    res.json({ challenges });
  } catch (error) {
    handleError(error, res);
  }
};

export const getChallengeDetailsController = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveOwnProfileId(req);
    const challengeId = validateChallengeId(req);
    const challenge = await getChallengeForProfile(profileId, challengeId);
    if (!challenge) {
      throw createError(404, 'Challenge not found', 'CHALLENGE_NOT_FOUND');
    }
    res.json({ challenge });
  } catch (error) {
    handleError(error, res);
  }
};

export const startChallengeController = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveOwnProfileId(req);
    const challengeId = validateChallengeId(req);
    const result = await startChallengeForProfile(profileId, challengeId);
    res.json({
      challenge: result.challenge,
      newly_awarded_badge: result.newlyAwardedBadge,
    });
  } catch (error) {
    handleError(error, res);
  }
};

export const updateChallengeProgressController = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveOwnProfileId(req);
    const challengeId = validateChallengeId(req);
    const requirementId = Number(req.body?.requirement_id);
    const increment = Number(req.body?.increment);

    if (!Number.isInteger(requirementId) || requirementId <= 0) {
      throw createError(400, 'Invalid requirement ID', 'INVALID_INPUT');
    }
    if (!Number.isInteger(increment) || increment <= 0) {
      throw createError(400, 'Increment must be a positive integer', 'INVALID_INPUT');
    }

    const result = await logManualChallengeProgressForProfile(profileId, challengeId, requirementId, increment);
    res.json({
      challenge: result.challenge,
      newly_awarded_badge: result.newlyAwardedBadge,
    });
  } catch (error) {
    handleError(error, res);
  }
};

export const completeChallengeController = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveOwnProfileId(req);
    const challengeId = validateChallengeId(req);
    const result = await completeChallengeForProfile(profileId, challengeId);
    res.json({
      challenge: result.challenge,
      newly_awarded_badge: result.newlyAwardedBadge,
    });
  } catch (error) {
    handleError(error, res);
  }
};
