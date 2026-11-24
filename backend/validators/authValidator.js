import {z} from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long")
})

const loginSchema = z.object({
    email: z.email("Invalid email address"),
    // Login only requires a value: accounts created while validation was
    // bypassed may have passwords shorter than the registration minimum.
    password: z.string().min(1, "Password is required")
})

export {registerSchema, loginSchema};