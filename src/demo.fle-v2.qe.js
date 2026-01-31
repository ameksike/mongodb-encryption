import dotenv from 'dotenv';

dotenv.config({ override: true });

import { MongoClient, ClientEncryption } from "mongodb";
import { getMasterKey } from "./lib/key.vault.js";
import { readFile } from 'fs/promises';

// const qeUsers = JSON.parse(await readFile(new URL('./schema/qe.users.json', import.meta.url), 'utf8'));

const {
    KEYVAULT_DATABASE = 'encryption',
    KEYVAULT_COLLECTION = '__keyVault',
    KEYVAULT_PROVIDER_NAME = 'local',
    KEYVAULT_ALT_NAME = "myKey",
    MONGODB_URI = "mongodb://localhost:27017",
    MONGODB_CRYPT_SHARED_LIB_PATH = 'C:\\data\\bin\\mongo\\crypt_shared_v1-8.2.4\\bin\\mongo_crypt_v1.dll',
    MONGODB_COLLECTION = "patients",
    MONGODB_DATABASE = "medicalRecords"
} = process.env;

const collNamespace = `${MONGODB_DATABASE}.${MONGODB_COLLECTION}`;

(async function () {
    try {
        // 1. Get master key from Vault
        const masterKey = await getMasterKey();
        const kmsProviders = {
            local: {
                key: masterKey,
            }
        };

        const autoEncryption = {
            keyVaultNamespace: `${KEYVAULT_DATABASE}.${KEYVAULT_COLLECTION}`,
            kmsProviders,
            extraOptions: {
                cryptSharedLibPath: MONGODB_CRYPT_SHARED_LIB_PATH,
            }
        };

        const encryptedClient = new MongoClient(MONGODB_URI);

        const clientEncryption = new ClientEncryption(encryptedClient, autoEncryption);

        const customerMasterKeyCredentials = {}; // Local KMS does not require additional credentials

        // 2. Define encryptedFieldsMap for Queryable Encryption
        const encryptedFieldsMap = {
            encryptedFields: {
                fields: [
                    {
                        path: "patientRecord.ssn",
                        bsonType: "string",
                        queries: { queryType: "equality" },
                    },
                    {
                        path: "patientRecord.billing",
                        bsonType: "object",
                    }
                ]
            }
        };

        await clientEncryption.createEncryptedCollection(
            MONGODB_DATABASE,
            MONGODB_COLLECTION,
            {
                provider: KEYVAULT_PROVIDER_NAME,
                createCollectionOptions: {
                    encryptedFields: encryptedFieldsMap.encryptedFields
                },
                masterKey: customerMasterKeyCredentials,
            }
        );

        const encryptedCollection = encryptedClient
            .db(MONGODB_DATABASE)
            .collection(MONGODB_COLLECTION);

        const result = await encryptedCollection.insertOne({
            patientName: "Jon Doe",
            patientId: 12345678,
            patientRecord: {
                ssn: "987-65-4320",
                billing: {
                    type: "Visa",
                    number: "4111111111111111",
                },
                billAmount: 1500,
            },
        });
        console.log("Inserted document:", result.insertedId);

        const findResult = await encryptedCollection.findOne({
            "patientRecord.ssn": "987-65-4320",
        });
        console.log(findResult);

    } catch (err) {
        console.error("Error in FLE QE demo:", err);

    } finally {

    }
})();


/**
 * Retrieve key from Key Vault collection
 * @param {*} keyAltName 
 * @param {*} ns 
 * @returns 
 */
async function getKey(keyAltName = "myKey", ns = KEYVAULT_NS) {
    const keyVaultColl = mdb.db.collection(ns.split(".")[1]);
    let key = await keyVaultColl.findOne({ keyAltNames: keyAltName });
    if (!key) {
        key = await keyVaultColl.insertOne({
            keyAltNames: [keyAltName],
            provider: "local",
            masterKey: {},
            creationDate: new Date(),
        });
        console.log("Created new key in Key Vault:", key.insertedId);
    }
    console.log("Using key from Key Vault:", key.insertedId);
    return key;
}