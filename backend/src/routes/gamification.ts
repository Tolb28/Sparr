import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  completeChallengeController,
  getBadgeCatalogController,
  getChallengeDetailsController,
  getHoursBreakdownController,
  getSessionsBreakdownController,
  listChallengesController,
  getProfileBadgesController,
  getProfileProgressController,
  logWorkoutCompletionController,
  recalculateProfileController,
  startChallengeController,
  updateChallengeProgressController,
} from '../controllers/gamificationController';

const router = Router();

router.get('/badges/catalog', authenticate, getBadgeCatalogController);
router.get('/profiles/:profileId/badges', authenticate, getProfileBadgesController);
router.get('/profiles/:profileId/progress', authenticate, getProfileProgressController);
router.get('/profiles/:profileId/hours-breakdown', authenticate, getHoursBreakdownController);
router.get('/profiles/:profileId/sessions-breakdown', authenticate, getSessionsBreakdownController);
router.post('/recalculate/:profileId', authenticate, recalculateProfileController);
router.post('/complete', authenticate, logWorkoutCompletionController);
router.get('/challenges', authenticate, listChallengesController);
router.get('/challenges/:challengeId', authenticate, getChallengeDetailsController);
router.post('/challenges/:challengeId/start', authenticate, startChallengeController);
router.post('/challenges/:challengeId/progress', authenticate, updateChallengeProgressController);
router.post('/challenges/:challengeId/complete', authenticate, completeChallengeController);

export default router;
