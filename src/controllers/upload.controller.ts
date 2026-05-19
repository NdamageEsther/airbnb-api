import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;

    if (userId !== id) {
      res.status(403).json({ error: "You can only change your own avatar" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "airbnb/avatars");

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: url, avatarPublicId: publicId },
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;

    if (userId !== id) {
      res.status(403).json({ error: "You can only change your own avatar" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.avatar) {
      res.status(400).json({ error: "No avatar to remove" });
      return;
    }

    await deleteFromCloudinary(user.avatarPublicId as string);

    await prisma.user.update({
      where: { id },
      data: { avatar: null, avatarPublicId: null },
    });

    res.json({ message: "Avatar removed successfully" });
  } catch (err) {
    next(err);
  }
};

export const uploadListingPhotos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const userId = req.userId as string;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== userId) {
      res.status(403).json({ error: "You can only upload photos to your own listings" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });

    if (existingCount >= 5) {
      res.status(400).json({ error: "Maximum of 5 photos allowed per listing" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const remainingSlots = 5 - existingCount;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const { url, publicId } = await uploadToCloudinary(file.buffer, "airbnb/listings");
      await prisma.listingPhoto.create({
        data: { url, publicId, listingId: id },
      });
    }

    const updatedListing = await prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });

    res.json(updatedListing);
  } catch (err) {
    next(err);
  }
};

export const deleteListingPhoto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id; // Changed from parseInt
    const photoId = req.params.photoId; // Changed from parseInt
    const userId = req.userId as string;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== userId) {
      res.status(403).json({ error: "You can only delete photos from your own listings" });
      return;
    }

    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    if (photo.listingId !== id) {
      res.status(403).json({ error: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    next(err);
  }
};