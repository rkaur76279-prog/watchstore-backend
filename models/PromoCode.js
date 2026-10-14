import mongoose from "mongoose";

const promoUsageSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    orderId: {
      type: String,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Promotional code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      required: [true, "Discount type is required"],
      enum: {
        values: ["percentage", "fixed", "shipping"],
        message: "{VALUE} is not a supported discount type (must be percentage, fixed, or shipping)",
      },
      default: "percentage",
    },
    discountValue: {
      type: Number,
      default: 0,
      min: [0, "Discount value cannot be negative"],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative"],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      default: null,
    },
    usedBy: [promoUsageSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Backward-compatibility aliases for minimumOrderAmount and maximumDiscount
promoCodeSchema.virtual("minimumOrderAmount")
  .get(function () { return this.minOrderAmount; })
  .set(function (val) { this.minOrderAmount = val; });

promoCodeSchema.virtual("maximumDiscount")
  .get(function () { return this.maxDiscount; })
  .set(function (val) { this.maxDiscount = val; });

promoCodeSchema.set("toJSON", { virtuals: true });
promoCodeSchema.set("toObject", { virtuals: true });

const PromoCode = mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);

export default PromoCode;
