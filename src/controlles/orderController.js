import Order from "../models/Order.js";
import PromoCode from "../models/PromoCode.js";
import { DEFAULT_ORDERS } from "../utils/defaultOrders.js";

// Helper to seed initial sample orders if database has no orders
const ensureInitialOrders = async (targetEmail = null, targetName = null) => {
  const count = await Order.countDocuments();
  if (count === 0) {
    console.log("[DB SEED] Populating initial Swiss Chronometer Registry orders...");
    await Order.insertMany(DEFAULT_ORDERS);
  }
};

// 1. GET ALL ORDERS (Filtered by authenticated user email)
export const getOrders = async (req, res) => {
  try {
    const { email, name } = req.query;

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      // Only fetch orders belonging to this user
      const userOrders = await Order.find({ userEmail: normalizedEmail }).sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: userOrders.length,
        orders: userOrders,
      });
    }

    // If no email query, return general orders (or seeded initial demo orders)
    await ensureInitialOrders();
    const orders = await Order.find({}).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders from DB:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders from database",
      error: error.message,
    });
  }
};

// 2. GET ORDER BY ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      $or: [{ id: orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Timepiece order not found in Swiss registry database",
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
};

// 3. CREATE / ADD ORDER DETAIL IN DB
export const createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const isoDate = now.toISOString().split("T")[0];

    // Generate unique serialized Order ID if not provided
    const generatedId =
      orderData.id || `RLX-${Math.floor(100000 + Math.random() * 900000)}-GE`;

    const userEmail = (orderData.userEmail || orderData.shippingAddress?.email || "client@rollex.ch")
      .toLowerCase()
      .trim();

    const userName =
      orderData.userName ||
      orderData.shippingAddress?.fullName ||
      "Client Privilege Member";

    const defaultTimeline = [
      {
        stage: "Order Placed",
        title: "Order Placed",
        description: "Client requisition authenticated and funds placed into Geneva Escrow",
        timestamp: `${dateFormatted} • Today`,
        completed: true,
        current: false,
      },
      {
        stage: "Processing",
        title: "Chronometer Tolerance Verification",
        description: "Master horologist precision audit and water-resistance testing in progress",
        timestamp: `${dateFormatted} • Active Stage`,
        completed: true,
        current: true,
      },
      {
        stage: "Shipped",
        title: "White-Glove Armored Transit",
        description: "Diplomatic courier handover and tracking activation",
        timestamp: "Scheduled upon atelier release",
        completed: false,
        current: false,
      },
      {
        stage: "Delivered",
        title: "Signed Handover & Certificate Activation",
        description: "In-person biometric delivery and Swiss Chronometer Registry guarantee",
        timestamp: "Pending transit completion",
        completed: false,
        current: false,
      },
    ];

    const defaultCourier = {
      name: "Malca-Amit Armored Transit",
      trackingNumber: `MA-CH-${Math.floor(1000000 + Math.random() * 9000000)}-NX`,
      serviceLevel: "White-Glove Armed Security Escort",
      estimatedDelivery: "3-5 Business Days",
      statusMessage: "Order entered into Geneva atelier queue for superlative chronometer testing.",
      currentLocation: "Geneva Manufacture Atelier",
      checkpoints: [
        {
          time: `${dateFormatted} - 10:00 AM`,
          status: "Private client allocation reserved",
          location: "Geneva Atelier, Switzerland",
        },
      ],
    };

    // Server-side Promo Code and Discount Calculation
    let validatedPromoCode = null;
    let validatedDiscount = 0;
    const rawSubtotal = Number(orderData.subtotal) || Number(orderData.total) || 0;

    if (orderData.promoCode && typeof orderData.promoCode === "string") {
      const cleanCode = orderData.promoCode.trim().toUpperCase();
      const promoRecord = await PromoCode.findOne({ code: cleanCode });
      if (promoRecord && promoRecord.isActive) {
        const now = new Date();
        const notExpired = !promoRecord.expiryDate || now <= promoRecord.expiryDate;
        const meetsMin = !promoRecord.minimumOrderAmount || rawSubtotal >= promoRecord.minimumOrderAmount;
        const withinUsage = promoRecord.usageLimit === null || promoRecord.usedCount < promoRecord.usageLimit;

        const userUses = userEmail
          ? promoRecord.usedBy.filter((u) => u.userEmail === userEmail).length
          : 0;
        const withinPerUser = !promoRecord.perUserLimit || userUses < promoRecord.perUserLimit;

        if (notExpired && meetsMin && withinUsage && withinPerUser) {
          validatedPromoCode = promoRecord.code;
          if (promoRecord.discountType === "percentage") {
            validatedDiscount = (rawSubtotal * promoRecord.discountValue) / 100;
            if (promoRecord.maximumDiscount && validatedDiscount > promoRecord.maximumDiscount) {
              validatedDiscount = promoRecord.maximumDiscount;
            }
          } else if (promoRecord.discountType === "fixed") {
            validatedDiscount = Math.min(promoRecord.discountValue, rawSubtotal);
          }
          validatedDiscount = Math.round(validatedDiscount * 100) / 100;

          // Increment promo usage
          promoRecord.usedCount += 1;
          promoRecord.usedBy.push({
            userEmail,
            orderId: generatedId,
            discountAmount: validatedDiscount,
            usedAt: new Date(),
          });
          await promoRecord.save();
        }
      }
    } else if (Number(orderData.discountAmount) > 0) {
      validatedDiscount = Math.min(Number(orderData.discountAmount), rawSubtotal);
    }

    const calculatedTotal = Math.max(
      0,
      Math.round(
        (rawSubtotal - validatedDiscount + (Number(orderData.shippingCharge) || 0) + (Number(orderData.tax) || 0)) * 100
      ) / 100
    );

    const newOrder = new Order({
      id: generatedId,
      userEmail,
      userName,
      date: orderData.date || isoDate,
      formattedDate: orderData.formattedDate || dateFormatted,
      status: orderData.status || "Processing",
      paymentStatus: orderData.paymentStatus || "Paid",
      paymentMethod: orderData.paymentMethod || "Centurion Platinum Reserve (••• 4242)",
      transactionRef:
        orderData.transactionRef || `TXN-CH-${Math.floor(100000 + Math.random() * 900000)}`,
      items: orderData.items || [],
      totalQuantity: orderData.totalQuantity || orderData.items?.length || 1,
      subtotal: rawSubtotal,
      promoCode: validatedPromoCode,
      discountAmount: validatedDiscount,
      shippingCharge: Number(orderData.shippingCharge) || 0,
      tax: Number(orderData.tax) || 0,
      total: calculatedTotal,
      shippingAddress: orderData.shippingAddress || {
        fullName: userName,
        address: "Quai du Mont-Blanc 19",
        city: "Geneva",
        country: "Switzerland",
        postalCode: "1201",
        phone: "+41 22 555 0199",
      },
      courier: orderData.courier || defaultCourier,
      timeline: orderData.timeline || defaultTimeline,
      chronometerCertificate:
        orderData.chronometerCertificate ||
        `CH-COSC-${Math.floor(100000 + Math.random() * 900000)}`,
      warrantyPeriod: "6-Year International Superlative Guarantee",
      notes: "Saved in Swiss Chronometer Registry MongoDB database.",
    });

    const savedOrder = await newOrder.save();

    console.log(
      `[ORDER SAVED IN DB] #${savedOrder.id} for ${savedOrder.userName} (${savedOrder.userEmail}) - Total: $${savedOrder.total}`
    );

    return res.status(201).json({
      success: true,
      message: "Timepiece order successfully added to database",
      order: savedOrder,
    });
  } catch (error) {
    // Handle duplicate key — order already in DB, return existing record
    if (error.code === 11000) {
      const existingOrder = await Order.findOne({ id: error.keyValue?.id }).catch(() => null);
      if (existingOrder) {
        console.log(`[ORDER ALREADY EXISTS] #${existingOrder.id} found in DB — returning existing.`);
        return res.status(200).json({
          success: true,
          message: "Order already exists in database",
          order: existingOrder,
        });
      }
    }
    console.error("Error creating order in DB:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to store order details in database",
      error: error.message,
    });
  }
};

