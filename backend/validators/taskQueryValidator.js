import { z } from "zod";

const taskQuerySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1, "Page must be a positive integer")
        .optional()
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be a positive integer")
        .max(50, "Limit must not exceed 50")
        .optional()
        .default(10),

    minReward: z.coerce
        .number()
        .min(10, "Minimum reward must be at least 10")
        .optional(),

    maxReward: z.coerce
        .number()
        .min(10, "Maximum reward must be at least 10")
        .optional(),
    status: z
    .enum(["open", "accepted", "completed", "cancelled"])
    .optional()
    .default("open")
})
.refine(
    (data) => {
        if (data.minReward !== undefined && data.maxReward !== undefined) {
            return data.minReward <= data.maxReward;
        }

        return true;
    },
    {
        message: "Minimum reward cannot be greater than maximum reward",
        path: ["maxReward"]
    }
);

export default taskQuerySchema;