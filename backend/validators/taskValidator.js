import { z } from "zod";

const createTaskSchema = z.object({

    title: z.string("Title is required")
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title cannot exceed 100 characters"),

    description: z.string("Description is required")
        .min(10, "Description must be at least 10 characters")
        .max(200, "Description cannot exceed 200 characters"),

    reward: z.number("Reward must be a number")
        .min(10, "Reward must be at least 10"),

    pickupLocation: z.string("Pickup location is required")
        .min(1, "Pickup location is required")
        .max(100, "Pickup location cannot exceed 100 characters"),

    dropLocation: z.string("Drop location is required")
        .min(1, "Drop location is required")
        .max(100, "Drop location cannot exceed 100 characters")

});

export default createTaskSchema;