import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectdb from "./dbconfig/dbconfig.js";
import authRouter from "./routes/auth.js";
import orderRouter from "./routes/orderRoutes.js";
import subscribeRouter from "./routes/subscribeRoutes.js";
import promoRouter from "./routes/promoRoutes.js";
import { productReviewRouter, directReviewRouter } from "./routes/reviewRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", authRouter);
app.use("/api/orders", orderRouter);
app.use("/api/subscribe", subscribeRouter);
app.use("/api/promo-codes", promoRouter);
app.use("/api/products/:productId/reviews", productReviewRouter);
app.use("/api/reviews", directReviewRouter);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Swiss Chronometer Registry API is running",
  });
});

connectdb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app;