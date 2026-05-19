import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { getCache, setCache } from "../config/cache";

export const getListingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = "stats:listings";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [totalListings, avgResult, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({ _avg: { pricePerNight: true } }),
      prisma.listing.groupBy({ by: ["location"], _count: { location: true }, orderBy: { _count: { location: "desc" } } }),
      prisma.listing.groupBy({ by: ["type"], _count: { type: true }, orderBy: { _count: { type: "desc" } } }),
    ]);

    const response = {
      totalListings,
      averagePrice: avgResult._avg.pricePerNight ?? 0,
      byLocation,
      byType,
    };

    setCache(cacheKey, response, 300);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = "stats:users";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    ]);

    const response = { totalUsers, byRole };
    setCache(cacheKey, response, 300);
    res.json(response);
  } catch (err) {
    next(err);
  }
};