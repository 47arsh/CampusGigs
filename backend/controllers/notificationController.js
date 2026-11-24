import Notification from "../models/Notification.js";
import { paginationMeta } from "../utils/pagination.js";

const getNotifications = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const filter = { recipient: req.user.userId };

        const [notifications, totalNotifications] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Notification.countDocuments(filter)
        ]);

        res.status(200).json({
            message: "Notifications fetched successfully",
            notifications,
            pagination: paginationMeta({
                page,
                limit,
                total: totalNotifications,
                totalKey: "totalNotifications"
            })
        });
    } catch (error) {
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            {
                _id: id,
                recipient: req.user.userId
            },
            {
                read: true
            },
            {
                returnDocument: "after"
            }
        );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        next(error);
    }
};

export { getNotifications, markNotificationAsRead };
