require("dotenv").config({ override: true });

const { MongoClient, ClientEncryption } = require("mongodb");
const { readFileSync } = require("fs");
// const { ClientEncryption } = require("mongodb-client-encryption"); // error in v7+ new ClientEncryption is not a constructor
// const { Binary } = require("mongodb");

const {
    MONGODB_URI,
    MASTER_KEY_PATH,
    KEY_ALT_NAME,
    MONGODB_COLLECTION,
    MONGODB_DATABASE
} = process.env;

const uri = MONGODB_URI; // "mongodb://localhost:27017";
const keyVaultNamespace = "encryption.keyVault"; // db.collection
const pathToMasterKey = __dirname + MASTER_KEY_PATH; // path to local master key

async function main() {
    // 1. Define KMS providers (local key for demo only!)
    const localMasterKey = readFileSync(pathToMasterKey); // 96 random bytes, stored securely in real life
    const kmsProviders = {
        local: {
            key: localMasterKey
        }
    };

    // 2. Regular client (no auto-encryption) to create key vault & data key
    const regularClient = new MongoClient(uri);
    await regularClient.connect();

    const SECRET_DB = keyVaultNamespace.split(".")[0];
    const SECRET_COLL = keyVaultNamespace.split(".")[1];

    const keyVault = regularClient
        .db(SECRET_DB)
        .collection(SECRET_COLL);

    // Check if keyVault collection exists; create if not
    const existingCollections = await regularClient.db(SECRET_DB).listCollections().toArray();
    if (!existingCollections.some((collection) => collection.name === SECRET_COLL)) {
        await regularClient.db(SECRET_DB).createCollection(SECRET_COLL);
        console.log("Collection 'keyVault' created.");
    } else {
        console.log("Collection 'keyVault' already exists.");
    }

    // Ensure an index on keyAltNames for key lookup
    const existingIndexes = await keyVault.listIndexes().toArray();
    if (!existingIndexes.some((index) => index.name === "keyAltNames_1")) {
        await keyVault.createIndex(
            { keyAltNames: 1 },
            { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } }
        );
        console.log("Index created: keyAltNames_1");
    } else {
        console.log("Index already exists: keyAltNames_1");
    }

    // 3. Use ClientEncryption to create a data key
    const encryption = new ClientEncryption(regularClient, {
        keyVaultNamespace,
        kmsProviders
    });

    // define or get existing data key
    let keyId;
    const existingKey = await keyVault.findOne({ keyAltNames: KEY_ALT_NAME });
    if (!existingKey) {
        keyId = await encryption.createDataKey("local", {
            keyAltNames: [KEY_ALT_NAME]
        });
        console.log("Created data key with id:", keyId);
    } else {
        console.log("Data key already exists with id:", existingKey._id);
        keyId = existingKey._id;
    }
    // 4. Define JSON schema for automatic encryption (CSFLE)
    // Encrypt the "ssn" field deterministically for equality queries
    const customerSchema = {
        bsonType: "object",
        properties: {
            ssn: {
                encrypt: {
                    keyId: [keyId],
                    bsonType: "string",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                }
            }
        }
    };

    const schemaMap = {
        [MONGODB_DATABASE + "." + MONGODB_COLLECTION]: customerSchema
    };

    // 5. Auto-encrypting client
    const encryptedClient = new MongoClient(uri, {
        autoEncryption: {
            keyVaultNamespace,
            kmsProviders,
            schemaMap,
            // For some environments you also configure extra options such as:
            extraOptions: {
                mongocryptdURI: 'mongodb://127.0.0.1:27020',
                mongocryptdBypassSpawn: true,
                mongocryptdSpawnArgs: ['--idleShutdownTimeoutSecs', '60']
            }
        }
    });

    await encryptedClient.connect();

    const coll = encryptedClient.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);

    // 6. Insert a document – "ssn" is encrypted transparently
    const tmp = await coll.insertOne({
        name: "Alice",
        ssn: "123-45-6789",
        email: "alice@example.com"
    });

    console.log("Inserted customer with encrypted ssn", tmp);

    // 7. Find by ssn – driver encrypts query value, server matches ciphertext
    const result = await coll.findOne({ ssn: "123-45-6789" });
    console.log("Found customer:", result);

    await encryptedClient.close();
    await regularClient.close();
}

main().catch(console.error);