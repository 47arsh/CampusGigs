import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        enum: [
            "task_accepted",
            "task_submitted",
            "task_completed",
            "task_cancelled",
            "general"
        ],
        default: "general"
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
