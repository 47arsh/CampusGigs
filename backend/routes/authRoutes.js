import express from "express";
import { registerUser , loginUser} from "../controllers/authController.js";
import validate from "../middleware/validateMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { registerSchema , loginSchema } from "../validators/authValidator.js";

const router = express.Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), registerUser);
router.post("/login", authLimiter, validate({ body: loginSchema }), loginUser);
export default router;