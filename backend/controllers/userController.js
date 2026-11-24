import Task from "../models/Task.js";
import User from "../models/User.js";

const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("name createdAt");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const completedTasks = await Task.countDocuments({
            assignedTo: user._id,
            status: "completed"
        });

        res.status(200).json({
            message: "Profile fetched successfully",
            profile: {
                _id: user._id,
                name: user.name,
                joinedAt: user.createdAt,
                completedTasks,
                rating: {
                    average: null,
                    count: 0
                },
                reviews: []
            }
        });
    } catch (error) {
        next(error);
    }
};

export { getUserProfile };
