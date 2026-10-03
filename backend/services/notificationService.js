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

    const notification = await Notification.create({
        recipient,
        type,
        message,
        task,
        read: false
    });

    if (io) {
        io.to(`user:${recipient.toString()}`).emit("notification:new", {
            ...notification.toObject(),
            createdAt: notification.createdAt.toISOString ? notification.createdAt.toISOString() : notification.createdAt
        });
    }

    return notification;
};

export { createAndEmitNotification };
