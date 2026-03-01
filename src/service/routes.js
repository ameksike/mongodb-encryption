/**
 * Routes – Application layer (HTTP concerns only)
 *
 * Each handler:
 *  1. Parses / validates HTTP input
 *  2. Delegates to the repository (data layer)
 *  3. Returns a JSON response
 *
 * No MongoDB query logic lives here – that belongs in repository.js.
 */

import { Router } from "express";
import * as repo from "./repository.js";

const router = Router();

// ── POST /api/employees/seed ─────────────────────────────────────────────────
// Must be registered BEFORE the /:id route so Express doesn't treat "seed" as an id.
router.post("/seed", async (_req, res, next) => {
    try {
        const result = await repo.seedData();
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

// ── POST /api/employees ──────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
    try {
        const doc = req.body;
        // Coerce types that arrive as JSON strings
        if (doc.employeeId) doc.employeeId = parseInt(doc.employeeId, 10);
        if (doc.age) doc.age = parseInt(doc.age, 10);
        if (doc.salary) doc.salary = parseFloat(doc.salary);
        if (doc.birthDate) doc.birthDate = new Date(doc.birthDate);

        const created = await repo.create(doc);
        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/employees ───────────────────────────────────────────────────────
// All search parameters are passed as query-string key/values.
// See repository.js → buildQuery() for the complete mapping.
router.get("/", async (req, res, next) => {
    try {
        const results = await repo.findAll(req.query);
        res.json(results);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/employees/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
    try {
        const doc = await repo.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err) {
        next(err);
    }
});

// ── PUT /api/employees/:id ───────────────────────────────────────────────────
router.put("/:id", async (req, res, next) => {
    try {
        const changes = req.body;
        if (changes.employeeId) changes.employeeId = parseInt(changes.employeeId, 10);
        if (changes.age) changes.age = parseInt(changes.age, 10);
        if (changes.salary) changes.salary = parseFloat(changes.salary);
        if (changes.birthDate) changes.birthDate = new Date(changes.birthDate);

        const updated = await repo.update(req.params.id, changes);
        if (!updated) return res.status(404).json({ error: "Not found" });
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// ── DELETE /api/employees/:id ────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
    try {
        const result = await repo.remove(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
