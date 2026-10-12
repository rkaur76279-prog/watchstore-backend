import express from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  seedOrders,
} from "../controlles/orderController.js";

const router = express.Router();

// Routes for order management
router.get("/", getOrders);
router.post("/seed", seedOrders);   // must be before /:orderId
router.post("/", createOrder);
router.get("/:orderId", getOrderById);
router.put("/:orderId/cancel", cancelOrder);
router.patch("/:orderId/cancel", cancelOrder);

export default router;
