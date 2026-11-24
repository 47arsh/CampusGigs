import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
// setTimeout overflows above this delay and would fire immediately.
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
        return next(new Error("Authentication failed"));
    }

    const jwtToken = typeof token === "string" && token.startsWith("Bearer ")
        ? token.substring(7)
        : token;

    try {
        const decoded = jwt.verify(jwtToken, env.JWT_SECRET, { algorithms: ["HS256"] });

        if (typeof decoded.userId !== "string" || !OBJECT_ID_PATTERN.test(decoded.userId)) {
            return next(new Error("Authentication failed"));
        }

        // Tokens issued by this API always carry an expiry; refuse any that do not.
        if (typeof decoded.exp !== "number") {
            return next(new Error("Authentication failed"));
        }

        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error("Authentication failed"));
    }
};

// A socket verified at handshake would otherwise keep receiving events after
// its token expires, so close it once the JWT lifetime runs out.
const disconnectWhenTokenExpires = (socket) => {
    const expiresAt = socket.user.exp * 1000;

    const schedule = () => {
        const remaining = expiresAt - Date.now();

        if (remaining <= 0) {
            socket.disconnect(true);
            return;
        }

        const timer = setTimeout(schedule, Math.min(remaining, MAX_TIMER_DELAY_MS));
        timer.unref?.();
        socket.once("disconnect", () => clearTimeout(timer));
    };

    schedule();
};

export { authenticateSocket, disconnectWhenTokenExpires };
