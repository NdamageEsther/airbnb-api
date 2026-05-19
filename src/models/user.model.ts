export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: "host" | "guest";
  avatar?: string;
  bio?: string;
}

export const users: User[] = [
  {
    id: 1,
    name: "Alice Mugisha",
    email: "alice@example.com",
    username: "alice_m",
    phone: "+250781000001",
    role: "host",
    avatar: "https://i.pravatar.cc/150?img=1",
    bio: "Superhost in Kigali with 5 years of experience.",
  },
  {
    id: 2,
    name: "Bob Nkurunziza",
    email: "bob@example.com",
    username: "bob_n",
    phone: "+250782000002",
    role: "guest",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: 3,
    name: "Chloe Uwimana",
    email: "chloe@example.com",
    username: "chloe_u",
    phone: "+250783000003",
    role: "guest",
    bio: "Traveller and food lover.",
  },
];
