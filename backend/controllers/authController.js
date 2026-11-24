import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";

const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findOne({ email });

        if (user) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        next(error);
    }
};

const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            { userId: user._id.toString() },
            env.JWT_SECRET,
            { expiresIn: "1h", algorithm: "HS256" }
        );

        res.status(200).json({
            message: "User logged in successfully",
            token
        });

    } catch (error) {
        next(error);
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).select("name email");

        if (!user) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};

export { registerUser, loginUser, getCurrentUser };
