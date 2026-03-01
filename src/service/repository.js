/**
 * Repository – CRUD operations and QE query builders
 *
 * This module is the **data layer**. It knows about MongoDB queries but nothing
 * about HTTP. Every search type supported by Queryable Encryption has its own
 * small builder function so the mapping from search criteria → QE filter is
 * easy to follow.
 *
 * Supported QE query types built here:
 *   equality   → $eq   (ssn, employeeId)
 *   range      → $gte / $lte  (age, salary, birthDate)
 *   prefix     → $encStrStartsWith  (email)     [Preview – 8.2]
 *   suffix     → $encStrEndsWith    (phone)     [Preview – 8.2]
 *   substring  → $encStrContains    (address)   [Preview – 8.2]
 */

import { ObjectId } from "mongodb";
import { getCollection } from "./db.js";
import { employees as seedDocs } from "./seed.js";

// ─── Query Builders ─────────────────────────────────────────────────────────
// Each builder receives the raw value(s) from the HTTP layer and returns
// a partial MongoDB filter object, or null if the param was not provided.

/** Equality on encrypted string field */
function eqString(field, value) {
    if (value === undefined) return null;
    return { [field]: value };
}

/** Equality on encrypted int field */
function eqInt(field, value) {
    if (value === undefined) return null;
    return { [field]: parseInt(value, 10) };
}

/** Range on encrypted int field (min / max) */
function rangeInt(field, min, max) {
    if (min === undefined && max === undefined) return null;
    const cond = {};
    if (min !== undefined) cond.$gte = parseInt(min, 10);
    if (max !== undefined) cond.$lte = parseInt(max, 10);
    return { [field]: cond };
}

/** Range on encrypted double field (min / max) */
function rangeDouble(field, min, max) {
    if (min === undefined && max === undefined) return null;
    const cond = {};
    if (min !== undefined) cond.$gte = parseFloat(min);
    if (max !== undefined) cond.$lte = parseFloat(max);
    return { [field]: cond };
}

/** Range on encrypted date field (from / to) */
function rangeDate(field, from, to) {
    if (from === undefined && to === undefined) return null;
    const cond = {};
    if (from !== undefined) cond.$gte = new Date(from);
    if (to !== undefined) cond.$lte = new Date(to);
    return { [field]: cond };
}

/** Prefix search on encrypted string field (Preview – 8.2) */
function prefix(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrStartsWith: value } };
}

/** Suffix search on encrypted string field (Preview – 8.2) */
function suffix(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrEndsWith: value } };
}

/** Substring search on encrypted string field (Preview – 8.2) */
function substring(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrContains: value } };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a MongoDB filter from search parameters.
 *
 * @param {Object} params – key/value pairs coming from HTTP query string
 * @returns {Object} MongoDB query filter (may be empty `{}` to match all)
 */
export function buildQuery(params) {
    const parts = [
        // Equality
        eqString("ssn", params.ssn),
        eqInt("employeeId", params.employeeId),

        // Range – int
        rangeInt("age", params.ageMin, params.ageMax),

        // Range – double
        rangeDouble("salary", params.salaryMin, params.salaryMax),

        // Range – date
        rangeDate("birthDate", params.birthDateFrom, params.birthDateTo),

        // Prefix / Suffix / Substring (Preview)
        prefix("email", params.emailPrefix),
        suffix("phone", params.phoneSuffix),
        substring("address", params.addressContains),

        // Unencrypted helper filters
        params.name ? { name: params.name } : null,
        params.department ? { department: params.department } : null,
    ].filter(Boolean);

    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0];
    return { $and: parts };
}

/**
 * Insert a new employee document.
 */
export async function create(doc) {
    const coll = getCollection();
    const result = await coll.insertOne(doc);
    return { _id: result.insertedId, ...doc };
}

/**
 * Find a single employee by its ObjectId.
 */
export async function findById(id) {
    const coll = getCollection();
    return coll.findOne({ _id: new ObjectId(id) });
}

/**
 * Find employees matching the given search params.
 * When no params are provided it returns all documents.
 */
export async function findAll(params = {}) {
    const coll = getCollection();
    const filter = buildQuery(params);
    return coll.find(filter).toArray();
}

/**
 * Update a single employee by ObjectId.
 * Returns the updated document.
 */
export async function update(id, changes) {
    const coll = getCollection();
    const result = await coll.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: changes },
        { returnDocument: "after" },
    );
    return result;
}

/**
 * Delete a single employee by ObjectId.
 */
export async function remove(id) {
    const coll = getCollection();
    const result = await coll.deleteOne({ _id: new ObjectId(id) });
    return { deleted: result.deletedCount };
}

/**
 * Insert the sample dataset from seed.js.
 * Useful for quickly populating the collection for demo purposes.
 */
export async function seedData() {
    const coll = getCollection();
    const result = await coll.insertMany(seedDocs);
    return { inserted: result.insertedCount };
}
