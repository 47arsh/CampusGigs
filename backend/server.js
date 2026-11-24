import "./config/loadEnv.js";
import http from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { env } from "./config/env.js";
import { authenticateSocket, disconnectWhenTokenExpires } from "./middleware/socketAuth.js";
import { logger } from "./utils/logger.js";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: env.corsOrigins,
        credentials: true
    }
});

app.locals.io = io;
app.set("io", io);

io.use(authenticateSocket);

io.on("connection", (socket) => {
    const userId = socket.user?.userId;

    if (!userId) {
        socket.disconnect(true);
        return;
    }

    disconnectWhenTokenExpires(socket);
    socket.join(`user:${userId}`);
});

const startServer = async () => {
    await connectDB();

    httpServer.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });
};

let shuttingDown = false;

const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    const forceExit = setTimeout(() => {
        logger.error("Shutdown timed out, forcing exit");
        process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
        await new Promise((resolve) => io.close(resolve));
        await mongoose.disconnect();
        clearTimeout(forceExit);
        logger.info("Shutdown complete");
        process.exit(0);
    } catch (error) {
        logger.error("Error during shutdown", { message: error.message });
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
