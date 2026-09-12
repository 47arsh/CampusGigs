import express from "express";
import {createTask , getTasks , getTaskById} from "../controllers/taskController.js";

const router = express.Router();

router.post("/", createTask)
        .get("/",getTasks)
        .get("/:id", getTaskById);

export default router;
