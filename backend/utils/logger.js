import { env } from "../config/env.js";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[env.LOG_LEVEL ?? (env.isProduction ? "info" : "debug")] ?? LEVELS.info;

const write = (level, message, meta) => {
    if (LEVELS[level] > threshold) {
        return;
    }

    const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}`;
    const output = level === "error"
        ? console.error
        : level === "warn"
            ? console.warn
            : console.log;

    if (meta === undefined) {
        output(line);
    } else {
        output(line, meta);
    }
};

const logger = {
    error: (message, meta) => write("error", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    info: (message, meta) => write("info", message, meta),
    debug: (message, meta) => write("debug", message, meta)
};

export { logger };
