import express from "express";
import {
    getNotifications,
    markNotificationAsRead
} from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import validate from "../middleware/validateMiddleware.js";
import { notificationQuerySchema } from "../validators/listQueryValidator.js";
import { notificationIdSchema } from "../validators/commonValidator.js";

const router = express.Router();

router.get("/", authMiddleware, validate({ query: notificationQuerySchema }), getNotifications);
router.patch("/:id/read", authMiddleware, validate({ params: notificationIdSchema }), markNotificationAsRead);

export default router;
