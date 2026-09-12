import User from "../models/User.js";

const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const newUser = await User.create({
            name,
            email,
            password
        });

        res.status(201).json({
            message: "User created successfully",
            user: newUser
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating user"
        });
    }
};

export { createUser };