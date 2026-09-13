import { z } from "zod";

const taskQuerySchema = z.object({
    page: z.coerce
            .number()
            .int()
            .min(1,"Page must be a positive integer")
            .optional()
            .default(1),
    limit: z.coerce
            .number()
            .int()
            .min(1,"Limit must be a positive integer")
            .max(50,"Limit must not exceed 50")
            .optional()
            .default(10)
});

export default taskQuerySchema;