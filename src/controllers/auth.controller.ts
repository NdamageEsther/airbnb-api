import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email";
import { welcomeEmail, passwordResetEmail } from "../templates/emails";

const JWT_SECRET = process.env["JWT_SECRET"] as string;
const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] ?? "7d";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, username, password, role, phone, avatar } = req.body;

    if (!name || !email || !username || !password) {
      res.status(400).json({ error: "name, email, username, and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    if (role === "ADMIN") {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        phone,
        avatar,
        role: role ?? "GUEST",
      },
    });

    try {
      await sendEmail(user.email, "Welcome to Airbnb!", welcomeEmail(user.name, user.role));
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr);
    }

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let userData;
    if (user.role === "HOST") {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          listings: {
            include: { _count: { select: { bookings: true } } },
          },
        },
      });
    } else {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          bookings: {
            include: { listing: { select: { title: true, location: true } } },
          },
        },
      });
    }

    const { password: _, ...userWithoutPassword } = userData as any;
    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const genericResponse = { message: "If that email is registered, a reset link has been sent" };

    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashedToken, resetTokenExpiry: expiry },
      });

      const resetLink = `${process.env["API_URL"] || "http://localhost:3000"}/auth/reset-password/${rawToken}`;

      try {
        await sendEmail(user.email, "Password Reset Request", passwordResetEmail(user.name, resetLink));
      } catch (emailErr) {
        console.error("Reset email failed:", emailErr);
      }
    }

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawToken = req.params["token"];
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: "password is required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};