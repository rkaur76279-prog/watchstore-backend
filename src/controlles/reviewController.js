import Review from "../models/Review.js";
import Order from "../models/Order.js";

// Sample initial client appraisals for Swiss Chronometers
const INITIAL_SEED_REVIEWS = [
  {
    productId: "1",
    userName: "Lord Sterling Sterling",
    userEmail: "sterling@geneva-reserve.ch",
    rating: 5,
    title: "Unrivaled Cerachrom finishing and superlative tolerance",
    comment:
      "Having inspected dozens of references over three decades, the Cerachrom bezel tolerance and dial depth on this Submariner reference remain the gold standard of Geneva manufacture. Precision timing holds steady at +0.8s/day on the Witschi timing machine.",
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    productId: "1",
    userName: "Dr. Evelyn Vance",
    userEmail: "evelyn.vance@zurich-clinic.ch",
    rating: 5,
    title: "Masterful wrist balance and Glidelock perfection",
    comment:
      "The updated 41mm case dimensions distribute mass with complete ergonomic balance. The Glidelock clasp mechanism allows instantaneous 2mm micro-adjustments without tools. Truly superlative craftsmanship.",
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
  },
  {
    productId: "1",
    userName: "Philippe Mercier",
    userEmail: "philippe@mercier-horology.com",
    rating: 4,
    title: "Remarkable Calibre 3235 with exceptional 70-hour reserve",
    comment:
      "The Chronergy escapement performs with clinical reliability. Crown threading and Triplock sealing inspire supreme confidence underwater. An essential cornerstone of any serious horological vault.",
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    productId: "2",
    userName: "Julian von Berg",
    userEmail: "julian@berg-holdings.de",
    rating: 5,
    title: "Cerachrom Cerachrom Bezel — Pure Horological Royalty",
    comment:
      "The contrast between the black Cerachrom bezel and sunray dial captures ambient light magnificently. Exemplary chronometer precision and diplomatic presence.",
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
];

export const seedDefaultReviews = async () => {
  try {
    const count = await Review.countDocuments();
    if (count === 0) {
      console.log("[DB SEED] Populating initial Swiss Chronometer Registry client reviews...");
      for (const rev of INITIAL_SEED_REVIEWS) {
        // Use a dummy user ObjectId for initial seeds
        const dummyUserId = new (await import("mongoose")).default.Types.ObjectId();
        await Review.create({
          ...rev,
          userId: dummyUserId,
        });
      }
    }
  } catch (err) {
    console.error("Error seeding initial reviews:", err.message);
  }
};

/**
 * 1. GET ALL REVIEWS FOR A PRODUCT
 * GET /api/products/:productId/reviews
 */
export const getProductReviews = async (req, res) => {
  try {
    await seedDefaultReviews();

    const { productId } = req.params;
    const { sort = "recent", page = 1, limit = 6 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 6));
    const skipNum = (pageNum - 1) * limitNum;

    const strProductId = String(productId);

    // Build sort options
    let sortOptions = { createdAt: -1 }; // default recent
    if (sort === "highest") {
      sortOptions = { rating: -1, createdAt: -1 };
    } else if (sort === "lowest") {
      sortOptions = { rating: 1, createdAt: -1 };
    }

    // Retrieve all reviews for this product to calculate accurate aggregates
    const allProductReviews = await Review.find({ productId: strProductId });
    const totalReviews = allProductReviews.length;

    let averageRating = 5.0;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const ratingBreakdownPct = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sumRatings = allProductReviews.reduce((sum, r) => sum + r.rating, 0);
      averageRating = Math.round((sumRatings / totalReviews) * 10) / 10;

      allProductReviews.forEach((r) => {
        if (ratingBreakdown[r.rating] !== undefined) {
          ratingBreakdown[r.rating] += 1;
        }
      });

      for (let star = 1; star <= 5; star++) {
        ratingBreakdownPct[star] = Math.round((ratingBreakdown[star] / totalReviews) * 100);
      }
    }

    // Query paginated reviews
    const reviews = await Review.find({ productId: strProductId })
      .sort(sortOptions)
      .skip(skipNum)
      .limit(limitNum);

    const totalPages = Math.ceil(totalReviews / limitNum) || 1;

    // Check if the current user has written a review
    let userReview = null;
    if (req.user) {
      userReview = allProductReviews.find(
        (r) => r.userId.toString() === req.user._id.toString()
      ) || null;
    }

    return res.json({
      success: true,
      productId: strProductId,
      averageRating,
      totalReviews,
      ratingBreakdown,
      ratingBreakdownPct,
      page: pageNum,
      totalPages,
      hasMore: pageNum < totalPages,
      reviews,
      userReview,
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve timepiece client appraisals",
      error: error.message,
    });
  }
};

