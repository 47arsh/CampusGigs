import { z } from "zod";

const objectIdSchema = (message) => z.object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, { message })
});

const taskIdSchema = objectIdSchema("Invalid task ID");
const notificationIdSchema = objectIdSchema("Invalid notification ID");
const userIdSchema = objectIdSchema("Invalid user ID");

export { notificationIdSchema, userIdSchema };
export default taskIdSchema;
