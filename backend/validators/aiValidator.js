import { z } from "zod";

const aiChatSchema = z.object({
    message: z.string("Message is required")
        .trim()
        .min(1, "Message is required")
        .max(2000, "Message cannot exceed 2000 characters")
});

export default aiChatSchema;
