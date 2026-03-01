/**
 * Express server for the QE REST service.
 * Connects to MongoDB with Queryable Encryption, then starts listening.
 *
 * @module service/server
 */

import express from "express";
import { initDatabase } from "./utils.js";
import employeeRoutes from "./routes.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use("/api/employees", employeeRoutes);

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

/**
 * Initialise the database and start the HTTP server.
 *
 * @returns {Promise<void>}
 */
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
