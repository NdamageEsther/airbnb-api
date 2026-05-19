import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

export const getListingReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `reviews:${listingId}:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        skip,
        take: limit,
        include: {
          user: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const response = {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    setCache(cacheKey, response, 30);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = req.params.id;
    const { rating, comment } = req.body;
    const userId = req.userId as string;

    if (!rating || !comment) {
      res.status(400).json({ error: "rating and comment are required" });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: "rating must be between 1 and 5" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const review = await prisma.review.create({
      data: { rating, comment, userId, listingId },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    deleteCacheByPrefix(`reviews:${listingId}`);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    await prisma.review.delete({ where: { id } });
    deleteCacheByPrefix(`reviews:${review.listingId}`);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    next(err);
  }
};