import { Request, Response, NextFunction } from "express";
import { BookingStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { sendEmail } from "../config/email";
import { bookingConfirmationEmail } from "../templates/emails";

export const getAllBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: { select: { name: true } },
        listing: { select: { title: true } },
      },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        listing: {
          include: { host: { select: { name: true } } },
        },
      },
    });
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { listingId, checkIn, checkOut } = req.body;

    if (!listingId || !checkIn || !checkOut) {
      res.status(400).json({ error: "listingId, checkIn, and checkOut are required" });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    if (checkInDate >= checkOutDate) {
      res.status(400).json({ error: "checkIn must be before checkOut" });
      return;
    }

    if (checkInDate <= new Date()) {
      res.status(400).json({ error: "checkIn must be in the future" });
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = nights * listing.pricePerNight;
    const guestId = req.userId as string;

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          listingId,
          status: "CONFIRMED",
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      });

      if (conflict) throw new Error("BOOKING_CONFLICT");

      return tx.booking.create({
        data: {
          guestId,
          listingId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalPrice,
          status: "PENDING",
        },
      });
    });

    res.status(201).json(booking);

    // Send confirmation email
    try {
      const guest = await prisma.user.findUnique({ where: { id: guestId } });
      const freshListing = await prisma.listing.findUnique({ where: { id: listingId } });
      console.log("Sending booking email to:", guest?.email);
      if (guest && freshListing) {
        await sendEmail(
          guest.email,
          "Booking Confirmed!",
          bookingConfirmationEmail(
            guest.name,
            freshListing.title,
            freshListing.location,
            checkInDate.toDateString(),
            checkOutDate.toDateString(),
            totalPrice
          )
        );
        console.log("Booking email sent successfully");
      }
    } catch (emailErr) {
      console.error("Booking confirmation email failed:", emailErr);
    }

  } catch (err) {
    if (err instanceof Error && err.message === "BOOKING_CONFLICT") {
      res.status(409).json({ error: "These dates are already booked for this listing" });
      return;
    }
    next(err);
  }
};

export const deleteBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const booking = await prisma.booking.findFirst({ where: { id } });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only cancel your own bookings" });
      return;
    }

    if (booking.status === "CANCELLED") {
      res.status(400).json({ error: "Booking is already cancelled" });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const validStatuses: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "status must be one of: PENDING, CONFIRMED, CANCELLED" });
      return;
    }
    const exists = await prisma.booking.findFirst({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const booking = await prisma.booking.update({ where: { id }, data: { status } });
    res.json(booking);
  } catch (err) {
    next(err);
  }
};