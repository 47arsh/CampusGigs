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
        enum: ["open", "accepted", "completed", "cancelled"],
        default: "open"
    }
}, {
    timestamps: true
});

const Task = mongoose.model("Task", taskSchema);

export default Task;