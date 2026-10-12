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
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited total uses
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
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
    },
  },
  {
    timestamps: true,
  }
);

const PromoCode = mongoose.model("PromoCode", promoCodeSchema);
export default PromoCode;
