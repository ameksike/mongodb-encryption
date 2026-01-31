import * as crypto from "crypto";

const {
    KEYVAULT_ADDR = 'http://127.0.0.1:8200',
    KEYVAULT_TOKEN = 'root',
    KEYVAULT_PATH = 'secret/data/mongodb/master-key'
} = process.env;

export async function getMasterKey() {

    let masterKeyBase64 = await get('masterKeyBase64');

    if (!masterKeyBase64) {
        masterKeyBase64 = crypto.randomBytes(96).toString("base64");
        await save(masterKeyBase64, 'masterKeyBase64');
    }

    // Convert base64 -> Buffer (96 bytes)
    let masterKeyBuffer = Buffer.from(masterKeyBase64, "base64");

    if (masterKeyBuffer.length !== 96) {
        throw new Error(`Invalid master key length: expected 96 bytes, got ${masterKeyBuffer.length}`);
    }

    return masterKeyBuffer;
}

/**
 * Retrieve master key from Vault
 * @param {*} key
 * @returns 
 */
export async function get(key = 'masterKeyBase64') {
    const url = `${KEYVAULT_ADDR}/v1/${KEYVAULT_PATH}`;

    const res = await fetch(url, {
        method: "GET",
        headers: { "X-Vault-Token": KEYVAULT_TOKEN },
    });

    if (!res.ok) {
        const text = await res.text();
        return null
    }

    const json = await res.json();
    let data = json?.data?.data;

    if (!data) {
        return null
    }

    return data[key];
}

/**
 * Store master key in Vault
 * @param {*} value 
 * @param {*} key 
 */
export async function save(value, key = 'masterKeyBase64') {
    const url = `${KEYVAULT_ADDR}/v1/${KEYVAULT_PATH}`;

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

    if (!storeRes.ok) {
        const text = await storeRes.text();
        throw new Error(`Error storing master key to Vault: ${storeRes.status} ${storeRes.statusText} - ${text}`);
    }
}