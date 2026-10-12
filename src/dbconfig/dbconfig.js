import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectdb = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/watchdbmain";
    const connection = await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully to:", connection.connection.host);
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

export default connectdb;