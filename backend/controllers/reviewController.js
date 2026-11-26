import Review from "../models/Review.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { createAndEmitNotification } from "../services/notificationService.js";
import { autoConfirmStaleTasks } from "../services/taskLifecycle.js";

const createReview = async (req, res, next) => {
    try {
        await autoConfirmStaleTasks({ io: req.app.get("io") });

        const taskId = req.params.id;
        const reviewerId = req.user.userId;
        const { rating, comment } = req.body;

        const task = await Task.findById(taskId).select("createdBy assignedTo status");

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        if (task.status !== "completed") {
            return res.status(400).json({
                message: "Only completed tasks can be reviewed"
            });
        }

        const creatorId = task.createdBy.toString();
        const assigneeId = task.assignedTo ? task.assignedTo.toString() : null;

        let revieweeId = null;

        if (creatorId === reviewerId) {
            revieweeId = assigneeId;
        } else if (assigneeId && assigneeId === reviewerId) {
            revieweeId = creatorId;
        }

        if (!revieweeId) {
            return res.status(403).json({
                message: "Only task participants can review this task"
            });
        }

        const existingReview = await Review.findOne({
            task: task._id,
            reviewer: reviewerId
        });

        if (existingReview) {
            return res.status(409).json({
                message: "You already reviewed this task"
            });
        }

        const review = await Review.create({
            task: task._id,
            reviewer: reviewerId,
            reviewee: revieweeId,
            rating,
            comment: comment || undefined
        });

        const updatedReviewee = await User.updateOne(
            { _id: revieweeId },
            { $inc: { ratingSum: rating, ratingCount: 1 } }
        );

        if (updatedReviewee.matchedCount === 0) {
            await Review.deleteOne({ _id: review._id });
            return res.status(404).json({
                message: "Reviewee not found"
            });
        }

        const reviewer = await User.findById(reviewerId).select("name");
        await createAndEmitNotification({
            recipient: revieweeId,
            type: "review_received",
            message: `${reviewer?.name || "A student"} left you a ${rating}-star review.`,
            task: task._id,
            io: req.app.get("io")
        });

        res.status(201).json({
            message: "Review submitted successfully",
            review
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You already reviewed this task"
            });
        }

        next(error);
    }
};

export { createReview };
