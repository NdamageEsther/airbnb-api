import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.0.0",
      description: "A full-featured Airbnb-like REST API with authentication, listings, bookings, and file uploads.",
    },
    servers: [
      { url: "https://airbnb-api-h7pm.onrender.com", description: "Production server" },
      { url: "http://localhost:3000/api/v1", description: "Local server" }
    ],
    
    
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(spec);
  });
  console.log("📚 Swagger docs available at http://localhost:3000/api-docs");
}