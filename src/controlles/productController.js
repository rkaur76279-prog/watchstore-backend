import mongoose from "mongoose";
import Product from "../../models/Product.js";
import { products as fallbackProducts, rolexCollectionsList } from "../data/products.js";

// Helper to auto-seed products if database has no products yet
export const ensureProductsSeeded = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0 && fallbackProducts && fallbackProducts.length > 0) {
      console.log(`[DB SEED] Auto-seeding ${fallbackProducts.length} Swiss chronometer products into MongoDB...`);
      for (const prod of fallbackProducts) {
        await Product.findOneAndUpdate(
          { id: prod.id },
          { $set: prod },
          { upsert: true, new: true }
        );
      }
      console.log("[DB SEED] Initial products populated successfully.");
    }
  } catch (err) {
    console.warn("[DB SEED] Notice on auto-seeding products:", err.message);
  }
};

/**
 * GET /api/products
 * Retrieve all products, optionally filtered by category, brand, collection, featured, isNew, search.
 */
export const getProducts = async (req, res) => {
  try {
    await ensureProductsSeeded();

    const { category, brand, collection, featured, isNew, search, gender, movement } = req.query;
    const filter = {};

    if (category) {
      filter.category = new RegExp(`^${category.trim()}$`, "i");
    }
    if (brand) {
      filter.brand = new RegExp(`^${brand.trim()}$`, "i");
    }
    if (collection) {
      filter.collection = new RegExp(`^${collection.trim()}$`, "i");
    }
    if (gender) {
      filter.gender = new RegExp(`^${gender.trim()}$`, "i");
    }
    if (movement) {
      filter.movement = new RegExp(`^${movement.trim()}$`, "i");
    }
    if (featured !== undefined) {
      filter.featured = featured === "true";
    }
    if (isNew !== undefined) {
      filter.isNew = isNew === "true";
    }
    if (search && search.trim()) {
      const q = new RegExp(search.trim(), "i");
      filter.$or = [{ name: q }, { brand: q }, { collection: q }, { category: q }];
    }

    const products = await Product.find(filter).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products from database",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/featured
 * Retrieve featured products
 */
export const getFeaturedProducts = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const products = await Product.find({ featured: true }).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error retrieving featured products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve featured products",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/new-arrivals
 * Retrieve products where isNew is true
 */
export const getNewArrivals = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const products = await Product.find({ isNew: true }).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error retrieving new arrival products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve new arrival products",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/category/:category
 * Filter by category
 */
export const getProductsByCategory = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const { category } = req.params;
    const regex = new RegExp(`^${category.trim()}$`, "i");
    const products = await Product.find({ category: regex }).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      category,
      products,
    });
  } catch (error) {
    console.error("Error retrieving products by category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products by category",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/brand/:brand
 * Filter by brand
 */
export const getProductsByBrand = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const { brand } = req.params;
    const regex = new RegExp(`^${brand.trim()}$`, "i");
    const products = await Product.find({ brand: regex }).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      brand,
      products,
    });
  } catch (error) {
    console.error("Error retrieving products by brand:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products by brand",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/search?q=
 * Search by product name, brand, or collection
 */
export const searchProducts = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const query = req.query.q || req.query.query || "";

    if (!query.trim()) {
      return res.status(200).json({
        success: true,
        count: 0,
        products: [],
      });
    }

    const regex = new RegExp(query.trim(), "i");
    const products = await Product.find({
      $or: [
        { name: regex },
        { brand: regex },
        { collection: regex },
        { category: regex },
        { dialColor: regex },
      ],
    }).sort({ id: 1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      query: query.trim(),
      products,
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search product catalog",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/collections
 * Dynamic list of Rolex collections with item counts
 */
export const getCollections = async (req, res) => {
  try {
    await ensureProductsSeeded();
    // Use rolexCollectionsList or compute dynamically
    return res.status(200).json({
      success: true,
      collections: rolexCollectionsList,
      brands: rolexCollectionsList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve collections list",
      error: error.message,
    });
  }
};

/**
 * GET /api/products/:id
 * Retrieve a product by its existing numeric ID or MongoDB _id, handling invalid IDs safely.
 */
export const getProductById = async (req, res) => {
  try {
    await ensureProductsSeeded();
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid product identifier supplied",
      });
    }

    let product = null;

    // 1. Try by numeric id first (for frontend compatibility)
    if (!isNaN(Number(id))) {
      product = await Product.findOne({ id: Number(id) });
    }

    // 2. Try by MongoDB _id if valid ObjectId and not found yet
    if (!product && mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with identifier "${id}" was not found in the Swiss registry catalog.`,
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error retrieving product by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve timepiece details",
      error: error.message,
    });
  }
};
