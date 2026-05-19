"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function connectDB() {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
}
exports.default = prisma;
