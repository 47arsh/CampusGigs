import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

if (env.TRUST_PROXY !== undefined) {
    app.set("trust proxy", env.TRUST_PROXY);
}

app.use(cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "32kb" }));

app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to CampusGigs API"
    });
});

// Readiness probe: the HTTP server only starts accepting traffic after
// MongoDB connects, so a successful response implies a live database link.
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

app.use(errorHandler);

export default app;
