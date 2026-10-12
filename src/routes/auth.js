import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

import OTP from "../models/Otp.js";
import User from "../models/usermodel.js";
import sendOTPEmail from "../utils/email.js";
import { updateUser } from "../controlles/userupdate.js";

dotenv.config();

const router = express.Router();

// 1. SEND OTP (For OTP Login & Registration)
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate a secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // OTP expires after 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Save new OTP
    await OTP.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // Send email dispatch
    const emailResult = await sendOTPEmail(normalizedEmail, otp);

    return res.json({
      success: true,
      message: "Verification code dispatched to your email",
      emailSent: emailResult.success,
      devCode: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Error in /send-otp:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dispatch verification code",
      error: error.message,
    });
  }
});

// 2. VERIFY OTP & LOGIN / SIGN-UP / STORE ALL DATA IN BACKEND
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, phone, address, city, country, postalCode, tier } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and 6-digit code are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // Check OTP record
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp: cleanOtp,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code or code expired",
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // Check if user exists in UserModel
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Auto-register new user dossier on first OTP verification and store all data
      const defaultName =
        name ||
        normalizedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      user = await User.create({
        name: defaultName,
        email: normalizedEmail,
        phone: phone || "",
        address: address || "",
        city: city || "",
        country: country || "",
        postalCode: postalCode || "",
        tier: tier || "Oystersteel Privilege",
        isadmin: false,
        isactive: true,
      });
      console.log(`[USER CREATED VIA OTP] ${user.name} (${user.email})`);
    } else {
      // Update any newly supplied client data into backend database
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (phone) updateData.phone = phone.trim();
      if (address) updateData.address = address.trim();
      if (city) updateData.city = city.trim();
      if (country) updateData.country = country.trim();
      if (postalCode) updateData.postalCode = postalCode.trim();
      if (tier) updateData.tier = tier;

      if (Object.keys(updateData).length > 0) {
        user = await User.findByIdAndUpdate(user._id, { $set: updateData }, { new: true });
        console.log(`[USER UPDATED VIA OTP VERIFY] ${user.name} (${user.email})`);
      }
    }

    // Delete used OTP
    await OTP.deleteMany({ email: normalizedEmail });

    // Generate JWT token
    const jwtSecret = process.env.jwtSecret || "superlative_secret_key_2026";
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isadmin: user.isadmin,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Client authenticated successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        tier: user.tier || "Oystersteel Privilege",
        serialId: user.serialId,
        isadmin: user.isadmin,
        memberSince: new Date(user.createdAt).getFullYear().toString(),
      },
    });
  } catch (error) {
    console.error("Error in /verify-otp:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication verification failed",
      error: error.message,
    });
  }
});

// 3. REGISTER WITH PASSWORD & STORE ALL CLIENT DATA IN DB
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address, city, country, postalCode, tier } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and master keycode password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A client dossier with this email already exists. Please sign in.",
      });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
      city: city || "",
      country: country || "",
      postalCode: postalCode || "",
      tier: tier || "Oystersteel Privilege",
      isadmin: false,
      isactive: true,
    });

    const jwtSecret = process.env.jwtSecret || "superlative_secret_key_2026";
    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        isadmin: newUser.isadmin,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Client dossier created successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || "",
        address: newUser.address || "",
        city: newUser.city || "",
        country: newUser.country || "",
        postalCode: newUser.postalCode || "",
        tier: newUser.tier,
        serialId: newUser.serialId,
        isadmin: newUser.isadmin,
        memberSince: new Date(newUser.createdAt).getFullYear().toString(),
      },
    });
  } catch (error) {
    console.error("Error in /register:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// 4. LOGIN WITH PASSWORD
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and keycode password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No client dossier found with this email. Please register.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This dossier was created with OTP. Please sign in via One-Time Passcode.",
      });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid vault keycode. Please verify and try again.",
      });
    }

    const jwtSecret = process.env.jwtSecret || "superlative_secret_key_2026";
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isadmin: user.isadmin,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Welcome back to the Vault",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        tier: user.tier || "Oystersteel Privilege",
        serialId: user.serialId,
        isadmin: user.isadmin,
        memberSince: new Date(user.createdAt).getFullYear().toString(),
      },
    });
  } catch (error) {
    console.error("Error in /login:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// 5. UPDATE USER ACCOUNT DOSSIER IN BACKEND (uses userupdate controller)
router.post("/user-update", updateUser);
router.put("/user-update", updateUser);
router.post("/update-profile", updateUser);

// 6. GET CURRENT USER PROFILE
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.jwtSecret || "superlative_secret_key_2026";
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

export default router;
