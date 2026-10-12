import express from "express";
import Subscriber from "../models/Subscriber.js";

const router = express.Router();

// POST /api/subscribe — Add a new subscriber
router.post("/", async (req, res) => {
  try {
    const { email, name, source } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.status === "unsubscribed") {
        // Re-activate subscription
        existing.status = "active";
        existing.subscribedAt = new Date();
        await existing.save();
        console.log(`[SUBSCRIBER RE-ACTIVATED] ${normalizedEmail}`);
        return res.json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
          subscriber: { email: normalizedEmail },
        });
      }
      return res.json({
        success: true,
        message: "You are already on our private dispatch list.",
        subscriber: { email: normalizedEmail },
        alreadySubscribed: true,
      });
    }

    const subscriber = new Subscriber({
      email: normalizedEmail,
      name: name?.trim() || "",
      source: source || "website-modal",
    });

    await subscriber.save();
    console.log(`[NEW SUBSCRIBER] ${normalizedEmail} — Source: ${source || "website-modal"}`);

    return res.status(201).json({
      success: true,
      message: "Successfully subscribed to the private dispatch.",
      subscriber: { email: normalizedEmail },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: "You are already on our private dispatch list.",
        alreadySubscribed: true,
      });
    }
    console.error("[SUBSCRIBE ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Subscription could not be processed. Please try again.",
      error: error.message,
    });
  }
});

// GET /api/subscribe — Get subscriber count (admin only)
router.get("/count", async (req, res) => {
  try {
    const count = await Subscriber.countDocuments({ status: "active" });
    return res.json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
