import { Request, Response, NextFunction } from "express";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model, filterModel } from "../config/ai";
import prisma from "../config/prisma";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

// In-memory chat sessions
const chatSessions: Record<string, { role: string; content: string }[]> = {};

// ─── Part 1: Smart Listing Search ───────────────────────────────────────────
export const aiSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const filterPrompt = `
You are a search filter extractor for an Airbnb-like platform.
Extract search filters from the user query and return ONLY a JSON object with no explanation.
Fields: location (string or null), type (APARTMENT|HOUSE|VILLA|CABIN or null), maxPrice (number or null), guests (number or null).
If you cannot extract any filters, return all null values.
Query: "${query}"
Return only JSON, no markdown, no explanation.
`;

    const filterResponse = await filterModel.invoke([new HumanMessage(filterPrompt)]);
    const filterText = filterResponse.content as string;

    let filters: any;
    try {
      const clean = filterText.replace(/```json|```/g, "").trim();
      filters = JSON.parse(clean);
    } catch {
      res.status(400).json({ error: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const { location, type, maxPrice, guests } = filters;

    if (!location && !type && !maxPrice && !guests) {
      res.status(400).json({ error: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const where: any = {};
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (type) where.type = type;
    if (maxPrice) where.pricePerNight = { lte: maxPrice };
    if (guests) where.guests = { gte: guests };

    const [data, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: {
          host: { select: { name: true, email: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      filters,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Part 2: Description Generator ──────────────────────────────────────────
export const generateDescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { tone = "professional" } = req.body;
    const userId = req.userId as string;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== userId) {
      res.status(403).json({ error: "You can only generate descriptions for your own listings" });
      return;
    }

    const toneInstructions: Record<string, string> = {
      professional: "Write in a formal, clear, business-like tone.",
      casual: "Write in a friendly, relaxed, conversational tone.",
      luxury: "Write in an elegant, premium, aspirational tone.",
    };

    const toneText = toneInstructions[tone] || toneInstructions.professional;

    const prompt = `
Generate a compelling listing description for this property.
${toneText}
Write 2-3 paragraphs. Return only the description text, no labels or headings.

Title: ${listing.title}
Location: ${listing.location}
Type: ${listing.type}
Price per night: $${listing.pricePerNight}
Max guests: ${listing.guests}
Amenities: ${listing.amenities.join(", ")}
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const description = (response.content as string).trim();

    const updated = await prisma.listing.update({
      where: { id },
      data: { description },
    });

    res.json({ description, listing: updated });
  } catch (err) {
    next(err);
  }
};

// ─── Part 3: Guest Support Chatbot ──────────────────────────────────────────
export const chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, message, listingId } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ error: "sessionId and message are required" });
      return;
    }

    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    let systemPrompt = "You are a helpful guest support assistant for an Airbnb-like platform.";

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (listing) {
        systemPrompt = `
You are a helpful guest support assistant for an Airbnb-like platform.
You are currently helping a guest with questions about this specific listing:

Title: ${listing.title}
Location: ${listing.location}
Price per night: $${listing.pricePerNight}
Max guests: ${listing.guests}
Type: ${listing.type}
Amenities: ${listing.amenities.join(", ")}
Description: ${listing.description}

Answer questions about this listing accurately based on the details above.
If asked something not covered by the listing details, say you don't have that information.
`.trim();
      }
    }

    chatSessions[sessionId].push({ role: "user", content: message });

    // Trim to last 10 exchanges (20 messages)
    if (chatSessions[sessionId].length > 20) {
      chatSessions[sessionId] = chatSessions[sessionId].slice(-20);
    }

    const messages = [
      new SystemMessage(systemPrompt),
      ...chatSessions[sessionId].map((m) =>
        m.role === "user" ? new HumanMessage(m.content) : new SystemMessage(m.content)
      ),
    ];

    const response = await model.invoke(messages);
    const reply = (response.content as string).trim();

    chatSessions[sessionId].push({ role: "assistant", content: reply });

    res.json({
      response: reply,
      sessionId,
      messageCount: chatSessions[sessionId].length,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Part 4: AI Booking Recommendation ──────────────────────────────────────
export const recommend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId as string;

    const bookings = await prisma.booking.findMany({
      where: { guestId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { listing: true },
    });

    if (bookings.length === 0) {
      res.status(400).json({ error: "No booking history found. Make some bookings first to get recommendations." });
      return;
    }

    const bookedListingIds = bookings.map((b) => b.listingId);

    const historySummary = bookings
      .map((b) => `- ${b.listing.type} in ${b.listing.location}, $${b.listing.pricePerNight}/night, ${b.listing.guests} guests max`)
      .join("\n");

    const prompt = `
You are a travel recommendation engine.
Analyze this user's booking history and return ONLY a JSON object with no explanation.

Booking history:
${historySummary}

Return only this JSON format:
{
  "preferences": "string describing what the user likes",
  "searchFilters": {
    "location": "string or null",
    "type": "APARTMENT or HOUSE or VILLA or CABIN or null",
    "maxPrice": number or null,
    "guests": number or null
  },
  "reason": "string explaining the recommendation"
}
Return only JSON, no markdown, no explanation.
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const responseText = response.content as string;

    let aiResult: any;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(clean);
    } catch {
      res.status(500).json({ error: "AI returned invalid response, please try again" });
      return;
    }

    const { searchFilters, preferences, reason } = aiResult;
    const where: any = { id: { notIn: bookedListingIds } };
    if (searchFilters.location) where.location = { contains: searchFilters.location, mode: "insensitive" };
    if (searchFilters.type) where.type = searchFilters.type;
    if (searchFilters.maxPrice) where.pricePerNight = { lte: searchFilters.maxPrice };
    if (searchFilters.guests) where.guests = { gte: searchFilters.guests };

    const recommendations = await prisma.listing.findMany({
      where,
      take: 5,
      include: { host: { select: { name: true } } },
    });

    res.json({ preferences, reason, searchFilters, recommendations });
  } catch (err) {
    next(err);
  }
};

// ─── Part 5: Review Summarizer ───────────────────────────────────────────────
export const reviewSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const cacheKey = `review-summary:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { listingId: id },
      include: { user: { select: { name: true } } },
    });

    if (reviews.length < 3) {
      res.status(400).json({ error: "Not enough reviews to generate a summary (minimum 3 required)" });
      return;
    }

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const reviewText = reviews
      .map((r) => `${r.user.name} (${r.rating}/5): ${r.comment}`)
      .join("\n");

    const prompt = `
Analyze these guest reviews and return ONLY a JSON object with no explanation.

Reviews:
${reviewText}

Return only this JSON format:
{
  "summary": "2-3 sentence overall summary",
  "positives": ["thing 1", "thing 2", "thing 3"],
  "negatives": ["complaint 1"]
}
Return only JSON, no markdown, no explanation.
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const responseText = response.content as string;

    let aiResult: any;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(clean);
    } catch {
      res.status(500).json({ error: "AI returned invalid response, please try again" });
      return;
    }

    const result = {
      summary: aiResult.summary,
      positives: aiResult.positives,
      negatives: aiResult.negatives || [],
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
    };

    setCache(cacheKey, result, 600);
    res.json(result);
  } catch (err) {
    next(err);
  }
};