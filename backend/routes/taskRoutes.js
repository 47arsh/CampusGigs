import express from "express";
import {createTask , getTasks , getTaskById , acceptTask , completeTask , cancelTask , getMyPostedTasks , getMyAcceptedTasks} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import createTaskSchema from "../validators/taskValidator.js";
import validate from "../middleware/validateMiddleware.js";
import taskIdSchema from "../validators/commonValidator.js";
import taskQuerySchema from "../validators/taskQueryValidator.js";

const router = express.Router();

router.post("/", authMiddleware, validate({
        body: createTaskSchema
    }), createTask)
    .get("/", validate({
        query: taskQuerySchema
    }), getTasks)
    .get("/my/posted", authMiddleware, getMyPostedTasks)//put before :id so express default routing doesn't treat "my" as an id
    // rule is to put specific routes before generic ones, otherwise express will treat "my" as an id and will not reach the getMyPostedTasks route
    .get("/my/accepted", authMiddleware, getMyAcceptedTasks)
    .get("/:id", validate({
        params: taskIdSchema
    }) ,getTaskById)
        .patch("/:id/accept", authMiddleware, validate({
            params: taskIdSchema
        }), acceptTask)
        .patch("/:id/complete", authMiddleware, validate({
            params: taskIdSchema
        }), completeTask)
        .patch("/:id/cancel", authMiddleware, validate({
            params: taskIdSchema
        }), cancelTask)

export default router;
