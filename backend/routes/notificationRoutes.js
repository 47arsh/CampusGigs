import express from "express";
import {
    getNotifications,
    markNotificationAsRead
} from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import validate from "../middleware/validateMiddleware.js";
import { notificationQuerySchema } from "../validators/listQueryValidator.js";

const router = express.Router();

router.get("/", authMiddleware, validate({ query: notificationQuerySchema }), getNotifications);
router.patch("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
