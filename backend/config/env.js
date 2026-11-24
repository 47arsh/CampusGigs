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
        .union([
            z.literal("true"),
            z.literal("false"),
            z.coerce.number().int().min(1, "TRUST_PROXY must be a hop count of at least 1")
        ])
        .transform((value) => {
            if (value === "true") return 1;
            if (value === "false") return false;
            return value;
        })
        .optional(),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional()
});

const configError = (message) => new Error(`Invalid environment configuration:\n${message}`);

const buildEnv = (source) => {
    // Empty values mean "not configured" (e.g. `AI_SERVICE_TOKEN=` in .env.example).
    const definedEntries = Object.entries(source).filter(([, value]) => value !== "");
    const parsed = envSchema.safeParse(Object.fromEntries(definedEntries));

    if (!parsed.success) {
        const details = parsed.error.issues
            .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
            .join("\n");

        throw configError(details);
    }

    const corsOrigins = (parsed.data.CORS_ORIGINS ?? "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (corsOrigins.length === 0) {
        throw configError("CORS_ORIGINS must include at least one origin");
    }

    const config = {
        ...parsed.data,
        corsOrigins,
        isProduction: parsed.data.NODE_ENV === "production",
        isTest: parsed.data.NODE_ENV === "test"
    };

    if (config.isProduction) {
        if (config.JWT_SECRET.length < 32) {
            throw configError("JWT_SECRET must be at least 32 characters in production");
        }

        // The AI proxy must never reach a service that cannot authenticate it.
        if (config.AI_SERVICE_URL && !config.AI_SERVICE_TOKEN) {
            throw configError("AI_SERVICE_TOKEN is required in production when AI_SERVICE_URL is set");
        }

        if (config.AI_SERVICE_TOKEN && !config.AI_SERVICE_URL) {
            throw configError("AI_SERVICE_URL is required in production when AI_SERVICE_TOKEN is set");
        }
    } else if (!config.isTest && config.JWT_SECRET.length < 32) {
        console.warn(
            "JWT_SECRET is shorter than 32 characters. Use a long random value in production."
        );
    }

    return config;
};

export const env = buildEnv(process.env);
export { buildEnv };
