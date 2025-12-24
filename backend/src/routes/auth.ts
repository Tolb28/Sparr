import { Router } from "express";
import { register, login, getUser, updateUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";
import { createProfile, updateProfile, deleteProfile, getProfile, getProfilePosts, getForeignProfile } from "../controllers/profileController";
import { getDiscoveryFeed } from "../controllers/discoveryController";
import { toggleInteraction } from "../controllers/interactionsController";
import { getFriends } from "../controllers/friendsController";
import { getProfileReferences } from "../controllers/referenceController";
import trainingRouter from "./training";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user", authenticate, getUser);
router.put("/user", authenticate, updateUser);
router.post("/profile", authenticate, createProfile); // Placeholder for profile creation/updation
router.get("/profile", authenticate, getProfile);
router.get("/profile/foreign/:id", authenticate, getForeignProfile);
router.put("/profile", authenticate, updateProfile);
router.delete("/profile", authenticate, deleteProfile);
router.get("/profile/posts/:id", authenticate, getProfilePosts);
router.get("/discovery", authenticate, getDiscoveryFeed);
router.post("/interactions", authenticate, toggleInteraction);
router.get("/friends", authenticate, getFriends);
router.get("/profile/references", authenticate, getProfileReferences); 

// Mount training routes under /auth/training
router.use('/training', trainingRouter);

export default router;
