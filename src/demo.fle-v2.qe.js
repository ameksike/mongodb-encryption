import dotenv from "dotenv";
dotenv.config({ override: true });

import { MongoClient, ClientEncryption } from 'mongodb';
import { getMasterKey } from "./lib/key.vault.js";

try {

    const keyVaultNamespace = 'encryption.keyVault';

    const kmsProviders = {
        local: { key: await getMasterKey() },
    };

    const {
        MONGODB_URI = "mongodb://localhost:27017",
        MONGODB_DATABASE = "demo",
        MONGODB_COLLECTION = "customers_csfle",
        MONGODB_CRYPT_SHARED_LIB_PATH,
    } = process.env;

    // Esquema de QE: encryptedFieldsMap + queries
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

    const encryptionOpts = {
        keyVaultNamespace,
        kmsProviders,
        // encryptedFieldsMap,  // <- CLAVE: encryptedFieldsMap => QE
        extraOptions: {
            cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
        },
    };

    const client = new MongoClient(MONGODB_URI, { autoEncryption: encryptionOpts });
    await client.connect();

    // Opcionalmente, crear la colección cifrada con helper de QE
    const clientEncryption = new ClientEncryption(client, encryptionOpts);

    await clientEncryption.createEncryptedCollection(
        client.db(MONGODB_DATABASE),
        MONGODB_COLLECTION,
        { 'provider': 'local', 'createCollectionOptions': encryptedFieldsMap },
    );

    const coll = client.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);

    await coll.insertOne({ name: 'Alice', ssn: '123-45-6789' });
    const found = await coll.findOne({ 'ssn': '123-45-6789' });
    console.log(found);
} catch (error) {
    console.error("Error:", error);
}