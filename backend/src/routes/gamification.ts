import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getBadgeCatalogController,
  getProfileBadgesController,
  getProfileProgressController,
  logWorkoutCompletionController,
  recalculateProfileController,
} from '../controllers/gamificationController';

const router = Router();

router.get('/badges/catalog', authenticate, getBadgeCatalogController);
router.get('/profiles/:profileId/badges', authenticate, getProfileBadgesController);
router.get('/profiles/:profileId/progress', authenticate, getProfileProgressController);
router.post('/recalculate/:profileId', authenticate, recalculateProfileController);
router.post('/complete', authenticate, logWorkoutCompletionController);

export default router;
