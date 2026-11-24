import express from "express";
import { getUserProfile } from "../controllers/userController.js";
import validate from "../middleware/validateMiddleware.js";
import { userIdSchema } from "../validators/commonValidator.js";

const router = express.Router();

router.get("/:id/profile", validate({
    params: userIdSchema
}), getUserProfile);

export default router;
