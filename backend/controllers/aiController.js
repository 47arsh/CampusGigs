const chatWithAi = async (req, res) => {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            message: "Message is required"
        });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL;

    if (!aiServiceUrl) {
        return res.status(500).json({
            message: "AI service is not configured"
        });
    }

    try {
        const response = await fetch(`${aiServiceUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message.trim() })
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
        console.error("AI service is unreachable", { name: error.name });
        return res.status(503).json({
            message: "AI service is unavailable"
        });
    }
};

export { chatWithAi };
