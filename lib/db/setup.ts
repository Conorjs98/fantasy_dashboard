import { initDb } from "./index";

async function main() {
  console.log("Running database setup...");
  await initDb();
  console.log("Database setup complete — recaps and manager_notes tables created.");
}

main().catch((err) => {
  console.error("Database setup failed:", err);
  process.exit(1);
});
