/**
 * Entry point – QE REST Service
 *
 * Starts an Express server that exposes a CRUD API over a MongoDB collection
 * protected with Queryable Encryption.
 *
 * Usage:  npm run service:qe
 */

import express from "express";
import { initDatabase } from "./db.js";
import employeeRoutes from "./routes.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Register routes
app.use("/api/employees", employeeRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

// Boot sequence: connect to MongoDB first, then listen
export async function start() {
    try {
        console.log("Connecting to MongoDB with Queryable Encryption…");
        await initDatabase();
        console.log("Database ready.");

        app.listen(PORT, () => {
            console.log(`QE REST Service listening on http://localhost:${PORT}`);
            console.log(`Try: GET http://localhost:${PORT}/api/employees`);
        });
    } catch (err) {
        console.error("Failed to start:", err);
        process.exit(1);
    }
}