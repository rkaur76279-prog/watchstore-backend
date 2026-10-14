import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectdb from "./src/dbconfig/dbconfig.js";
import authRouter from "./src/routes/auth.js";
import orderRouter from "./src/routes/orderRoutes.js";
import subscribeRouter from "./src/routes/subscribeRoutes.js";
import promoRouter from "./src/routes/promoRoutes.js";
import productRouter from "./src/routes/productRoutes.js";
import { productReviewRouter, directReviewRouter } from "./src/routes/reviewRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite ports (5173, 5174, etc.)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/products", productRouter);
app.use("/api", authRouter);
app.use("/api/orders", orderRouter);
app.use("/api/subscribe", subscribeRouter);
app.use("/api/promocodes", promoRouter);
app.use("/api/promo-codes", promoRouter);
app.use("/api/products/:productId/reviews", productReviewRouter);
app.use("/api/reviews", directReviewRouter);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Swiss Chronometer Registry API is running",
    endpoints: [
      "/api/login",
      "/api/register",
      "/api/orders",
      "/api/promo-codes/validate",
      "/api/products/:productId/reviews",
      "/api/reviews/:reviewId",
    ],
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Connect to Database & Start Server
connectdb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app;