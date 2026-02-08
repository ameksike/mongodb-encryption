import dotenv from "dotenv";
dotenv.config({ override: true });

import { FLEv2 } from "./lib/FLEv2.js";
import { getMasterKey } from "./lib/key.vault.js";

try {

    // Load environment variables
    const {
        MONGODB_URI = "mongodb://localhost:27017",
        MONGODB_DATABASE = "demo",
        KEYVAULT_DATABASE = "encryption",
        KEYVAULT_COLLECTION = "keyVault",
        MONGODB_COLLECTION = "customers_csfle",
        MONGODB_CRYPT_SHARED_LIB_PATH,
    } = process.env;

    // Initialize FLEv2 handler
    const fleV2 = new FLEv2({
        uri: MONGODB_URI,
        kmsProviders: {
            local: {
                key: await getMasterKey(),
            }
        },
        databaseName: MONGODB_DATABASE,
        collectionName: MONGODB_COLLECTION,
        keyVaultNamespace: `${KEYVAULT_DATABASE}.${KEYVAULT_COLLECTION}`,
        cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
    });

    // Define QE schema map for the encrypted collection
    const encryptedFieldsMap = {
        encryptedFields: {
            fields: [
                {
                    path: 'ssn',
                    bsonType: 'string',
                    queries: { queryType: 'equality', contention: 0 },
                },
            ],
        },
    };

    // Get or create the encrypted MongoClient with QE schema map
    await fleV2.getEncryptedClient({ schemaMap: encryptedFieldsMap });

    // Get the encrypted collection
    const coll = fleV2.getCollection();

    // Insert and query documents
    await coll.insertOne({ name: 'Julia', ssn: '123-45-5555' });

    // Query the document using the encrypted field
    const found = await coll.findOne({ 'ssn': '123-45-5555' });

    // Log the found document
    console.log(found);

} catch (error) {
    console.error("Error:", error);
}