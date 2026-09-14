import { Router } from "express";
import { getLiveness, getReadiness } from "../controllers/health.controller.js";

const router = Router();

// Both are public by design and that decision is pinned down in
// route-protection.test.js: Render's health check and the uptime monitor are
// anonymous callers, and neither response reveals anything beyond whether a
// dependency answered.
router.get("/", getLiveness);
router.get("/ready", getReadiness);

export default router;
