import express from "express";
import { chatWithAi } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import validate from "../middleware/validateMiddleware.js";
import aiChatSchema from "../validators/aiValidator.js";

const router = express.Router();

router.post("/chat", authMiddleware, validate({ body: aiChatSchema }), chatWithAi);

export default router;
