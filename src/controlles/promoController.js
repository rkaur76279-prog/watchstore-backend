import mongoose from "mongoose";
import PromoCode from "../../models/PromoCode.js";
import Product from "../../models/Product.js";
import crypto from "crypto";

// Default Predefined Promotional Offers
export const PREDEFINED_PROMO_CODES = [
  {
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "10% privilege discount for distinguished new collectors",
  },
  {
    code: "WATCH15",
    discountType: "percentage",
    discountValue: 15,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "15% off horology celebration discount",
  },
  {
    code: "FLAT200",
    discountType: "fixed",
    discountValue: 200,
    minOrderAmount: 2000,
    maxDiscount: null,
    isActive: true,
    description: "₹200 flat discount on orders above ₹2,000",
  },
  {
    code: "FESTIVE20",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "20% festive privilege celebration discount",
  },
  {
    code: "FREESHIP",
    discountType: "shipping",
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "Complimentary armored courier shipping",
  },
  // Legacy alias for compatibility with existing tests
  {
    code: "VIPROLLEX",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: 2500,
    isActive: true,
    description: "10% VIP Privilege discount on all timepieces",
  },
];

// Seed default promo codes if they do not exist
export const seedDefaultPromoCodes = async () => {
  try {
    for (const offer of PREDEFINED_PROMO_CODES) {
      await PromoCode.findOneAndUpdate(
        { code: offer.code },
        { $setOnInsert: offer },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.warn("Notice while ensuring default promo codes:", error.message);
  }
};

/**
 * Validates a promo code against current cart items/subtotal and user details.
 * POST /api/promocodes/validate (and /api/promo-codes/validate)
 */
export const validatePromoCode = async (req, res) => {
  try {
    await seedDefaultPromoCodes();

    const {
      code,
      subtotal = 0,
      cartTotal = 0,
      cartItems = [],
      shippingFee = 500,
      userEmail = "",
    } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Please enter a promotional code.",
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const promo = await PromoCode.findOne({ code: cleanCode });

    if (!promo) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" is invalid or unrecognized.`,
      });
    }

    if (!promo.isActive) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" is currently inactive.`,
      });
    }

    const now = new Date();
    if (promo.startDate && now < promo.startDate) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" has not yet commenced.`,
      });
    }

    if (promo.expiryDate && now > promo.expiryDate) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" has expired.`,
      });
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" has reached its maximum redemption limit.`,
      });
    }

    const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : "";
    if (normalizedEmail && promo.perUserLimit && Array.isArray(promo.usedBy)) {
      const userRedemptions = promo.usedBy.filter(
        (u) => u.userEmail === normalizedEmail
      ).length;

      if (userRedemptions >= promo.perUserLimit) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: `You have already redeemed promo code "${cleanCode}" the maximum permitted times.`,
        });
      }
    }

    // Calculate verified subtotal using product prices retrieved from MongoDB
    let verifiedSubtotal = 0;
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      for (const item of cartItems) {
        const itemQty = Number(item.quantity) || 1;
        let dbProduct = null;

        if (!isNaN(Number(item.id))) {
          dbProduct = await Product.findOne({ id: Number(item.id) });
        }
        if (!dbProduct && item.id && mongoose.Types.ObjectId.isValid(item.id)) {
          dbProduct = await Product.findById(item.id);
        }

        const price = dbProduct ? dbProduct.price : (Number(item.price) || 0);
        verifiedSubtotal += price * itemQty;
      }
    } else {
      verifiedSubtotal = Number(subtotal) || Number(cartTotal) || 0;
    }

    const minAmount = promo.minOrderAmount || promo.minimumOrderAmount || 0;
    if (minAmount > 0 && verifiedSubtotal < minAmount) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Minimum order value of ₹${minAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} required for "${cleanCode}". Current subtotal is ₹${verifiedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`,
      });
    }

    const numShippingFee = Number(shippingFee) >= 0 ? Number(shippingFee) : 500;
    let discountAmount = 0;
    let shippingDiscount = 0;
    let isFreeShipping = false;

    if (promo.discountType === "shipping" || cleanCode === "FREESHIP") {
      isFreeShipping = true;
      shippingDiscount = numShippingFee;
      discountAmount = 0;
    } else if (promo.discountType === "percentage") {
      discountAmount = (verifiedSubtotal * promo.discountValue) / 100;
      const maxDisc = promo.maxDiscount || promo.maximumDiscount;
      if (maxDisc && discountAmount > maxDisc) {
        discountAmount = maxDisc;
      }
    } else if (promo.discountType === "fixed") {
      discountAmount = Math.min(promo.discountValue, verifiedSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const effectiveShipping = isFreeShipping ? 0 : numShippingFee;
    const finalTotal = Math.max(
      0,
      Math.round((verifiedSubtotal - discountAmount + effectiveShipping) * 100) / 100
    );

    return res.status(200).json({
      success: true,
      valid: true,
      message: `Promotional code "${cleanCode}" applied successfully.`,
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
        shippingDiscount,
        isFreeShipping,
        subtotal: verifiedSubtotal,
        shippingFee: effectiveShipping,
        originalShippingFee: numShippingFee,
        finalTotal,
        description: promo.description,
      },
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: "An error occurred during promo code validation.",
      error: error.message,
    });
  }
};

/**
 * Generate unique random promo code
 */
const generateRandomCode = (prefix = "ROLLEX") => {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
};

/**
 * POST /api/promocodes
 * Admin-only: Create promotional code or generate random promo code
 */
export const createPromoCode = async (req, res) => {
  try {
    let {
      code,
      discountType = "percentage",
      discountValue = 10,
      minOrderAmount = 0,
      maxDiscount = null,
      startDate = new Date(),
      expiryDate = null,
      usageLimit = null,
      isActive = true,
      description = "",
    } = req.body;

    let finalCode = (code || "").trim().toUpperCase();
    if (!finalCode) {
      finalCode = generateRandomCode("LUX");
      // Ensure uniqueness
      while (await PromoCode.findOne({ code: finalCode })) {
        finalCode = generateRandomCode("LUX");
      }
    }

    const existing = await PromoCode.findOne({ code: finalCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Promo code "${finalCode}" already exists.`,
      });
    }

    const newPromo = new PromoCode({
      code: finalCode,
      discountType,
      discountValue: Number(discountValue) || 0,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      isActive: isActive !== false,
      description: description || `Privilege promo code ${finalCode}`,
    });

    await newPromo.save();

    return res.status(201).json({
      success: true,
      message: `Promo code "${finalCode}" generated successfully.`,
      promo: newPromo,
    });
  } catch (error) {
    console.error("Error creating promo code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create promo code",
      error: error.message,
    });
  }
};

/**
 * GET /api/promocodes
 * Admin-only: List all promo codes
 */
export const getPromoCodes = async (req, res) => {
  try {
    await seedDefaultPromoCodes();
    const codes = await PromoCode.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: codes.length,
      promocodes: codes,
    });
  } catch (error) {
    console.error("Error listing promo codes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve promotional codes",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/promocodes/:id
 * Admin-only: Update or activate/deactivate promo code
 */
export const updatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    let query = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { code: id.trim().toUpperCase() };
    }

    const promo = await PromoCode.findOne(query);
    if (!promo) {
      return res.status(404).json({
        success: false,
        message: `Promo code "${id}" not found.`,
      });
    }

    const allowedUpdates = [
      "isActive",
      "discountValue",
      "discountType",
      "minOrderAmount",
      "maxDiscount",
      "expiryDate",
      "usageLimit",
      "description",
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        promo[key] = req.body[key];
      }
    }

    await promo.save();

    return res.status(200).json({
      success: true,
      message: `Promo code "${promo.code}" updated successfully.`,
      promo,
    });
  } catch (error) {
    console.error("Error updating promo code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update promo code",
      error: error.message,
    });
  }
};
