import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { strictLimiter } from "../middlewares/rateLimiter";
import {
  getListingReviews,
  createReview,
  deleteReview,
} from "../controllers/reviews.controller";

const router = Router({ mergeParams: true });

router.get("/listings/:id/reviews", getListingReviews);
router.post("/listings/:id/reviews", authenticate, strictLimiter, createReview);
router.delete("/reviews/:id", authenticate, deleteReview);

export default router;