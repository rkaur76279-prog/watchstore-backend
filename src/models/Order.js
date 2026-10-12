import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String, required: true },
    brand: { type: String, default: "ROLLEX" },
    collection: { type: String, default: "Geneva Collection" },
    serialNumber: { type: String, default: "" },
    image: { type: String, default: "/watch6.jpg" },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    dialColor: { type: String, default: "Standard" },
    caseSize: { type: String, default: "41mm" },
    strap: { type: String, default: "Oystersteel Bracelet" },
    calibre: { type: String, default: "Superlative Chronometer Calibre" },
  },
  { _id: false }
);

const checkpointSchema = new mongoose.Schema(
  {
    time: { type: String },
    status: { type: String },
    location: { type: String },
  },
  { _id: false }
);

const timelineStepSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    timestamp: { type: String },
    completed: { type: Boolean, default: false },
    current: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      default: "client@rollex.ch",
    },
    userName: {
      type: String,
      default: "Client Privilege Member",
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    formattedDate: {
      type: String,
      default: () =>
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Authorized", "Refunded"],
      default: "Paid",
    },
    paymentMethod: {
      type: String,
      default: "Geneva Escrow Wire",
    },
    transactionRef: {
      type: String,
      default: () => `TXN-CH-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    items: [orderItemSchema],
    totalQuantity: {
      type: Number,
      default: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    promoCode: {
      type: String,
      default: null,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    shippingCharge: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingAddress: {
      fullName: { type: String, default: "Client Privilege Member" },
      address: { type: String, default: "Quai du Mont-Blanc 19" },
      city: { type: String, default: "Geneva" },
      country: { type: String, default: "Switzerland" },
      postalCode: { type: String, default: "1201" },
      phone: { type: String, default: "+41 22 555 0199" },
    },
    courier: {
      name: { type: String, default: "Malca-Amit Armored Transit" },
      trackingNumber: { type: String, default: "" },
      serviceLevel: { type: String, default: "White-Glove Armed Security Escort" },
      estimatedDelivery: { type: String, default: "3-5 Business Days" },
      statusMessage: { type: String, default: "Consignment logged at Geneva Atelier." },
      currentLocation: { type: String, default: "Geneva, Switzerland" },
      checkpoints: [checkpointSchema],
    },
    timeline: [timelineStepSchema],
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: String,
      default: null,
    },
    refundRef: {
      type: String,
      default: null,
    },
    chronometerCertificate: {
      type: String,
      default: () => `CH-COSC-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    warrantyPeriod: {
      type: String,
      default: "6-Year International Superlative Guarantee",
    },
    notes: {
      type: String,
      default: "Registered in Swiss Chronometer Registry database.",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
