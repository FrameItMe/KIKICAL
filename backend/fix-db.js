import Database from "better-sqlite3";

try {
  console.log("Opening database...");
  const db = new Database("src/database/kikical.db");
  
  console.log("Setting WAL mode...");
  db.pragma("journal_mode = WAL");
  
  console.log("Setting busy timeout...");
  db.pragma("busy_timeout = 5000");
  
  console.log("Setting synchronous mode...");
  db.pragma("synchronous = NORMAL");
  
  console.log("Verifying settings...");
  const journalMode = db.pragma("journal_mode", { simple: true });
  const busyTimeout = db.pragma("busy_timeout", { simple: true });
  const synchronous = db.pragma("synchronous", { simple: true });
  
  console.log(`Journal mode: ${journalMode}`);
  console.log(`Busy timeout: ${busyTimeout}`);
  console.log(`Synchronous: ${synchronous}`);
  
  db.close();
  console.log("\n✅ Database configuration fixed!");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
