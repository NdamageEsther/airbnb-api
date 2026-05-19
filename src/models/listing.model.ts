export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  pricePerNight: number;
  guests: number;
  type: "apartment" | "house" | "villa" | "cabin";
  amenities: string[];
  rating?: number;
  host: string;
}

export const listings: Listing[] = [
  {
    id: 1,
    title: "Cozy Apartment in Kigali City Center",
    description: "A bright, modern apartment steps away from Kigali's best restaurants and shops.",
    location: "Kigali, Rwanda",
    pricePerNight: 75,
    guests: 2,
    type: "apartment",
    amenities: ["WiFi", "Air Conditioning", "Kitchen", "TV"],
    rating: 4.8,
    host: "alice_m",
  },
  {
    id: 2,
    title: "Lakeside Villa with Stunning Views",
    description: "A spacious villa overlooking Lake Kivu — perfect for families and groups.",
    location: "Gisenyi, Rwanda",
    pricePerNight: 200,
    guests: 8,
    type: "villa",
    amenities: ["WiFi", "Pool", "BBQ", "Parking", "Kitchen", "Lake View"],
    rating: 4.9,
    host: "alice_m",
  },
  {
    id: 3,
    title: "Rustic Forest Cabin near Volcanoes Park",
    description: "Escape into nature with this charming cabin near Volcanoes National Park.",
    location: "Musanze, Rwanda",
    pricePerNight: 120,
    guests: 4,
    type: "cabin",
    amenities: ["Fireplace", "Hiking Trails", "Parking", "Kitchen"],
    rating: 4.7,
    host: "alice_m",
  },
];
