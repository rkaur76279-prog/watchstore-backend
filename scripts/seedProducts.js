import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";
import PromoCode from "../models/PromoCode.js";
import { products, rolexCollectionsList, brandsList } from "../src/data/products.js";

dotenv.config();

export const DEFAULT_PROMO_CODES = [
  {
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "10% privilege discount for distinguished new collectors",
  },
  {
    code: "WATCH15",
    discountType: "percentage",
    discountValue: 15,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "15% off horology celebration discount",
  },
  {
    code: "FLAT200",
    discountType: "fixed",
    discountValue: 200,
    minOrderAmount: 2000,
    maxDiscount: null,
    isActive: true,
    description: "₹200 flat discount on orders above ₹2,000",
  },
  {
    code: "FESTIVE20",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "20% festive privilege celebration discount",
  },
  {
    code: "FREESHIP",
    discountType: "shipping",
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: null,
    isActive: true,
    description: "Complimentary armored courier shipping",
  },
];

export const seedDatabase = async () => {
  try {
    console.log("--------------------------------------------------");
    console.log("Starting Swiss Chronometer Registry Data Migration");
    console.log("--------------------------------------------------");

    const conn = await connectDB();
    if (!conn) {
      console.error("Database connection failed. Ensure MongoDB is running and MONGO_URI is valid.");
      return false;
    }

    console.log(`\n[1/2] Seeding ${products.length} products with upsert on numeric 'id'...`);
    let createdCount = 0;
    let updatedCount = 0;

    for (const prod of products) {
      // Upsert by numeric id
      const existing = await Product.findOne({ id: prod.id });
      await Product.findOneAndUpdate(
        { id: prod.id },
        { $set: prod },
        { upsert: true, new: true, runValidators: true }
      );

      if (existing) {
        updatedCount++;
      } else {
        createdCount++;
      }
    }

    console.log(`✓ Products migration complete: ${createdCount} created, ${updatedCount} updated.`);
    console.log(`✓ Total products in MongoDB: ${await Product.countDocuments()}`);

    console.log(`\n[2/2] Seeding predefined promotional codes...`);
    let promoCreated = 0;
    let promoUpdated = 0;

    for (const promo of DEFAULT_PROMO_CODES) {
      const existing = await PromoCode.findOne({ code: promo.code });
      await PromoCode.findOneAndUpdate(
        { code: promo.code },
        { $set: promo },
        { upsert: true, new: true, runValidators: true }
      );

      if (existing) {
        promoUpdated++;
      } else {
        promoCreated++;
      }
    }

    console.log(`✓ Promo codes migration complete: ${promoCreated} created, ${promoUpdated} updated.`);
    console.log(`✓ Total promo codes in MongoDB: ${await PromoCode.countDocuments()}`);

    console.log("--------------------------------------------------");
    console.log("Database Seed Successful!");
    console.log("--------------------------------------------------");
    return true;
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
};

// Execute if run directly from CLI
const isDirectExecution = Boolean(
  process.argv[1] &&
  (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` ||
   import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/")))
);

if (isDirectExecution) {
  seedDatabase()
    .then((success) => {
      mongoose.disconnect();
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      mongoose.disconnect();
      process.exit(1);
    });
}
