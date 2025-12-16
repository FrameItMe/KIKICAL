import { initDB, pool } from "../database/db.js";

(async () => {
  try {
    console.log("Initializing database (MySQL)...");
    await initDB();
    console.log("DB ready!");
  } catch (err) {
    console.error("Init DB error:", err);
  } finally {
    await pool.end();
  }
})();

