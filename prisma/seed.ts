import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // 1. Cleanup in reverse dependency order
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create users with create (UUIDs auto-generated)
  const alice = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      username: "alice_host",
      phone: "1234567",
      password: await bcrypt.hash("password123", 10),
      role: "HOST",
      avatar: "https://i.pravatar.cc/150?u=alice",
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      username: "bob_host",
      phone: "1234568",
      password: await bcrypt.hash("password123", 10),
      role: "HOST",
      avatar: "https://i.pravatar.cc/150?u=bob",
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: "Carol White",
      email: "carol@example.com",
      username: "carol_guest",
      phone: "1234569",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
      avatar: "https://i.pravatar.cc/150?u=carol",
    },
  });

  const david = await prisma.user.create({
    data: {
      name: "David Brown",
      email: "david@example.com",
      username: "david_guest",
      phone: "1234570",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
      avatar: "https://i.pravatar.cc/150?u=david",
    },
  });

  const eve = await prisma.user.create({
    data: {
      name: "Eve Davis",
      email: "eve@example.com",
      username: "eve_guest",
      phone: "1234571",
      password: await bcrypt.hash("password123", 10),
      role: "GUEST",
      avatar: "https://i.pravatar.cc/150?u=eve",
    },
  });

  console.log("✅ Users created");

  // 3. Create listings individually (need ids for bookings)
  const apartment = await prisma.listing.create({
    data: {
      title: "Modern Downtown Apartment",
      description: "A stylish apartment in the heart of the city with amazing views.",
      location: "New York",
      pricePerNight: 150,
      guests: 2,
      type: "APARTMENT",
      amenities: ["WiFi", "Kitchen", "Air Conditioning", "Gym"],
      rating: 4.8,
      hostId: alice.id,
    },
  });

  const house = await prisma.listing.create({
    data: {
      title: "Cozy Family House",
      description: "A spacious house perfect for families with a large backyard.",
      location: "Los Angeles",
      pricePerNight: 220,
      guests: 6,
      type: "HOUSE",
      amenities: ["WiFi", "Pool", "Parking", "BBQ", "Garden"],
      rating: 4.6,
      hostId: alice.id,
    },
  });

  const villa = await prisma.listing.create({
    data: {
      title: "Luxury Beachfront Villa",
      description: "A stunning villa right on the beach with private pool.",
      location: "Miami",
      pricePerNight: 500,
      guests: 10,
      type: "VILLA",
      amenities: ["WiFi", "Private Pool", "Beach Access", "Chef Kitchen", "Gym", "Sauna"],
      rating: 4.9,
      hostId: bob.id,
    },
  });

  const cabin = await prisma.listing.create({
    data: {
      title: "Rustic Mountain Cabin",
      description: "A charming cabin surrounded by nature, perfect for a quiet retreat.",
      location: "Denver",
      pricePerNight: 120,
      guests: 4,
      type: "CABIN",
      amenities: ["Fireplace", "Hiking Trails", "WiFi", "Hot Tub"],
      rating: 4.7,
      hostId: bob.id,
    },
  });

  console.log("✅ Listings created");

  // 4. Create bookings with future dates
  await prisma.booking.create({
    data: {
      guestId: carol.id,
      listingId: apartment.id,
      checkIn: new Date("2026-07-01T00:00:00.000Z"),
      checkOut: new Date("2026-07-05T00:00:00.000Z"),
      totalPrice: 4 * apartment.pricePerNight,
      status: "CONFIRMED",
    },
  });

  await prisma.booking.create({
    data: {
      guestId: david.id,
      listingId: villa.id,
      checkIn: new Date("2026-08-10T00:00:00.000Z"),
      checkOut: new Date("2026-08-17T00:00:00.000Z"),
      totalPrice: 7 * villa.pricePerNight,
      status: "PENDING",
    },
  });

  await prisma.booking.create({
    data: {
      guestId: eve.id,
      listingId: cabin.id,
      checkIn: new Date("2026-09-05T00:00:00.000Z"),
      checkOut: new Date("2026-09-10T00:00:00.000Z"),
      totalPrice: 5 * cabin.pricePerNight,
      status: "CONFIRMED",
    },
  });

  console.log("✅ Bookings created");
  console.log(`
📊 Seed summary:
   Users:    5 (2 hosts, 3 guests)
   Listings: 4 (APARTMENT, HOUSE, VILLA, CABIN)
   Bookings: 3 (2 CONFIRMED, 1 PENDING)
  `);
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());