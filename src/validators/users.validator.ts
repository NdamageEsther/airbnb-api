import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  phone: z.string().min(7, "Invalid phone number"),
  role: z.enum(["HOST", "GUEST"]).default("GUEST"),
  avatar: z.string().url("Invalid avatar URL").optional(),
  bio: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();