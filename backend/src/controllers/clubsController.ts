import { Request, Response } from 'express';
import {
  addClubTrainingToSelectedCalendar,
  copyClubTrainingPlan,
  createClub,
  createClubCalendarFull,
  createClubPost,
  createClubTraining,
  createClubTrainingPlan,
  createJoinRequest,
  getClubById,
  getProfileIdForUser,
  isClubAdmin,
  isClubAdminOrCoach,
  joinOpenClub,
  leaveClub,
  listClubMembers,
  listClubPosts,
  listClubTrainingPlans,
  listClubs,
  listClubTrainings,
  listJoinRequests,
  listMyClubMemberships,
  removeMember,
  reviewJoinRequest,
  updateClub,
  updateClubAvatar,
  updateClubCover,
  updateMemberRole,
} from '../services/clubsService';
import { cloudinaryController } from './cloudinaryController';

export const getClubs = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const query = (req.query.query as string) || '';
    const location = (req.query.location as string) || '';
    const joinPolicy = (req.query.joinPolicy as string) || '';
    const verifiedRaw = req.query.verified as string | undefined;
    const verified = verifiedRaw === 'true' ? true : verifiedRaw === 'false' ? false : null;

    // @ts-ignore
    const userId = req.userId;
    const profileId = userId ? await getProfileIdForUser(userId) : null;

    const clubs = await listClubs({ query, location, joinPolicy, verified, limit, offset, viewerProfileId: profileId });
    res.json({ clubs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMyClubMembershipsController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const memberships = await listMyClubMemberships(profileId);
    res.json({ memberships });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getClub = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    const profileId = userId ? await getProfileIdForUser(userId) : null;

    const club = await getClubById(clubId, profileId);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    res.json({ club });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClub = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;

    const { title, bio, location, avatar_path, cover_path, join_policy, instagram_url, website_url } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });

    const club = await createClub({
      userId,
      profileId: selectedProfileId || null,
      title: String(title).trim(),
      bio,
      location,
      avatar_path,
      cover_path,
      join_policy,
      instagram_url,
      website_url,
    });

    res.status(201).json({ club });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Profile required') return res.status(400).json({ error: 'Profile required' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchClub = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const club = await updateClub({ clubId, ...req.body });
    if (!club) return res.status(400).json({ error: 'No changes provided' });

    res.json({ club });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postJoinClub = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const result = await joinOpenClub(clubId, profileId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club requires approval') return res.status(400).json({ error: 'Club requires approval' });
    if (error?.message === 'Club not found') return res.status(404).json({ error: 'Club not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const postJoinRequest = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const result = await createJoinRequest(clubId, profileId);
    res.status(result?.autoJoined ? 200 : 201).json({ request: result });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club not found') return res.status(404).json({ error: 'Club not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const requests = await listJoinRequests(clubId);
    res.json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchJoinRequest = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    const requestId = parseInt(req.params.requestId || '', 10);
    const status = req.body?.status;

    if (!clubId || !requestId) return res.status(400).json({ error: 'Invalid identifiers' });
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const request = await reviewJoinRequest({
      clubId,
      requestId,
      status,
      reviewerProfileId: profileId,
    });

    if (!request) return res.status(404).json({ error: 'Join request not found' });
    res.json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getClubTrainingsController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    const trainings = await listClubTrainings(clubId);
    res.json({ trainings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClubTraining = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const { title, starts_at } = req.body;
    if (!title || !starts_at) return res.status(400).json({ error: 'title and starts_at are required' });

    const training = await createClubTraining({
      clubId,
      title,
      description: req.body?.description,
      starts_at,
      ends_at: req.body?.ends_at,
      coach_profile_id: req.body?.coach_profile_id,
      capacity: req.body?.capacity,
      location_text: req.body?.location_text,
      id_trainings: req.body?.id_trainings,
      created_by_profile_id: profileId,
    });

    res.status(201).json({ training });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addClubTrainingToCalendar = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    const clubTrainingId = parseInt(req.params.trainingId || '', 10);
    if (!clubId || !clubTrainingId) return res.status(400).json({ error: 'Invalid identifiers' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const item = await addClubTrainingToSelectedCalendar({ clubId, clubTrainingId, profileId });
    res.status(201).json({ item });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club training not found') return res.status(404).json({ error: 'Club training not found' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClubAvatar = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    // @ts-ignore
    const avatarFile = req.files?.find((f: any) => f.fieldname === 'avatar');
    if (!avatarFile) return res.status(400).json({ error: 'Avatar file is required' });

    const result = await cloudinaryController.changeClubAvatar(clubId, avatarFile.path, avatarFile.mimetype);
    const club = await updateClubAvatar(clubId, result.public_id);

    res.status(201).json({ club });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Server error' });
  }
};

export const postClubCover = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    // @ts-ignore
    const coverFile = req.files?.find((f: any) => f.fieldname === 'cover');
    if (!coverFile) return res.status(400).json({ error: 'Cover file is required' });

    const result = await cloudinaryController.changeClubCover(clubId, coverFile.path, coverFile.mimetype);
    const club = await updateClubCover(clubId, result.public_id);

    res.status(201).json({ club });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const getClubMembersController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const members = await listClubMembers(clubId, limit, offset);
    res.json({ members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchClubMember = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    const targetProfileId = parseInt(req.params.profileId || '', 10);
    if (!clubId || !targetProfileId) return res.status(400).json({ error: 'Invalid identifiers' });

    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const member = await updateMemberRole(clubId, targetProfileId, role);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    res.json({ member });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Invalid role') return res.status(400).json({ error: 'Invalid role' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteClubMember = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    const targetProfileId = parseInt(req.params.profileId || '', 10);
    if (!clubId || !targetProfileId) return res.status(400).json({ error: 'Invalid identifiers' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const admin = await isClubAdmin(clubId, profileId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    const removed = await removeMember(clubId, targetProfileId, profileId);
    if (!removed) return res.status(404).json({ error: 'Member not found' });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Cannot remove owner') return res.status(403).json({ error: 'Cannot remove owner' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const leaveClubController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const left = await leaveClub(clubId, profileId);
    if (!left) return res.status(404).json({ error: 'Not a member of this club' });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Owner cannot leave the club') return res.status(403).json({ error: 'Owner cannot leave the club' });
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Club posts
// ---------------------------------------------------------------------------

export const getClubPostsController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    const profileId = userId ? await getProfileIdForUser(userId) : null;

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const posts = await listClubPosts(clubId, profileId, limit, offset);
    res.json({ posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClubPostController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const canPost = await isClubAdminOrCoach(clubId, profileId);
    if (!canPost) return res.status(403).json({ error: 'Forbidden' });

    const { description, source } = req.body;
    const post = await createClubPost(clubId, description ?? null, source ?? null);
    res.status(201).json({ post });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club has no profile') return res.status(400).json({ error: 'Club has no profile' });
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Club training plans
// ---------------------------------------------------------------------------

export const getClubTrainingPlansController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    const plans = await listClubTrainingPlans(clubId);
    res.json({ plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClubTrainingPlanController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const canPost = await isClubAdminOrCoach(clubId, profileId);
    if (!canPost) return res.status(403).json({ error: 'Forbidden' });

    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    const plan = await createClubTrainingPlan(clubId, String(title).trim());
    res.status(201).json({ plan });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club has no profile') return res.status(400).json({ error: 'Club has no profile' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const copyClubTrainingPlanController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    const planId = parseInt(req.params.planId || '', 10);
    if (!clubId || !planId) return res.status(400).json({ error: 'Invalid identifiers' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const plan = await copyClubTrainingPlan(clubId, planId, profileId);
    res.status(201).json({ plan });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Plan not found') return res.status(404).json({ error: 'Plan not found' });
    if (error?.message === 'Club has no profile') return res.status(400).json({ error: 'Club has no profile' });
    res.status(500).json({ error: 'Server error' });
  }
};

export const postClubCalendarFullController = async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId || '', 10);
    if (!clubId) return res.status(400).json({ error: 'Invalid club id' });

    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // @ts-ignore
    const selectedProfileId = req.profileId;
    const profileId = selectedProfileId || (await getProfileIdForUser(userId));
    if (!profileId) return res.status(400).json({ error: 'Profile required' });

    const canPost = await isClubAdminOrCoach(clubId, profileId);
    if (!canPost) return res.status(403).json({ error: 'Forbidden' });

    const { title, calendar_type, num_weeks, order_start_date, slots } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    if (!Array.isArray(slots) || slots.length === 0) return res.status(400).json({ error: 'slots are required' });

    const calendar = await createClubCalendarFull({
      clubId,
      title: String(title).trim(),
      calendarType: calendar_type || 'order',
      numWeeks: num_weeks,
      orderStartDate: order_start_date,
      slots,
      createdByProfileId: profileId,
    });

    res.status(201).json({ calendar });
  } catch (error: any) {
    console.error(error);
    if (error?.message === 'Club has no profile') return res.status(400).json({ error: 'Club has no profile' });
    res.status(500).json({ error: 'Server error' });
  }
};
