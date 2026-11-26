import mongoose from "mongoose";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { createAndEmitNotification } from "../services/notificationService.js";
import { autoConfirmStaleTasks } from "../services/taskLifecycle.js";
import { paginationMeta } from "../utils/pagination.js";

const attachReviewState = async (tasks, userId) => {
    if (!tasks.length) {
        return tasks;
    }

    const reviews = await Review.find({
        task: mongoose.trusted({ $in: tasks.map((task) => task._id) }),
        reviewer: userId
    }).select("task");

    const reviewedTaskIds = new Set(
        reviews.map((review) => review.task.toString())
    );

    return tasks.map((task) => ({
        ...task.toObject(),
        reviewedByMe: reviewedTaskIds.has(task._id.toString())
    }));
};

const createTask = async (req, res , next) => {
    try {
        const {
            title,
            description,
            reward,
            pickupLocation,
            dropLocation
        } = req.body;

        const newTask = await Task.create({
            title,
            description,
            reward,
            pickupLocation,
            dropLocation,
            createdBy: req.user.userId
        });

        res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });

    } catch (error) {
        next(error);
    }
};

const getTasks = async (req, res, next) => {
    try {
        await autoConfirmStaleTasks({ io: req.app.get("io") });

        const { page, limit , minReward , maxReward , status } = req.query;

        const skip = (page - 1) * limit;

        const filter = {
            status
        };

        if (minReward !== undefined || maxReward !== undefined) {
            const rewardFilter = {};

            if (minReward !== undefined) {
                rewardFilter.$gte = minReward;
            }

            if (maxReward !== undefined) {
                rewardFilter.$lte = maxReward;
            }

            filter.reward = mongoose.trusted(rewardFilter);
        }

        const [tasks, totalTasks] = await Promise.all([
            Task.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .populate("createdBy", "name ratingSum ratingCount")
                .populate("assignedTo", "name"),

            Task.countDocuments(filter)
        ]);

        res.status(200).json({
            message: "Tasks fetched successfully",
            tasks,
            pagination: paginationMeta({
                page,
                limit,
                total: totalTasks,
                totalKey: "totalTasks"
            })
        });
    } catch (error) {
        next(error);
    }
};

const getTaskById = async (req, res , next) => {
    try {
        await autoConfirmStaleTasks({ io: req.app.get("io") });

        const { id } = req.params;

        const task = await Task.findById(id).populate("createdBy", "name")
                                            .populate("assignedTo", "name");

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task fetched successfully",
            task
        });
    } catch (error) {
        next(error);
    }
};

const acceptTask = async (req, res , next) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.userId;
        // Conditional update so concurrent acceptances cannot both succeed.
        const updatedTask = await Task.findOneAndUpdate(
            {
                _id: taskId,
                status: "open",
                createdBy: mongoose.trusted({ $ne: userId }) // the poster cannot accept their own task
            },
            {
                status: "accepted",
                assignedTo: userId
            },
            {
                returnDocument: "after"
            }
        );

        if (!updatedTask) {
            return res.status(400).json({
                message: "Task not found, unavailable, or cannot be accepted by the owner"
            });
        }

        const acceptingUser = await User.findById(userId).select("name");
        await createAndEmitNotification({
            recipient: updatedTask.createdBy,
            type: "task_accepted",
            message: `${acceptingUser?.name || "A student"} accepted your task.`,
            task: updatedTask._id,
            io: req.app.get("io")
        });

        res.status(200).json({
            message: "Task accepted successfully",
            task: updatedTask
        });

    } catch (error) {
        next(error);
    }
};

const submitTask = async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.userId;

        const updatedTask = await Task.findOneAndUpdate({
            _id: taskId,
            status: "accepted",
            assignedTo: userId
        }, {
            status: "submitted",
            submittedAt: new Date()
        }, {
            returnDocument: "after"
        });

        if (!updatedTask) {
            return res.status(400).json({
                message: "Task not found, unavailable, or cannot be submitted by the user"
            });
        }

        const submittingUser = await User.findById(userId).select("name");
        await createAndEmitNotification({
            recipient: updatedTask.createdBy,
            type: "task_submitted",
            message: `${submittingUser?.name || "A student"} submitted the task "${updatedTask.title}" for your confirmation.`,
            task: updatedTask._id,
            io: req.app.get("io")
        });

        res.status(200).json({
            message: "Task submitted for confirmation",
            task: updatedTask
        });
    }
    catch(error){
        next(error);
    }
}

