import { Router } from "express";
import { register, login, getUser, updateUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user", authenticate, getUser);
router.put("/user", authenticate, updateUser);

export default router;
