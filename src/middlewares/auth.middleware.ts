import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] as string;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers["authorization"];
    console.log("authHeader:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    console.log("decoded:", decoded);

    req.userId = decoded.userId;
    req.role = decoded.role;
    console.log("req.userId after set:", req.userId);

    next();
  } catch (err) {
    console.log("auth error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireHost = (req: Request, res: Response, next: NextFunction): void => {
  if (req.role === "HOST" || req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Hosts only" });
};

export const requireGuest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.role === "GUEST" || req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Guests only" });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Admins only" });
};

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}