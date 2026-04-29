import { Request } from 'express';

export function validateProfileIdParam(req: Request): number {
  const profileId = parseInt(req.params.profileId || '', 10);
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw { statusCode: 400, message: 'Invalid profile ID' };
  }
  return profileId;
}

export function validateRangeQuery(req: Request): string {
  const range = String(req.query.range || 'week').toLowerCase();
  const normalized = range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range;
  if (!['week', 'month', 'year', 'lifetime'].includes(normalized)) {
    throw { statusCode: 400, message: 'Invalid range' };
  }
  return normalized;
}

export function validateAuthorization(
  userId: unknown,
  targetProfileId: number,
  isAdmin?: boolean
) {
  if (!userId) {
    throw { statusCode: 401, message: 'Unauthorized' };
  }
  if (Number(userId) !== targetProfileId && !isAdmin) {
    throw { statusCode: 403, message: 'Forbidden: cannot access other profile' };
  }
}
