import dotenv from "dotenv";
dotenv.config({ override: true });

import { MongoClient, ClientEncryption } from 'mongodb';
import { getMasterKey } from "./lib/key.vault.js";

try {
    // Define key vault namespace
    const keyVaultNamespace = 'encryption.keyVault';

    // Define KMS providers
    const kmsProviders = {
        local: { key: await getMasterKey() },
    };

    // Load environment variables
    const {
        MONGODB_URI = "mongodb://localhost:27017",
        MONGODB_DATABASE = "demo",
        MONGODB_COLLECTION = "customers_csfle",
        MONGODB_CRYPT_SHARED_LIB_PATH,
    } = process.env;

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
    const encryptionOpts = {
        keyVaultNamespace,
        kmsProviders,
        extraOptions: {
            cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
        },
    };

    // Create the encrypted client with autoEncryption options
    const client = new MongoClient(MONGODB_URI, { autoEncryption: encryptionOpts });
    await client.connect();

    // Create the encrypted collection with the specified schema map
    const clientEncryption = new ClientEncryption(client, encryptionOpts);

    // Create the encrypted collection with the specified schema map
    await clientEncryption.createEncryptedCollection(
        client.db(MONGODB_DATABASE),
        MONGODB_COLLECTION,
        { 'provider': 'local', 'createCollectionOptions': encryptedFieldsMap },
    );

    // Get the encrypted collection
    const coll = client.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);

    // Insert and query documents
    await coll.insertOne({ name: 'Alice', ssn: '123-45-6789' });

    // Query the document using the encrypted field
    const found = await coll.findOne({ 'ssn': '123-45-6789' });

    // Log the found document
    console.log(found);
    
} catch (error) {
    console.error("Error:", error);
}