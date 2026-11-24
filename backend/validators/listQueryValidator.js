import { z } from "zod";

const listQueryShape = ({ defaultLimit, maxLimit }) => z.object({
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
        .max(maxLimit, `Limit must not exceed ${maxLimit}`)
        .optional()
        .default(defaultLimit)
});

const myTasksQuerySchema = listQueryShape({ defaultLimit: 50, maxLimit: 100 });
const notificationQuerySchema = listQueryShape({ defaultLimit: 50, maxLimit: 100 });

export { myTasksQuerySchema, notificationQuerySchema };
