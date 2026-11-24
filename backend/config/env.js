import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce
        .number()
        .int("PORT must be an integer")
        .min(1, "PORT must be between 1 and 65535")
        .max(65535, "PORT must be between 1 and 65535")
        .default(3000),
    MONGO_URI: z.string().trim().min(1, "MONGO_URI is required"),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    CORS_ORIGINS: z.string().trim().optional(),
    AI_SERVICE_URL: z.url("AI_SERVICE_URL must be a valid URL").optional(),
    AI_SERVICE_TOKEN: z.string().min(1, "AI_SERVICE_TOKEN cannot be empty").optional(),
    TRUST_PROXY: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
        .join("\n");

    throw new Error(`Invalid environment configuration:\n${details}`);
}

const corsOrigins = (parsed.data.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

if (corsOrigins.length === 0) {
    throw new Error("Invalid environment configuration:\nCORS_ORIGINS must include at least one origin");
}

export const env = {
    ...parsed.data,
    corsOrigins,
    isProduction: parsed.data.NODE_ENV === "production",
    isTest: parsed.data.NODE_ENV === "test"
};

if (!env.isTest && env.JWT_SECRET.length < 32) {
    console.warn(
        "JWT_SECRET is shorter than 32 characters. Use a long random value in production."
    );
}
