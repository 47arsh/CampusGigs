import "./config/loadEnv.js";
import http from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { env } from "./config/env.js";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: env.corsOrigins,
        credentials: true
    }
});

app.locals.io = io;
app.set("io", io);

io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
        return next(new Error("Authentication failed"));
    }

    const jwtToken = typeof token === "string" && token.startsWith("Bearer ")
        ? token.substring(7)
        : token;

    try {
        const decoded = jwt.verify(jwtToken, env.JWT_SECRET, { algorithms: ["HS256"] });

        if (typeof decoded.userId !== "string" || !/^[a-f0-9]{24}$/i.test(decoded.userId)) {
            return next(new Error("Authentication failed"));
        }

        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error("Authentication failed"));
    }
});

io.on("connection", (socket) => {
    const userId = socket.user?.userId;

    if (!userId) {
        socket.disconnect(true);
        return;
    }

    socket.join(`user:${userId}`);
});

const startServer = async () => {
    await connectDB();

    httpServer.listen(env.PORT, () => {
        console.log(`Server is running on port ${env.PORT}`);
    });
};

startServer();
