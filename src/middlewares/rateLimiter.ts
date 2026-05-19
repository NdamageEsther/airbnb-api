import rateLimit from "express-rate-limit";

// General: 100 requests per 15 minutes — applied to all routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict: 20 requests per 15 minutes — applied to all POST routes
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many POST requests. You are limited to 20 per 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});