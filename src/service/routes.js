/**
 * Application layer – Express route handlers.
 * Parses HTTP input, coerces BSON types, and delegates to the repository.
 *
 * @module service/routes
 */

import { Router } from "express";
import * as repo from "./repository.js";
import { coerceTypes } from "./utils.js";

const router = Router();

/**
 * Seed the database with sample employee documents.
 */
router.post("/seed", async (_req, res, next) => {
    try {
        res.status(201).json(await repo.seedData());
    } catch (err) { next(err); }
});

/**
 * Create a new employee document.
 */
router.post("/", async (req, res, next) => {
    try {
        res.status(201).json(await repo.create(coerceTypes(req.body)));
    } catch (err) { next(err); }
});

/**
 * Get all employees, optionally filtered by query-string parameters.
 */
router.get("/", async (req, res, next) => {
    try {
        res.json(await repo.findAll(req.query));
    } catch (err) { next(err); }
});

/**
 * Get a single employee by ObjectId.
 */
router.get("/:id", async (req, res, next) => {
    try {
        const doc = await repo.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err) { next(err); }
});

/**
 * Update a single employee by ObjectId.
 */
router.put("/:id", async (req, res, next) => {
    try {
        const updated = await repo.update(req.params.id, coerceTypes(req.body));
        if (!updated) return res.status(404).json({ error: "Not found" });
        res.json(updated);
    } catch (err) { next(err); }
});

/**
 * Delete a single employee by ObjectId.
 */
router.delete("/:id", async (req, res, next) => {
    try {
        res.json(await repo.remove(req.params.id));
    } catch (err) { next(err); }
});

export default router;
