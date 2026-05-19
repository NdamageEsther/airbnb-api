import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(409).json({ error: `${err.meta?.target} already exists` });
        return;
      case "P2025":
        res.status(404).json({ error: "Record not found" });
        return;
      case "P2003":
        res.status(400).json({ error: "Related record does not exist" });
        return;
      default:
        res.status(500).json({ error: "Database error" });
        return;
    }
  }

 console.error("Unhandled error:", err);
res.status(500).json({ error: err instanceof Error ? err.message : "Something went wrong" });}