import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { getMasterKey } from "./lib/key.vault.js";
// import { getMasterKey } from "./lib/key.local.js";
import { FLEv1 } from "./lib/FLEv1.js";

dotenv.config({ override: true });

(async () => {
    try {
        // Load environment variables
        const {
            MONGODB_URI = "mongodb://localhost:27017",
            KEYVAULT_DATABASE = "encryption",
            KEYVAULT_COLLECTION = "keyVault",
            DATA_KEY_ALT_NAME = "demo-data-key",
            MONGODB_DATABASE = "demo",
            MONGODB_COLLECTION = "customers_csfle",
        } = process.env;

        // Initialize CSFLE Auto handler
        const fleV1 = new FLEv1({
            uri: MONGODB_URI,
            kmsProviders: {
                local: {
                    key: await getMasterKey(),
                }
            },
            keyVaultDatabase: KEYVAULT_DATABASE,
            keyVaultCollection: KEYVAULT_COLLECTION,
        });

        // Use the common client to perform operations
        const client = new MongoClient(MONGODB_URI);
        const coll = client.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);

        // Insert a sample document
        const plaintext = {
            name: "Lucia",
            ssn: "456-45-6789",
            email: "lucia@example.com"
        };

        const encryptedDoc = {
            name: plaintext.name,
            ssn: await fleV1.encrypt(plaintext.ssn, { keyAltName: DATA_KEY_ALT_NAME }),
            email: await fleV1.encrypt(plaintext.email, {
                keyAltName: DATA_KEY_ALT_NAME,
                kmsProviderName: "local",
                algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
            })
        };

        // Insert the document
        const insertResult = await coll.insertOne(encryptedDoc);

        // Retrieve and decrypt the document
        const decrypted = await coll.findOne({ ssn: encryptedDoc.ssn });

        // Retrieve the raw document from the key vault to verify encryption
        const raw = await (new MongoClient(MONGODB_URI))
            .db(MONGODB_DATABASE)
            .collection(MONGODB_COLLECTION)
            .findOne({ _id: insertResult.insertedId });

        // Check if the ssn field is encrypted in the raw document
        const ssnIsEncrypted = fleV1.isEncryptedValue(raw?.ssn);

        // Output results
        console.log("Decrypted customer ssn:", decrypted);
        console.log("SSN stored as ciphertext:", ssnIsEncrypted);
    }
    catch (err) {
        console.error("Error running CSFLE demo:", err);
    }
})()