// 4. CANCEL ORDER IN DB
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "Client requested cancellation" } = req.body;

    const order = await Order.findOne({ id: orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found in database",
      });
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: `Orders that have already been ${order.status.toLowerCase()} cannot be cancelled. Please contact Swiss Atelier concierge for assistance.`,
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This order has already been cancelled.",
      });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedTimestamp = `${dateStr} • ${timeStr} CET`;

    order.status = "Cancelled";
    order.paymentStatus = "Refunded";
    order.cancellationReason = reason;
    order.cancelledAt = formattedTimestamp;
    order.refundRef = `REF-CH-${Math.floor(100000 + Math.random() * 900000)}-ESCROW`;

    // Update timeline
    const updatedTimeline = order.timeline
      ? order.timeline.filter((t) => t.stage !== "Delivered" && t.stage !== "Shipped")
      : [];

    updatedTimeline.push({
      stage: "Cancelled",
      title: "Order Cancelled & Refunded",
      description: reason,
      timestamp: formattedTimestamp,
      completed: true,
      current: true,
      isCancelled: true,
    });

    order.timeline = updatedTimeline;
    order.notes = `Order cancelled upon client confirmation. 100% refund initiated. ${order.notes || ""}`;

    const updatedOrder = await order.save();

    console.log(`[ORDER CANCELLED IN DB] #${updatedOrder.id} - Reason: ${reason}`);

    return res.json({
      success: true,
      message: "Order successfully cancelled in database",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order in DB:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order in database",
      error: error.message,
    });
  }
};

// 5. RESET / SEED ORDERS
export const seedOrders = async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      await Order.deleteMany({ userEmail: email.toLowerCase().trim() });
      await ensureInitialOrders(email);
    } else {
      await Order.deleteMany({});
      await Order.insertMany(DEFAULT_ORDERS);
    }

    const orders = await Order.find({}).sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Orders reseeded in database",
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error reseeding orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reseed orders",
      error: error.message,
    });
  }
};
