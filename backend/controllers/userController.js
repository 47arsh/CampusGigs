import Review from "../models/Review.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("name createdAt ratingSum ratingCount");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const [completedTasks, reviews] = await Promise.all([
            Task.countDocuments({
                assignedTo: user._id,
                status: "completed"
            }),
            Review.find({ reviewee: user._id })
                .sort({ createdAt: -1, _id: -1 })
                .limit(10)
                .populate("reviewer", "name")
        ]);

        const average = user.ratingCount
            ? Math.round((user.ratingSum / user.ratingCount) * 10) / 10
            : null;

        res.status(200).json({
            message: "Profile fetched successfully",
            profile: {
                _id: user._id,
                name: user.name,
                joinedAt: user.createdAt,
                completedTasks,
                rating: {
                    average,
                    count: user.ratingCount
                },
                reviews: reviews.map((review) => ({
                    _id: review._id,
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt,
                    reviewer: review.reviewer
                        ? { _id: review.reviewer._id, name: review.reviewer.name }
                        : null
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

export { getUserProfile };
