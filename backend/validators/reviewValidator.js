import { z } from "zod";

const reviewSchema = z.object({
    rating: z.number()
        .int("Rating must be a whole number")
        .min(1, "Rating must be at least 1")
        .max(5, "Rating must be at most 5"),
    comment: z.string()
        .trim()
        .max(300, "Comment must be at most 300 characters")
        .optional()
        .default("")
});

export default reviewSchema;
