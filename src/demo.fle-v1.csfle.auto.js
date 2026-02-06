import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { getMasterKey } from "./lib/key.vault.js";
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
            MONGODB_CRYPT_SHARED_LIB_PATH,
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
            cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
        });

        // Get data key ID from key vault (or create if it doesn't exist)
        const dataKeyId = await fleV1.getKeyVaultKeyID(DATA_KEY_ALT_NAME, "local");

        // Define schema map for CSFLE
        const schemaMap = {
            [`${MONGODB_DATABASE}.${MONGODB_COLLECTION}`]: {
                bsonType: "object",
                properties: {
                    ssn: {
                        encrypt: {
                            keyId: [dataKeyId],
                            bsonType: "string",
                            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                        }
                    },
                    email: {
                        encrypt: {
                            keyId: [dataKeyId],
                            bsonType: "string",
                            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
                        }
                    }
                }
            }
        };

        // Get encrypted MongoClient
        const encryptedClient = await fleV1.getEncryptedClient({
            schemaMap
        });

        // Use the encrypted client to perform operations
        const coll = encryptedClient.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);

        // Insert a sample document
        const sampleCustomer = {
            name: "Alice",
            ssn: "123-45-6789",
            email: "alice@example.com"
        };

        // Insert the document
        const insertResult = await coll.insertOne(sampleCustomer);

        // Retrieve and decrypt the document
        const decrypted = await coll.findOne({ ssn: sampleCustomer.ssn });

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
