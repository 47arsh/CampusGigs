import express from "express";
import {createTask , getTasks , getTaskById} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/",authMiddleware ,createTask)
        .get("/",getTasks)
        .get("/:id", getTaskById);

export default router;
