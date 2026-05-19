import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  deleteBooking,
  updateBookingStatus,
} from "../controllers/bookings.controller";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getAllBookings);
router.get("/:id", authenticate, getBookingById);
router.post("/", authenticate, createBooking);
router.delete("/:id", authenticate, deleteBooking);
router.patch("/:id/status", authenticate, requireAdmin, updateBookingStatus);

export default router;