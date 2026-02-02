import * as crypto from "node:crypto";

// Vault configuration from environment variables
const {
    KEYVAULT_ADDR = 'http://127.0.0.1:8200',
    KEYVAULT_TOKEN = 'root',
    KEYVAULT_PATH = 'secret/data/mongodb/master-key'
} = process.env;

/**
 * Retrieve or create master key in Vault
 * @returns {Promise<Buffer>} - 96-byte master key buffer
 */
export async function getMasterKey() {

    // Try to get existing master key from Vault
    let masterKeyBase64 = await get('masterKeyBase64');

    // If not found, create and store a new one
    if (!masterKeyBase64) {
        masterKeyBase64 = crypto.randomBytes(96).toString("base64");
        await save(masterKeyBase64, 'masterKeyBase64');
    }

    // Convert base64 -> Buffer (96 bytes)
    let masterKeyBuffer = Buffer.from(masterKeyBase64, "base64");

    // Validate length
    if (masterKeyBuffer.length !== 96) {
        throw new Error(`Invalid master key length: expected 96 bytes, got ${masterKeyBuffer.length}`);
    }

    // Return master key buffer
    return masterKeyBuffer;
}

/**
 * Retrieve master key from Vault
 * @param {string} key - key name to retrieve
 * @returns {Promise<string|null>} - base64-encoded master key or null if not found
 */
export async function get(key = 'masterKeyBase64') {
    // Retrieve master key from Vault
    const url = `${KEYVAULT_ADDR}/v1/${KEYVAULT_PATH}`;

    // Fetch the master key
    const res = await fetch(url, {
        method: "GET",
        headers: { "X-Vault-Token": KEYVAULT_TOKEN },
    });

    // Check for errors
    if (!res.ok) {
        const text = await res.text();
        return null
    }

    // Parse response
    const json = await res.json();
    let data = json?.data?.data;

    // Return the requested key value
    if (!data) {
        return null
    }

    // Return the key value
    return data[key];
}

/**
 * Store master key in Vault
 * @param {string} value - base64-encoded master key
 * @param {string} key - key name to store under
 * @returns {Promise<void>}
 */
export async function save(value, key = 'masterKeyBase64') {
    // Store master key in Vault
    const url = `${KEYVAULT_ADDR}/v1/${KEYVAULT_PATH}`;

    // Store the master key
    const storeRes = await fetch(url, {
        method: "POST",
        headers: {
            "X-Vault-Token": KEYVAULT_TOKEN,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            data: { [key]: value },
        }),
    });

    // Check for errors
    if (!storeRes.ok) {
        const text = await storeRes.text();
        throw new Error(`Error storing master key to Vault: ${storeRes.status} ${storeRes.statusText} - ${text}`);
    }
}