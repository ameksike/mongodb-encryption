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
import { buildQuery, getCollection } from "./utils.js";
import { employees as seedDocs } from "./seed.js";

// ─── Public API ─────────────────────────────────────────────────────────────



/**
 * Insert a new employee document.
 *
 * @param {Object} doc - Employee document.
 * @returns {Promise<Object>} Inserted document with `_id`.
 */
export async function create(doc) {
    const coll = getCollection();
    const result = await coll.insertOne(doc);
    return { _id: result.insertedId, ...doc };
}

/**
 * Aggregation projection that strips the internal `__safeContent__` field.
 * @type {Object}
 */
const WITHOUT_SAFE_CONTENT = { $unset: "__safeContent__" };

/**
 * Find a single employee by ObjectId.
 *
 * @param {string} id - Hex string ObjectId.
 * @returns {Promise<Object|null>}
 */
export async function findById(id) {
    const coll = getCollection();
    const [doc = null] = await coll.aggregate([
        { $match: { _id: new ObjectId(id) } },
        WITHOUT_SAFE_CONTENT,
    ]).toArray();
    return doc;
}

/**
 * Find employees matching the given search params.
 * Returns all documents when no params are provided.
 *
 * @param {Object} [params={}] - Query-string parameters.
 * @returns {Promise<Object[]>}
 */
export async function findAll(params = {}) {
    const coll = getCollection();
    const filter = buildQuery(params);
    const pipeline = [
        ...(Object.keys(filter).length ? [{ $match: filter }] : []),
        WITHOUT_SAFE_CONTENT,
    ];
    return coll.aggregate(pipeline).toArray();
}

/**
 * Update a single employee by ObjectId.
 * Uses updateOne + findOne because QE does not support findAndModify with new:true.
 *
 * @param {string} id      - Hex string ObjectId.
 * @param {Object} changes - Fields to update.
 * @returns {Promise<Object|null>} Updated document, or null if not found.
 */
export async function update(id, changes) {
    const coll = getCollection();
    const filter = { _id: new ObjectId(id) };
    const result = await coll.updateOne(filter, { $set: changes });
    if (result.matchedCount === 0) return null;
    return coll.findOne(filter);
}

/**
 * Delete a single employee by ObjectId.
 *
 * @param {string} id - Hex string ObjectId.
 * @returns {Promise<{deleted: number}>}
 */
export async function remove(id) {
    const coll = getCollection();
    const result = await coll.deleteOne({ _id: new ObjectId(id) });
    return { deleted: result.deletedCount };
}

/**
 * Insert the sample dataset from seed.js.
 *
 * @returns {Promise<{inserted: number}>}
 */
export async function seedData() {
    const coll = getCollection();
    const result = await coll.insertMany(seedDocs);
    return { inserted: result.insertedCount };
}
