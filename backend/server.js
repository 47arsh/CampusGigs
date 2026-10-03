import express from "express";
import http from "node:http";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.locals.io = io;

app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);

io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
        return next(new Error("Authentication failed"));
    }

    const jwtToken = typeof token === "string" && token.startsWith("Bearer ")
        ? token.substring(7)
        : token;

    try {
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
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
    console.log(`Socket connected for user ${userId}`);

    socket.on("disconnect", () => {
        console.log(`Socket disconnected for user ${userId}`);
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to CampusGigs API"
    });
});

app.use((req, res, next) => {
    res.status(404).json({
        message: "Route not found"
    });
});

app.use(errorHandler);
const startServer = async () => {
    await connectDB();

    httpServer.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
};

export { app, io };

startServer();
