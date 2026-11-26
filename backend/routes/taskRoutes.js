import express from "express";
import {createTask , getTasks , getTaskById , acceptTask , submitTask , confirmTask , cancelTask , getMyPostedTasks , getMyAcceptedTasks} from "../controllers/taskController.js";
import { createReview } from "../controllers/reviewController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import createTaskSchema from "../validators/taskValidator.js";
import validate from "../middleware/validateMiddleware.js";
import taskIdSchema from "../validators/commonValidator.js";
import taskQuerySchema from "../validators/taskQueryValidator.js";
import { myTasksQuerySchema } from "../validators/listQueryValidator.js";
import reviewSchema from "../validators/reviewValidator.js";

const router = express.Router();

router.post("/", authMiddleware, validate({
        body: createTaskSchema
    }), createTask)
    .get("/", validate({
        query: taskQuerySchema
    }), getTasks)
    .get("/my/posted", authMiddleware, validate({
        query: myTasksQuerySchema
    }), getMyPostedTasks)//put before :id so express default routing doesn't treat "my" as an id
    // rule is to put specific routes before generic ones, otherwise express will treat "my" as an id and will not reach the getMyPostedTasks route
    .get("/my/accepted", authMiddleware, validate({
        query: myTasksQuerySchema
    }), getMyAcceptedTasks)
    .get("/:id", validate({
        params: taskIdSchema
    }) ,getTaskById)
        .patch("/:id/accept", authMiddleware, validate({
            params: taskIdSchema
        }), acceptTask)
        .patch("/:id/submit", authMiddleware, validate({
            params: taskIdSchema
        }), submitTask)
        .patch("/:id/confirm", authMiddleware, validate({
            params: taskIdSchema
        }), confirmTask)
        .patch("/:id/cancel", authMiddleware, validate({
            params: taskIdSchema
        }), cancelTask)

router.post("/:id/reviews", authMiddleware, validate({
        params: taskIdSchema,
        body: reviewSchema
    }), createReview);

export default router;
