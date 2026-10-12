import express from "express";
import { validatePromoCode } from "../controlles/promoController.js";

const router = express.Router();

router.post("/validate", validatePromoCode);

export default router;
