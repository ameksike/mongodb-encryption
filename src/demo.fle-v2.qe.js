// qe_demo.js
const { MongoClient } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");
const { readFileSync } = require("fs");

const uri = "mongodb://localhost:27017";
const keyVaultNamespace = "encryption.__keyVault";

async function main() {
    const localMasterKey = readFileSync("../cfg/master-key.bin");

    const kmsProviders = {
        local: {
            key: localMasterKey
        }
    };

    const regularClient = new MongoClient(uri);
    await regularClient.connect();

    const keyVault = regularClient
        .db(keyVaultNamespace.split(".")[0])
        .collection(keyVaultNamespace.split(".")[1]);

    await keyVault.createIndex(
        { keyAltNames: 1 },
        { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } }
    );

    const encryption = new ClientEncryption(regularClient, {
        keyVaultNamespace,
        kmsProviders
    });

    // Create one or more data keys (QE can use separate keys per field if desired)
    const ssnKeyId = await encryption.createDataKey("local", { keyAltNames: ["qe-ssn-key"] });
    const ageKeyId = await encryption.createDataKey("local", { keyAltNames: ["qe-age-key"] });

    console.log("Created QE data keys:", ssnKeyId, ageKeyId);

    // Encrypted fields description (QE)
    // NOTE: structure and field names are conceptual; check docs for latest spec
    const encryptedFieldsMap = {
        "demo.customers_qe": {
            fields: [
                {
                    path: "ssn",
                    bsonType: "string",
                    keyId: ssnKeyId,
                    queries: {
                        queryType: "equality"
                    }
                },
                {
                    path: "age",
                    bsonType: "int",
                    keyId: ageKeyId,
                    queries: {
                        queryType: "range",
                        // In real QE, you can specify parameters such as:
                        // contention, sparsity, min, max, precision, etc.
                    }
                }
            ]
        }
    };

    // QE-aware client: uses encryptedFieldsMap instead of schemaMap
    const qeClient = new MongoClient(uri, {
        autoEncryption: {
            keyVaultNamespace,
            kmsProviders,
            encryptedFieldsMap
            // plus any extra QE/queryable encryption options required by your version
        }
    });

    await qeClient.connect();

    const db = qeClient.db("demo");
    const collName = "customers_qe";

    // In many setups you explicitly create a QE-encrypted collection using the metadata;
    // Some drivers can create it automatically; here we assume it's created on first use
    const coll = db.collection(collName);

    // Insert documents – ssn and age are encrypted using QE
    await coll.insertMany([
        { name: "Bob", ssn: "555-55-5555", age: 30 },
        { name: "Carol", ssn: "999-99-9999", age: 45 },
        { name: "Dave", ssn: "111-11-1111", age: 52 }
    ]);

    console.log("Inserted QE-encrypted customers");

    // Equality query on encrypted ssn
    const bob = await coll.findOne({ ssn: "555-55-5555" });
    console.log("Found Bob:", bob);

    // Range query on encrypted age: 40 <= age <= 60
    const older = await coll
        .find({ age: { $gte: 40, $lte: 60 } })
        .toArray();

    console.log("Found customers with age between 40 and 60:", older);

    await qeClient.close();
    await regularClient.close();
}

main().catch(console.error);