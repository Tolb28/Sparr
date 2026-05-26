import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authMiddleware';
import {
  addClubTrainingToCalendar,
  copyClubTrainingPlanController,
  deleteClubMember,
  getClub,
  getClubMembersController,
  getClubPostsController,
  getClubSelectedCalendarController,
  getClubTrainingPlansController,
  getClubTrainingsController,
  getClubs,
  getJoinRequests,
  getMyClubMembershipsController,
  leaveClubController,
  patchClub,
  patchClubMember,
  patchJoinRequest,
  postClub,
  postClubAvatar,
  postClubCalendarFullController,
  postClubCover,
  postClubPostController,
  postClubTraining,
  postClubTrainingPlanController,
  postJoinClub,
  postJoinRequest,
  selectClubCalendarController,
} from '../controllers/clubsController';

const router = Router();
const upload = multer({ dest: '/tmp' });

router.get('/', authenticate, getClubs);
router.get('/memberships/me', authenticate, getMyClubMembershipsController);
router.get('/:clubId', authenticate, getClub);
router.post('/', authenticate, postClub);
router.patch('/:clubId', authenticate, patchClub);
router.post('/:clubId/avatar', authenticate, upload.any(), postClubAvatar);
router.post('/:clubId/cover', authenticate, upload.any(), postClubCover);

router.post('/:clubId/join', authenticate, postJoinClub);
router.post('/:clubId/join-requests', authenticate, postJoinRequest);
router.get('/:clubId/join-requests', authenticate, getJoinRequests);
router.patch('/:clubId/join-requests/:requestId', authenticate, patchJoinRequest);

router.get('/:clubId/members', authenticate, getClubMembersController);
router.patch('/:clubId/members/:profileId', authenticate, patchClubMember);
router.delete('/:clubId/members/:profileId', authenticate, deleteClubMember);
router.delete('/:clubId/leave', authenticate, leaveClubController);

router.get('/:clubId/trainings', authenticate, getClubTrainingsController);
router.post('/:clubId/trainings', authenticate, postClubTraining);
router.post('/:clubId/trainings/:trainingId/add-to-calendar', authenticate, addClubTrainingToCalendar);

router.get('/:clubId/posts', authenticate, getClubPostsController);
router.post('/:clubId/posts', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), postClubPostController);

router.get('/:clubId/training-plans', authenticate, getClubTrainingPlansController);
router.post('/:clubId/training-plans', authenticate, postClubTrainingPlanController);
router.post('/:clubId/training-plans/full', authenticate, postClubCalendarFullController);
router.post('/:clubId/training-plans/:planId/copy', authenticate, copyClubTrainingPlanController);

router.post('/:clubId/calendars/:calendarId/select', authenticate, selectClubCalendarController);
router.get('/:clubId/calendar/selected', authenticate, getClubSelectedCalendarController);

export default router;