/**
 * 2. CHECK REVIEW ELIGIBILITY FOR AUTHENTICATED USER
 * GET /api/products/:productId/reviews/eligibility
 */
export const checkReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        canReview: false,
        message: "Authentication required to review this timepiece.",
      });
    }

    const strProductId = String(productId);
    const numProductId = Number(productId);

    // Check if user already submitted a review
    const existingReview = await Review.findOne({
      productId: strProductId,
      userId: user._id,
    });

    // Check user's order records to verify purchase
    const userOrders = await Order.find({
      userEmail: user.email.toLowerCase().trim(),
      status: { $ne: "Cancelled" },
    });

    const hasPurchased = userOrders.some((ord) =>
      ord.items &&
      ord.items.some(
        (it) => String(it.id) === strProductId || it.id === numProductId
      )
    );

    return res.json({
      success: true,
      canReview: !existingReview,
      alreadyReviewed: !!existingReview,
      hasPurchased,
      existingReview,
    });
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate review eligibility",
      error: error.message,
    });
  }
};

/**
 * 3. SUBMIT A PRODUCT REVIEW
 * POST /api/products/:productId/reviews
 */
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;
    const { rating, title, comment } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in to submit an appraisal.",
      });
    }

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid rating between 1 and 5 stars.",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a headline for your appraisal.",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please write your detailed impressions of the timepiece.",
      });
    }

    const strProductId = String(productId);
    const numProductId = Number(productId);

    // Prevent duplicate reviews from the same client
    const existingReview = await Review.findOne({
      productId: strProductId,
      userId: user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message:
          "You have already submitted an appraisal for this timepiece. You may edit your existing appraisal.",
        existingReviewId: existingReview._id,
      });
    }

    // Verify purchase status through actual user orders
    const userOrders = await Order.find({
      userEmail: user.email.toLowerCase().trim(),
      status: { $ne: "Cancelled" },
    });

    const isVerifiedPurchase = userOrders.some((ord) =>
      ord.items &&
      ord.items.some(
        (it) => String(it.id) === strProductId || it.id === numProductId
      )
    );

    const newReview = await Review.create({
      productId: strProductId,
      userId: user._id,
      userName: user.name || user.email.split("@")[0],
      userEmail: user.email.toLowerCase().trim(),
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: isVerifiedPurchase,
    });

    console.log(
      `[REVIEW CREATED] Product #${productId} by ${newReview.userName} (${newReview.rating}★)`
    );

    return res.status(201).json({
      success: true,
      message: "Your appraisal has been entered into the Swiss Chronometer Registry.",
      review: newReview,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this timepiece.",
      });
    }
    console.error("Error creating review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to store appraisal in database",
      error: error.message,
    });
  }
};

/**
 * 4. UPDATE USER'S OWN REVIEW
 * PATCH or PUT /api/reviews/:reviewId
 */
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user;
    const { rating, title, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Appraisal not found in registry.",
      });
    }

    // Verify ownership or administrator status
    if (review.userId.toString() !== user._id.toString() && !user.isadmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only edit appraisals that you authored.",
      });
    }

    if (rating !== undefined) {
      const numRating = parseInt(rating, 10);
      if (numRating >= 1 && numRating <= 5) {
        review.rating = numRating;
      }
    }

    if (title && title.trim()) {
      review.title = title.trim();
    }

    if (comment && comment.trim()) {
      review.comment = comment.trim();
    }

    const updatedReview = await review.save();

    return res.json({
      success: true,
      message: "Your appraisal has been updated successfully.",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

/**
 * 5. DELETE A REVIEW
 * DELETE /api/reviews/:reviewId
 */
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Appraisal record not found.",
      });
    }

    // Verify ownership or administrator status
    if (review.userId.toString() !== user._id.toString() && !user.isadmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only remove appraisals authored by you.",
      });
    }

    await Review.findByIdAndDelete(reviewId);

    console.log(`[REVIEW DELETED] #${reviewId} by ${user.email}`);

    return res.json({
      success: true,
      message: "Appraisal removed from the registry.",
      reviewId,
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove review",
      error: error.message,
    });
  }
};
