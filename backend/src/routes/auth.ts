import { Router } from "express";
import multer from "multer";
import { register, login, getUser, updateUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";
import { createProfile, updateProfile, deleteProfile, getProfile, getProfilePosts, getForeignProfile } from "../controllers/profileController";
import { getCommentsForPost, getDiscoveryFeed } from "../controllers/discoveryController";
import { createCommentHandler } from "../controllers/commentsController";
import { toggleInteraction } from "../controllers/interactionsController";
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest, checkFriendStatus, sendFriendRequest, unfriend } from "../controllers/friendsController";
import { getProfileReferences } from "../controllers/referenceController";
import { createPostHandler } from "../controllers/postsController";
import trainingRouter from "./training";
import chatRouter from "./chat";

const router = Router();

// Configure multer for temporary file uploads (Cloudinary will handle final storage)
// Specify fields to capture image and video separately
const upload = multer({ dest: '/tmp' });
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

router.post("/register", register);
router.post("/login", login);
router.get("/user", authenticate, getUser);
router.put("/user", authenticate, updateUser);
router.post("/profile", authenticate, upload.any(), createProfile); // File upload for avatar
router.get("/profile", authenticate, getProfile);
router.get("/profile/references", authenticate, getProfileReferences);
router.get("/profile/foreign/:id", authenticate, getForeignProfile);
router.put("/profile", authenticate, upload.any(), updateProfile);
router.delete("/profile", authenticate, deleteProfile);
router.get("/profile/posts/:id", authenticate, getProfilePosts);
router.get("/discovery", authenticate, getDiscoveryFeed);
router.post("/comments", authenticate, createCommentHandler);
router.get("/discovery/:postId/comments", authenticate, getCommentsForPost);
router.post("/interactions", authenticate, toggleInteraction);
router.get("/friends", authenticate, getFriends);
router.get("/friends/requests/pending", authenticate, getPendingRequests);
router.get("/friends/status/:targetProfileId", authenticate, checkFriendStatus);
router.post("/friends/request/:targetProfileId", authenticate, sendFriendRequest);
router.put("/friends/requests/:friendRequestId/accept", authenticate, acceptFriendRequest);
router.delete("/friends/requests/:friendRequestId/decline", authenticate, declineFriendRequest);
router.delete("/friends/:targetProfileId", authenticate, unfriend);
router.post("/posts", authenticate, uploadFields, createPostHandler);

// Mount training routes under /auth/training
router.use('/training', trainingRouter);

// Mount chat routes under /auth/chat
router.use('/chat', chatRouter);

export default router;