const confirmTask = async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.userId;

        const updatedTask = await Task.findOneAndUpdate({
            _id: taskId,
            status: "submitted",
            createdBy: userId
        }, {
            status: "completed"
        }, {
            returnDocument: "after"
        });

        if (!updatedTask) {
            return res.status(400).json({
                message: "Task not found, unavailable, or cannot be confirmed by the user"
            });
        }

        if (updatedTask.assignedTo) {
            await createAndEmitNotification({
                recipient: updatedTask.assignedTo,
                type: "task_completed",
                message: `The poster confirmed the task "${updatedTask.title}" as completed.`,
                task: updatedTask._id,
                io: req.app.get("io")
            });
        }

        res.status(200).json({
            message: "Task confirmed as completed",
            task: updatedTask
        });
    }
    catch(error){
        next(error);
    }
}

const cancelTask = async(req,res , next) => {
    try{
        const taskId = req.params.id;
        const userId = req.user.userId;

        // Atomic guard: only the poster can cancel, and only an open task.
        const cancelledTask = await Task.findOneAndUpdate(
            {
                _id: taskId,
                createdBy: userId,
                status: "open"
            },
            {
                status: "cancelled"
            },
            {
                returnDocument: "after"
            }
        );

        if (cancelledTask) {
            return res.status(200).json({
                message: "Task cancelled successfully",
                task: cancelledTask
            });
        }

        const task = await Task.findById(taskId).select("createdBy status");

        if(!task){
            return res.status(404).json({
                message: "Task not found"
            });
        }

        if(userId !== task.createdBy.toString()){
            return res.status(403).json({
                message: "You are not authorized to cancel this task"
            });
        }
        if(task.status === "completed"){
            return res.status(400).json({
                message: "Completed tasks cannot be cancelled"
            });
        }
        if(task.status === "cancelled"){
            return res.status(400).json({
                message: "Task is already cancelled"
            });
        }
        if(task.status === "submitted"){
            return res.status(400).json({
                message: "Submitted tasks cannot be cancelled"
            });
        }
        if(task.status === "accepted"){
            return res.status(400).json({
                message: "Accepted tasks cannot be cancelled"
            });
        }

        return res.status(400).json({
            message: "Task could not be cancelled"
        });
    }
    catch(error){
        next(error);
    }
}

const getMyPostedTasks = async (req,res , next) => {
    try{
        await autoConfirmStaleTasks({ io: req.app.get("io") });

        const userId = req.user.userId;
        const { page, limit } = req.query;
        const filter = { createdBy: userId };

        const [tasks, totalTasks] = await Promise.all([
            Task.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("createdBy", "name ratingSum ratingCount")
                .populate("assignedTo", "name"),
            Task.countDocuments(filter)
        ]);

        const tasksWithReviewState = await attachReviewState(tasks, userId);

        res.status(200).json({
            message: "My posted tasks fetched successfully",
            tasks: tasksWithReviewState,
            pagination: paginationMeta({
                page,
                limit,
                total: totalTasks,
                totalKey: "totalTasks"
            })
        });
    }
    catch(error){
        next(error);
    }
}

const getMyAcceptedTasks = async (req,res , next) => {
    try{
        await autoConfirmStaleTasks({ io: req.app.get("io") });

        const userId = req.user.userId;
        const { page, limit } = req.query;
        const filter = { assignedTo: userId };

        const [tasks, totalTasks] = await Promise.all([
            Task.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("createdBy", "name email ratingSum ratingCount"),
            Task.countDocuments(filter)
        ]);

        const tasksWithReviewState = await attachReviewState(tasks, userId);

        res.status(200).json({
            message: "My accepted tasks fetched successfully",
            tasks: tasksWithReviewState,
            pagination: paginationMeta({
                page,
                limit,
                total: totalTasks,
                totalKey: "totalTasks"
            })
        });
    }
    catch(error){
        next(error);
    }
}

export {
    createTask,
    getTasks,
    getTaskById,
    acceptTask,
    submitTask,
    confirmTask,
    cancelTask,
    getMyPostedTasks,
    getMyAcceptedTasks
};