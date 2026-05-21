import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  aiSearch,
  generateDescription,
  chat,
  recommend,
  reviewSummary,
} from "../controllers/ai.controller";

const router = Router();

router.post("/search", aiSearch);
router.post("/listings/:id/generate-description", authenticate, generateDescription);
router.post("/chat", chat);
router.post("/recommend", authenticate, recommend);
router.get("/listings/:id/review-summary", reviewSummary);

export default router;