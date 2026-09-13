import express from "express";
import {createTask , getTasks , getTaskById , acceptTask , completeTask , cancelTask , getMyPostedTasks , getMyAcceptedTasks} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import createTaskSchema from "../validators/taskValidator.js";
import validate from "../middleware/validateMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, validate(createTaskSchema), createTask)
        .get("/",getTasks)
        .get("/my/posted", authMiddleware, getMyPostedTasks)//put before :id so express default routing doesn't treat "my" as an id
        // rule is to put specific routes before generic ones, otherwise express will treat "my" as an id and will not reach the getMyPostedTasks route
        .get("/my/accepted", authMiddleware, getMyAcceptedTasks)
        .get("/:id", getTaskById)
        .patch("/:id/accept", authMiddleware, acceptTask)
        .patch("/:id/complete", authMiddleware, completeTask)
        .patch("/:id/cancel", authMiddleware,  cancelTask)

export default router;
