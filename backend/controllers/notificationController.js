import Notification from "../models/Notification.js";

const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user.userId
        }).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Notifications fetched successfully",
            notifications
        });
    } catch (error) {
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

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
