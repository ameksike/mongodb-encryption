/**
 * Database connection layer – Queryable Encryption via FLEv2
 *
 * Initialises a single encrypted MongoClient through the existing FLEv2 helper
 * and exposes the encrypted collection for the REST service.
 */
import { FLEv2 } from "../lib/FLEv2.js";
import { getMasterKey as getMasterKeyFromVault } from "../lib/key.vault.js";
import { getMasterKey as getMasterKeyFromLocal } from "../lib/key.local.js";
import { encryptedFieldsMap, COLLECTION_NAME, DATABASE_NAME } from "./config.js";

/**
 * Try Vault first; fall back to local file-based key when Vault is unreachable.
 */
async function getMasterKey() {
    try {
        return await getMasterKeyFromVault();
    } catch (err) {
        console.warn("Vault unavailable, falling back to local master key:", err.cause?.code || err.message);
        return await getMasterKeyFromLocal();
    }
}

let fleV2 = null;

/**
 * Initialise (once) the FLEv2 encrypted client and ensure the encrypted
 * collection exists with the schema defined in config.js.
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
    }
    catch (error) {
        console.error("Error initialising database:", error);
        throw error;
    }
}

/**
 * Return the encrypted collection handle.
 * Must call initDatabase() first.
 */
export function getCollection() {
    if (!fleV2) throw new Error("Database not initialised – call initDatabase() first");
    return fleV2.getCollection();
}
