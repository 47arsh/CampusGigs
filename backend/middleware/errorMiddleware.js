const errorHandler = (err, req, res, next) => {
    // Malformed request bodies from body-parser
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            message: "Invalid JSON payload"
        });
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({
            message: "Request payload is too large"
        });
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: "Validation failed",
            errors: Object.values(err.errors).map(error => error.message)
        });
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        return res.status(400).json({
            message: "Invalid ID format"
        });
    }

    // Duplicate MongoDB value
    if (err.code === 11000) {
        return res.status(409).json({
            message: "A record with this value already exists"
        });
    }

    // Errors that carry an explicit client-facing status
    const status = err.status ?? err.statusCode;

    if (Number.isInteger(status) && status >= 400 && status < 500) {
        return res.status(status).json({
            message: err.expose === false ? "Request failed" : err.message || "Request failed"
        });
    }

    console.error(err);

    // Unknown/unexpected error
    res.status(500).json({
        message: "Internal Server Error"
    });
};

export default errorHandler;
