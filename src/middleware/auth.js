import jwt from "jsonwebtoken";
import User from "../models/usermodel.js";
import dotenv from "dotenv";

dotenv.config();

const getJwtSecret = () => process.env.jwtSecret || "superlative_secret_key_2026";

/**
 * Middleware to require JWT authentication.
 * Attaches decoded user to req.user.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in to continue.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing.",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session expired or user record not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please sign in again.",
      error: error.message,
    });
  }
};

/**
 * Optional authentication: if token is present, attaches user to req.user;
 * otherwise proceeds without blocking.
 */
export const optionalToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, getJwtSecret());
          const user = await User.findById(decoded.id).select("-password");
          if (user) {
            req.user = user;
          }
        } catch {
          // Token invalid, proceed as guest
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
};

/**
 * Middleware to require administrator privileges (isadmin: true).
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isadmin) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to boutique administrators.",
    });
  }
  next();
};
