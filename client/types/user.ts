export interface User {
  _id: string;
  name: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  phone?: string;
  honorScore?: number;
  avatar?: string;
  username?: string | null; // SEO-friendly profile URL slug e.g. "dedeep-reddy"
}
