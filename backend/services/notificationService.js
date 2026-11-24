import Notification from "../models/Notification.js";

const createAndEmitNotification = async ({
    recipient,
    type,
    message,
    task,
    io
}) => {
    if (!recipient || !type || !message) {
        return null;
    }

    let notification;

    try {
        notification = await Notification.create({
            recipient,
            type,
            message,
            task,
            read: false
        });
    } catch (error) {
        // Notification failures must not fail an already-committed task mutation.
        console.error("Failed to create notification", {
            name: error.name,
            message: error.message
        });
        return null;
    }

    if (io) {
        try {
            io.to(`user:${recipient.toString()}`).emit("notification:new", {
                ...notification.toObject(),
                createdAt: notification.createdAt.toISOString ? notification.createdAt.toISOString() : notification.createdAt
            });
        } catch (error) {
            console.error("Failed to emit notification", {
                name: error.name,
                message: error.message
            });
        }
    }

    return notification;
};

export { createAndEmitNotification };
