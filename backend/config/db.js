import mongoose from "mongoose";
import { env } from "./env.js";

// Escape query selector objects that originate from user input. Filters that
// intentionally use operators must be wrapped in mongoose.trusted().
mongoose.set("sanitizeFilter", true);

const connectDB = async() => {
    try{
        await mongoose.connect(env.MONGO_URI);
        console.log(`MongoDB connected :)`);
    }
    catch(error){
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;
