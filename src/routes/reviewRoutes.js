import express from "express";
import {
  getProductReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
} from "../controlles/reviewController.js";
import { verifyToken, optionalToken } from "../middleware/auth.js";

// Product-scoped reviews router: /api/products/:productId/reviews
export const productReviewRouter = express.Router({ mergeParams: true });

productReviewRouter.get("/", optionalToken, getProductReviews);
productReviewRouter.get("/eligibility", verifyToken, checkReviewEligibility);
productReviewRouter.post("/", verifyToken, createReview);

// Direct review router: /api/reviews/:reviewId
export const directReviewRouter = express.Router();

directReviewRouter.patch("/:reviewId", verifyToken, updateReview);
directReviewRouter.put("/:reviewId", verifyToken, updateReview);
directReviewRouter.delete("/:reviewId", verifyToken, deleteReview);

export default productReviewRouter;
