import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: "Rating must be a whole number"
        }
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 300
    }
}, {
    timestamps: true
});

reviewSchema.index({ task: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
