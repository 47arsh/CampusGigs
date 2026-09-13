import express from "express";
import {createTask , getTasks , getTaskById , acceptTask} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/",authMiddleware ,createTask)
        .get("/",getTasks)
        .get("/:id", getTaskById)
        .patch("/:id/accept", authMiddleware, acceptTask);

export default router;
