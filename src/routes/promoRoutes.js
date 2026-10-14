import express from "express";
import {
  validatePromoCode,
  createPromoCode,
  getPromoCodes,
  updatePromoCode,
} from "../controlles/promoController.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public validation endpoint for cart & checkout
router.post("/validate", validatePromoCode);

// Admin-only management endpoints
router.post("/", verifyToken, requireAdmin, createPromoCode);
router.get("/", verifyToken, requireAdmin, getPromoCodes);
router.patch("/:id", verifyToken, requireAdmin, updatePromoCode);

export default router;
