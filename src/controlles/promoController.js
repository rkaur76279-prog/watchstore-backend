import PromoCode from "../models/PromoCode.js";

// Seed default promo codes for development / Swiss Chronometer Registry demo
export const seedDefaultPromoCodes = async () => {
  try {
    const count = await PromoCode.countDocuments();
    if (count === 0) {
      console.log("[DB SEED] Creating default Swiss Chronometer Registry promo codes...");
      const defaultCodes = [
        {
          code: "WELCOME10",
          discountType: "percentage",
          discountValue: 10,
          minimumOrderAmount: 500,
          maximumDiscount: 2500,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          perUserLimit: 2,
          isActive: true,
          description: "10% privilege discount for distinguished clientele (Max $2,500)",
        },
        {
          code: "WATCH500",
          discountType: "fixed",
          discountValue: 500,
          minimumOrderAmount: 2500,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          perUserLimit: 1,
          isActive: true,
          description: "$500 Swiss Escrow credit on acquisitions over $2,500",
        },
        {
          code: "SWISS20",
          discountType: "percentage",
          discountValue: 20,
          minimumOrderAmount: 5000,
          maximumDiscount: 5000,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          perUserLimit: 1,
          isActive: true,
          description: "20% Superlative Chronometer reserve allocation discount (Max $5,000)",
        },
        {
          code: "CHRONO15",
          discountType: "percentage",
          discountValue: 15,
          minimumOrderAmount: 1500,
          maximumDiscount: 3000,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          perUserLimit: 1,
          isActive: true,
          description: "15% Private Collector appraisal discount",
        },
        {
          code: "VIPROLLEX",
          discountType: "percentage",
          discountValue: 10,
          minimumOrderAmount: 0,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          perUserLimit: 3,
          isActive: true,
          description: "10% VIP Privilege discount on all timepieces",
        },
      ];
      await PromoCode.insertMany(defaultCodes);
    }
  } catch (error) {
    console.error("Error seeding default promo codes:", error.message);
  }
};

/**
 * Validates a promo code against current cart subtotal and user details.
 * POST /api/promo-codes/validate
 */
export const validatePromoCode = async (req, res) => {
  try {
    await seedDefaultPromoCodes();

    const { code, subtotal = 0, userEmail = "" } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Please enter a promo code.",
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
        message: `Promo code "${cleanCode}" is no longer active.`,
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
        message: `Promo code "${cleanCode}" has reached its maximum global redemptions.`,
      });
    }

    const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : "";
    if (normalizedEmail && promo.perUserLimit) {
      const userRedemptions = promo.usedBy.filter(
        (u) => u.userEmail === normalizedEmail
      ).length;

      if (userRedemptions >= promo.perUserLimit) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: `You have already redeemed promo code "${cleanCode}" the maximum allowed times (${promo.perUserLimit}).`,
        });
      }
    }

    const numericSubtotal = Number(subtotal) || 0;
    if (promo.minimumOrderAmount && numericSubtotal < promo.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Minimum order value of $${promo.minimumOrderAmount.toLocaleString()} required for "${cleanCode}". Current subtotal is $${numericSubtotal.toLocaleString()}.`,
      });
    }

    // Calculate verified discount
    let discountAmount = 0;
    if (promo.discountType === "percentage") {
      discountAmount = (numericSubtotal * promo.discountValue) / 100;
      if (promo.maximumDiscount && discountAmount > promo.maximumDiscount) {
        discountAmount = promo.maximumDiscount;
      }
    } else if (promo.discountType === "fixed") {
      discountAmount = Math.min(promo.discountValue, numericSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((numericSubtotal - discountAmount) * 100) / 100);

    return res.json({
      success: true,
      valid: true,
      message: `Promo code "${cleanCode}" applied successfully.`,
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
        subtotal: numericSubtotal,
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
