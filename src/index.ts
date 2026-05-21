import "dotenv/config";
import express, { Request, Response } from "express";
import compression from "compression";
import morgan from "morgan";
import { connectDB } from "./config/prisma";
import { setupSwagger } from "./config/swagger";
import { generalLimiter } from "./middlewares/rateLimiter";
import { deprecateV1 } from "./middlewares/deprecation.middleware";
import authRouter from "./routes/auth.routes";
import usersRouter from "./routes/users.routes";
import listingsRouter from "./routes/listings.routes";
import bookingsRouter from "./routes/bookings.routes";
import uploadRouter from "./routes/upload.routes";
import reviewsRouter from "./routes/reviews.routes";
import { errorHandler } from "./middlewares/errorHandler";
import aiRouter from "./routes/ai.routes";

const app = express();

app.use(process.env["NODE_ENV"] === "production" ? morgan("combined") : morgan("dev"));
app.use(compression());
app.use(express.json());
app.use(generalLimiter);

setupSwagger(app);

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

app.use("/api/v1/auth", deprecateV1, authRouter);
app.use("/api/v1/users", deprecateV1, usersRouter);
app.use("/api/v1/listings", deprecateV1, listingsRouter);
app.use("/api/v1/bookings", deprecateV1, bookingsRouter);
app.use("/api/v1/reviews", deprecateV1, reviewsRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/", uploadRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

async function main() {
  await connectDB();
  const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});