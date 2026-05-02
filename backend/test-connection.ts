import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" }); // charge le .env.local

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
});

AppDataSource.initialize()
  .then(() => {
    console.log("✅ Connected to Supabase successfully!");
  })
  .catch((err) => {
    console.error("❌ Connection failed:", err);
  });