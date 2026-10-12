import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer rating between 1 and 5",
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews from the same user on the same product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
