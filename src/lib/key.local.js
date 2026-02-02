
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Get filename of current module
const __filename = fileURLToPath(import.meta.url);

// Get directory name of current module
const __dirname = path.dirname(__filename);

// Default path for local master key file
const DEFAULT_KEY_PATH = path.resolve(__dirname, "../../cfg/master-key.bin");

/**
 * Read a 96-byte local master key from disk or create one if missing.
 * This is for demos only—production deployments must use a real KMS.
 * @param {string} keyPath - Path to the master key file
 * @returns {Promise<Buffer>} - 96-byte master key buffer
 */
export async function getMasterKey(keyPath = process.env.MASTER_KEY_PATH || DEFAULT_KEY_PATH) {
    // Resolve full path
    const resolvedPath = path.resolve(keyPath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

    let key;
    try {
        // Try to read existing key from disk
        key = await fs.readFile(resolvedPath);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }

    // If key is missing or invalid length, create a new one
    if (!key || key.length !== 96) {
        key = crypto.randomBytes(96);
        await fs.writeFile(resolvedPath, key);
    }

    // Return the master key buffer
    return key;
}