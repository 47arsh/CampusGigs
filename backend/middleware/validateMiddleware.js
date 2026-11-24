const validate = (schemas) => {
    return (req, res, next) => {

        // Validate request body
        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: result.error.issues
                });
            }

            req.body = result.data;
        }

        // Validate query parameters
        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);

            if (!result.success) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: result.error.issues
                });
            }

            // Express 5 exposes req.query as a getter that re-parses the URL,
            // so mutate-in-place is lost. Define an own value property instead.
            Object.defineProperty(req, "query", {
                value: result.data,
                writable: true,
                configurable: true,
                enumerable: true
            });
        }

        // Validate route parameters
        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);

            if (!result.success) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: result.error.issues
                });
            }

            req.params = result.data;
        }

        next();
    };
};

export default validate;