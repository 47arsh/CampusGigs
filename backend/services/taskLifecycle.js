import mongoose from "mongoose";
import Task from "../models/Task.js";
import { createAndEmitNotification } from "./notificationService.js";
import { logger } from "../utils/logger.js";

// Submissions left unconfirmed by the poster are auto-completed on the next read
// instead of running a background job.
const AUTO_CONFIRM_MS = 72 * 60 * 60 * 1000;
const SWEEP_LIMIT = 20;

const autoConfirmStaleTasks = async ({ io } = {}) => {
    const cutoff = new Date(Date.now() - AUTO_CONFIRM_MS);

    let staleTasks;

    try {
        staleTasks = await Task.find({
            status: "submitted",
            submittedAt: mongoose.trusted({ $lte: cutoff })
        })
            .select("_id")
            .limit(SWEEP_LIMIT);
    } catch (error) {
        logger.error("Failed to query stale submitted tasks", {
            name: error.name,
            message: error.message
        });
        return;
    }

    for (const staleTask of staleTasks) {
        try {
            const confirmedTask = await Task.findOneAndUpdate(
                {
                    _id: staleTask._id,
                    status: "submitted",
                    submittedAt: mongoose.trusted({ $lte: cutoff })
                },
                { status: "completed" },
                { returnDocument: "after" }
            );

            if (!confirmedTask || !confirmedTask.assignedTo) {
                continue;
            }

            await createAndEmitNotification({
                recipient: confirmedTask.assignedTo,
                type: "task_completed",
                message: `The task "${confirmedTask.title}" was auto-completed after 72 hours without poster confirmation.`,
                task: confirmedTask._id,
                io
            });
        } catch (error) {
            logger.error("Failed to auto-confirm a submitted task", {
                task: staleTask._id.toString(),
                name: error.name,
                message: error.message
            });
        }
    }
};

export { autoConfirmStaleTasks, AUTO_CONFIRM_MS };
