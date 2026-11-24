import { env } from "../config/env.js";

const AI_REQUEST_TIMEOUT_MS = 20_000;

const chatWithAi = async (req, res) => {
    const { message } = req.body || {};

    if (!env.AI_SERVICE_URL) {
        return res.status(500).json({
            message: "AI service is not configured"
        });
    }

    try {
        const response = await fetch(`${env.AI_SERVICE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(env.AI_SERVICE_TOKEN
                    ? { "X-Internal-Token": env.AI_SERVICE_TOKEN }
                    : {})
            },
            body: JSON.stringify({ message }),
            signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const status = response.status === 429
                ? 429
                : response.status >= 500
                    ? response.status === 502 ? 502 : 500
                    : 400;

            console.error("AI service request failed", {
                status: response.status,
                upstreamMessage: typeof data.detail === "string" ? data.detail : undefined
            });

            return res.status(status).json({
                message: typeof data.detail === "string"
                    ? data.detail
                    : "AI service could not process the request"
            });
        }

        return res.status(200).json({
            answer: data.answer,
            sources: data.sources || []
        });
    } catch (error) {
        if (error.name === "TimeoutError") {
            console.error("AI service request timed out");
            return res.status(504).json({
                message: "AI service did not respond in time"
            });
        }

        console.error("AI service is unreachable", { name: error.name });
        return res.status(503).json({
            message: "AI service is unavailable"
        });
    }
};

export { chatWithAi };
