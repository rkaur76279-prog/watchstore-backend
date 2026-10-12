import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false, // Optional for OTP authentication
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    postalCode: {
      type: String,
      trim: true,
      default: "",
    },
    isadmin: {
      type: Boolean,
      default: false,
    },
    isactive: {
      type: Boolean,
      default: true,
    },
    tier: {
      type: String,
      default: "Oystersteel Privilege",
    },
    serialId: {
      type: String,
      default: () => `RLX-${Math.floor(100000 + Math.random() * 900000)}`,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;