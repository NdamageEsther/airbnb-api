import { Response, NextFunction } from "express";
import { ListingType, Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

export const getAllListings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { location, type, maxPrice, page, limit, sortBy, order } = req.query;

    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 10;

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      res.status(400).json({ error: "Invalid pagination parameters" });
      return;
    }

    const cacheKey = `listings:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: Prisma.ListingWhereInput = {};
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type as ListingType;
    if (maxPrice) where.pricePerNight = { lte: parseFloat(maxPrice as string) };

    const orderBy: Prisma.ListingOrderByWithRelationInput = {};
    if (sortBy === "pricePerNight") {
      orderBy.pricePerNight = (order as string) === "desc" ? "desc" : "asc";
    }

    const listings = await prisma.listing.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy,
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        _count: { select: { bookings: true } },
      },
    });

    setCache(cacheKey, listings, 60);
    res.json(listings);
  } catch (err) {
    next(err);
  }
};

export const getListingById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: true,
        photos: true,
        reviews: {
          include: { user: { select: { name: true, avatar: true } } }
        },
        bookings: {
          include: { guest: { select: { name: true, email: true } } },
        },
      },
    });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(listing);
  } catch (err) {
    next(err);
  }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, location, pricePerNight, guests, type, amenities } = req.body;
    const hostId = req.userId as string;

    if (!hostId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!title || !description || !location || !pricePerNight || !guests || !type || !amenities) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        location,
        pricePerNight: parseFloat(pricePerNight),
        guests: parseInt(guests),
        type: type as ListingType,
        amenities,
        hostId,
      },
    });

    deleteCacheByPrefix("stats:listings");
    deleteCacheByPrefix("listings:");

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, description, location, pricePerNight, guests, type, amenities } = req.body;

    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only edit your own listings" });
      return;
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        title: title || listing.title,
        description: description || listing.description,
        location: location || listing.location,
        pricePerNight: pricePerNight ? parseFloat(pricePerNight) : listing.pricePerNight,
        guests: guests ? parseInt(guests) : listing.guests,
        type: type ? (type as ListingType) : listing.type,
        amenities: amenities || listing.amenities,
      }
    });

    deleteCacheByPrefix("stats:listings");
    deleteCacheByPrefix("listings:");

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own listings" });
      return;
    }

    await prisma.listing.delete({ where: { id } });

    deleteCacheByPrefix("stats:listings");
    deleteCacheByPrefix("listings:");

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getListingStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = "stats:listings";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const stats = await prisma.$queryRaw`
      SELECT
        location,
        COUNT(*)::int AS total,
        ROUND(AVG("pricePerNight")::numeric, 2) AS avg_price,
        MIN("pricePerNight") AS min_price,
        MAX("pricePerNight") AS max_price
      FROM "Listing"
      GROUP BY location
      ORDER BY total DESC
    `;

    setCache(cacheKey, stats, 300);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

export const searchListings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { location, type, minPrice, maxPrice, guests, page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ListingWhereInput = {};
    
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type as ListingType;
    
    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) where.pricePerNight = { ...where.pricePerNight as object, gte: parseFloat(minPrice as string) };
      if (maxPrice) where.pricePerNight = { ...where.pricePerNight as object, lte: parseFloat(maxPrice as string) };
    }
    
    if (guests) where.guests = { gte: parseInt(guests as string) };

    const [data, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          host: { select: { id: true, name: true, email: true, avatar: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};