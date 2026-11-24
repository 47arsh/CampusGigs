import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// Escape query selector objects that originate from user input. Filters that
// intentionally use operators must be wrapped in mongoose.trusted().
mongoose.set("sanitizeFilter", true);

const connectDB = async() => {
    try{
        await mongoose.connect(env.MONGO_URI);
        logger.info("MongoDB connected");
    }
    catch(error){
        logger.error("Error connecting to MongoDB", { message: error.message });
        process.exit(1);
    }
}

export default connectDB;
