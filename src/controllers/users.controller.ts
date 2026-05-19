import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          createdAt: true,
          _count: {
            select: { listings: true, bookings: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count()
    ]);

    res.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        listings: true,
        bookings: {
          include: { listing: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, username, phone, password, role, avatar } = req.body;

    if (!name || !email || !username || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existing) {
      res.status(409).json({ error: "Email or username already exists" });
      return;
    }

    const user = await prisma.user.create({
      data: { name, email, username, phone, password, role, avatar }
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;
    const { name, email, username, phone, bio, avatar } = req.body;

    if (id !== userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only update your own profile" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, username, phone, bio, avatar }
    });

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;

    if (id !== userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own account" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getUserListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const listings = await prisma.listing.findMany({
      where: { hostId: id },
      include: {
        _count: { select: { bookings: true } }
      }
    });
    res.json(listings);
  } catch (err) {
    next(err);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const bookings = await prisma.booking.findMany({
      where: { guestId: id },
      include: { listing: true }
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const profile = await prisma.profile.findUnique({
      where: { userId: id }
    });
    res.json(profile || {});
  } catch (err) {
    next(err);
  }
};

export const createProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;
    const { bio, website, country } = req.body;

    if (id !== userId) {
      res.status(403).json({ error: "You can only create your own profile" });
      return;
    }

    const profile = await prisma.profile.create({
      data: { bio, website, country, userId: id }
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;
    const { bio, website, country } = req.body;

    if (id !== userId) {
      res.status(403).json({ error: "You can only update your own profile" });
      return;
    }

    const profile = await prisma.profile.upsert({
      where: { userId: id },
      update: { bio, website, country },
      create: { bio, website, country, userId: id }
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
};