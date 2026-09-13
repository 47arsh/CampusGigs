const errorHandler = (err, req, res, next) => {

    console.error(err);

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

    // Unknown/unexpected error
    res.status(500).json({
        message: "Internal Server Error"
    });
};

export default errorHandler;