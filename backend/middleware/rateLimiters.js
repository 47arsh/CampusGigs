import rateLimit from "express-rate-limit";

const tooManyAttempts = (message) => ({
    status: 429,
    message
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: tooManyAttempts("Too many authentication attempts. Please try again later.")
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: tooManyAttempts("Too many AI requests. Please try again shortly.")
});

export { authLimiter, aiLimiter };
