import mongoose from "mongoose";

// Color schema preserving name and hex
const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hex: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// Rating breakdown schema preserving keys '1', '2', '3', '4', and '5'
const ratingBreakdownSchema = new mongoose.Schema(
  {
    1: { type: Number, default: 0, min: 0 },
    2: { type: Number, default: 0, min: 0 },
    3: { type: Number, default: 0, min: 0 },
    4: { type: Number, default: 0, min: 0 },
    5: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Specifications schema supporting all existing timepiece technical details
const specsSchema = new mongoose.Schema(
  {
    caliber: { type: String, default: "", trim: true },
    precision: { type: String, default: "", trim: true },
    powerReserve: { type: String, default: "", trim: true },
    vibrations: { type: String, default: "", trim: true },
    jewels: { type: String, default: "", trim: true },
    caseMaterial: { type: String, default: "", trim: true },
    caseThickness: { type: String, default: "", trim: true },
    bezel: { type: String, default: "", trim: true },
    windingCrown: { type: String, default: "", trim: true },
    crystal: { type: String, default: "", trim: true },
    waterResistance: { type: String, default: "", trim: true },
    bracelet: { type: String, default: "", trim: true },
    certification: { type: String, default: "", trim: true },
    caseBack: { type: String, default: "", trim: true },
  },
  { _id: false }
);

// Customer review schema preserving id, author, verified, rating, date, title, comment
const customerReviewSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    author: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    comment: { type: String, default: "", trim: true },
  },
  { _id: false }
);

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: [true, "Numeric product ID is required"],
      unique: true,
      index: true,
    },
    brand: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      index: true,
    },
    collection: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
      default: function () {
        return this.price;
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    gender: {
      type: String,
      trim: true,
      default: "Unisex",
      index: true,
    },
    movement: {
      type: String,
      trim: true,
      default: "Automatic",
    },
    caseSize: {
      type: String,
      trim: true,
      default: "",
    },
    caseSizes: {
      type: [String],
      default: [],
    },
    strap: {
      type: String,
      trim: true,
      default: "",
    },
    straps: {
      type: [String],
      default: [],
    },
    dialColor: {
      type: String,
      trim: true,
      default: "",
    },
    colors: {
      type: [colorSchema],
      default: [],
    },
    waterResistance: {
      type: String,
      trim: true,
      default: "",
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNew: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingBreakdown: {
      type: ratingBreakdownSchema,
      default: () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
    },
    image: {
      type: String,
      required: [true, "Primary product image URL is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    specs: {
      type: specsSchema,
      default: () => ({}),
    },
    customerReviews: {
      type: [customerReviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Text index for text search across name, brand, collection
productSchema.index({ name: "text", brand: "text", collection: "text" });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
