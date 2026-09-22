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
            return res.status(502).json({
                message: data.detail || "AI service could not process the request"
            });
        }

        return res.status(200).json({
            answer: data.answer,
            sources: data.sources || []
        });
    } catch (error) {
        return res.status(503).json({
            message: "AI service is unavailable"
        });
    }
};

export { chatWithAi };
