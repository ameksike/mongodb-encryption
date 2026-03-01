/**
 * Database connection layer using FLEv2 with Queryable Encryption.
 * Tries Vault for the master key first, then falls back to a local file.
 *
 * @module service/db
 */
import { Double } from "mongodb";
import { FLEv2 } from "../lib/FLEv2.js";
import { getMasterKey as getMasterKeyFromVault } from "../lib/key.vault.js";
import { getMasterKey as getMasterKeyFromLocal } from "../lib/key.local.js";
import { encryptedFieldsMap, COLLECTION_NAME, DATABASE_NAME } from "./config.js";

/**
 * Retrieve the 96-byte master key.
 * Falls back to the local file provider when Vault is unreachable.
 *
 * @returns {Promise<Buffer>} 96-byte master key.
 */
export async function getMasterKey() {
    try {
        return await getMasterKeyFromVault();
    } catch (err) {
        console.warn("Vault unavailable, falling back to local master key:", err.cause?.code || err.message);
        return await getMasterKeyFromLocal();
    }
}


// ─── Database ─────────────────────────────────────────────────────────

/** @type {FLEv2 | null} */
let fleV2 = null;

/**
 * Initialise the encrypted client and ensure the collection exists.
 * Subsequent calls are no-ops.
 *
 * @returns {Promise<FLEv2>}
 */
export async function initDatabase() {
    if (fleV2) return fleV2;

    const {
        MONGODB_URI = "mongodb://localhost:27017",
        KEYVAULT_DATABASE = "encryption",
        KEYVAULT_COLLECTION = "keyVault",
        MONGODB_CRYPT_SHARED_LIB_PATH,
    } = process.env;

    try {
        fleV2 = new FLEv2({
            uri: MONGODB_URI,
            kmsProviders: {
                local: { key: await getMasterKey() },
            },
            databaseName: DATABASE_NAME,
            collectionName: COLLECTION_NAME,
            keyVaultNamespace: `${KEYVAULT_DATABASE}.${KEYVAULT_COLLECTION}`,
            cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
        });

        await fleV2.getEncryptedClient({ schemaMap: encryptedFieldsMap });
        return fleV2;
    } catch (error) {
        console.error("Error initialising database:", error);
        throw error;
    }
}

/**
 * Return the encrypted collection handle.
 * Requires {@link initDatabase} to have been called first.
 *
 * @returns {import('mongodb').Collection}
 */
export function getCollection() {
    if (!fleV2) throw new Error("Database not initialised – call initDatabase() first");
    return fleV2.getCollection();
}

// ─── Query Builders ─────────────────────────────────────────────────────────

/**
 * @param {string} field
 * @param {string} [value]
 * @returns {Object|null}
 */
export function eqString(field, value) {
    if (value === undefined) return null;
    return { [field]: value };
}

/**
 * @param {string} field
 * @param {string} [value]
 * @returns {Object|null}
 */
export function eqInt(field, value) {
    if (value === undefined) return null;
    return { [field]: parseInt(value, 10) };
}

/**
 * @param {string} field
 * @param {string} [min]
 * @param {string} [max]
 * @returns {Object|null}
 */
export function rangeInt(field, min, max) {
    if (min === undefined && max === undefined) return null;
    const cond = {};
    if (min !== undefined) cond.$gte = parseInt(min, 10);
    if (max !== undefined) cond.$lte = parseInt(max, 10);
    return { [field]: cond };
}

/**
 * Values are wrapped with BSON Double to match the encrypted field type.
 *
 * @param {string} field
 * @param {string} [min]
 * @param {string} [max]
 * @returns {Object|null}
 */
export function rangeDouble(field, min, max) {
    if (min === undefined && max === undefined) return null;
    const cond = {};
    if (min !== undefined) cond.$gte = new Double(parseFloat(min));
    if (max !== undefined) cond.$lte = new Double(parseFloat(max));
    return { [field]: cond };
}

/**
 * @param {string} field
 * @param {string} [from] - ISO 8601 date string.
 * @param {string} [to]   - ISO 8601 date string.
 * @returns {Object|null}
 */
export function rangeDate(field, from, to) {
    if (from === undefined && to === undefined) return null;
    const cond = {};
    if (from !== undefined) cond.$gte = new Date(from);
    if (to !== undefined) cond.$lte = new Date(to);
    return { [field]: cond };
}

/**
 * @param {string} field
 * @param {string} [value]
 * @returns {Object|null}
 */
export function prefix(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrStartsWith: value } };
}

/**
 * @param {string} field
 * @param {string} [value]
 * @returns {Object|null}
 */
export function suffix(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrEndsWith: value } };
}

/**
 * @param {string} field
 * @param {string} [value]
 * @returns {Object|null}
 */
export function substring(field, value) {
    if (value === undefined) return null;
    return { [field]: { $encStrContains: value } };
}

/**
 * Build a MongoDB filter from HTTP query-string parameters.
 * Returns an empty object when no params are provided.
 *
 * @param {Object} params - Key/value pairs from the query string.
 * @returns {Object} MongoDB filter.
 */
export function buildQuery(params) {
    const parts = [
        eqString("ssn", params.ssn),
        eqInt("employeeId", params.employeeId),
        rangeInt("age", params.ageMin, params.ageMax),
        rangeDouble("salary", params.salaryMin, params.salaryMax),
        rangeDate("birthDate", params.birthDateFrom, params.birthDateTo),
        prefix("email", params.emailPrefix),
        suffix("phone", params.phoneSuffix),
        substring("address", params.addressContains),
        params.name ? { name: params.name } : null,
        params.department ? { department: params.department } : null,
    ].filter(Boolean);

    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0];
    return { $and: parts };
}

/**
 * Coerce JSON body fields to the BSON types expected by QE encrypted fields.
 *
 * @param {Object} doc - Request body.
 * @returns {Object} The same object, mutated in place.
 */
export function coerceTypes(doc) {
    if (doc.employeeId != null) doc.employeeId = parseInt(doc.employeeId, 10);
    if (doc.age != null) doc.age = parseInt(doc.age, 10);
    if (doc.salary != null) doc.salary = new Double(parseFloat(doc.salary));
    if (doc.birthDate) doc.birthDate = new Date(doc.birthDate);
    return doc;
}