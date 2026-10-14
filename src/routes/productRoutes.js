import express from "express";
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getNewArrivals,
  getProductsByCategory,
  getProductsByBrand,
  searchProducts,
  getCollections,
} from "../controlles/productController.js";

const router = express.Router();

// Specific routes MUST precede the /:id route
router.get("/featured", getFeaturedProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/search", searchProducts);
router.get("/collections", getCollections);
router.get("/category/:category", getProductsByCategory);
router.get("/brand/:brand", getProductsByBrand);

// Base products list
router.get("/", getProducts);

// Lookup by existing numeric id OR MongoDB _id
router.get("/:id", getProductById);

export default router;
