import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(
            token,
            env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (typeof decoded.userId !== "string" || !OBJECT_ID_PATTERN.test(decoded.userId)) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export { authMiddleware };