import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 2
    },

    description: {
        type: String,
        required: true,
        minlength: 10
    },

    reward: {
        type: Number,
        required: true,
        min: 10
    },

    pickupLocation: {
        type: String,
        required: true
    },

    dropLocation: {
        type: String,
        required: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    status: {
        type: String,
        enum: ["open", "accepted", "submitted", "completed", "cancelled"],
        default: "open"
    },

    submittedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Supports the public listing and the per-user dashboards without collection scans.
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;