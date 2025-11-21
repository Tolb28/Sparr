import { Router } from "express";
import { register, login, getUser, updateUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";
import { createProfile, updateProfile, deleteProfile, getProfile } from "../controllers/profileController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user", authenticate, getUser);
router.put("/user", authenticate, updateUser);
router.post("/profile", authenticate, createProfile); // Placeholder for profile creation/updation
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.delete("/profile", authenticate, deleteProfile);

export default router;
