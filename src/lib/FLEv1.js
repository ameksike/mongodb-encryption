import { MongoClient, ClientEncryption, Binary } from "mongodb";

/**
 * Class for Client-Side Field Level Encryption with Auto Encryption
 * cryptSharedLibPath or mongocryptd must be provided in extraOptions for autoEncryption to work
 */
export class FLEv1 {

    /**
     * Constructor for CsFle
     * @param {Object} options
     * @param {string} options.uri - MongoDB connection string
     * @param {string} [options.keyVaultUri] - MongoDB connection string for Key Vault (if different)
     * @param {string} [options.keyVaultNamespace] - Key Vault namespace (e.g. "keyvault.datakeys")
     * @param {string} [options.keyVaultDatabase] - Key Vault database name (if namespace not provided)
     * @param {string} [options.keyVaultCollection] - Key Vault collection name (if namespace not provided)
     * @param {Object} options.kmsProviders - KMS Providers configuration
     * @param {string} options.cryptSharedLibPath - Path to crypt_shared library
     */
    constructor(options) {
        const {
            uri,
            keyVaultUri,
            keyVaultNamespace,
            keyVaultDatabase,
            keyVaultCollection,
            kmsProviders,
            cryptSharedLibPath,
        } = options;

        this.uri = uri;
        this.kmsProviders = kmsProviders;
        this.cryptSharedLibPath = cryptSharedLibPath;

        let keyVaultParts = keyVaultNamespace ? this.getFromNamespace(keyVaultNamespace) : null;
        this.keyVaultUri = keyVaultUri || uri;
        this.keyVaultNamespace = keyVaultNamespace || this.getCollectionNamespace(keyVaultDatabase, keyVaultCollection);
        this.keyVaultDatabase = keyVaultParts?.database || keyVaultDatabase;
        this.keyVaultCollection = keyVaultParts?.collection || keyVaultCollection;
        this.keyVaultClient = null;
        this.keyVaultClientEncryption = null;
        this.encryptedClient = null;
    }

    /**
     * Initialize the key vault collection if it doesn't exist
     * @returns {Promise<Collection>} The key vault collection
     */
    async initKeyVault() {
        this.getKeyVaultClient();
        await this.keyVaultClient.connect();
        const db = this.keyVaultClient.db(this.keyVaultDatabase);
        const exists = await db.listCollections({ name: this.keyVaultCollection }).hasNext();
        if (!exists) {
            await db.createCollection(this.keyVaultCollection);
        }
        await db.collection(this.keyVaultCollection).createIndex(
            { keyAltNames: 1 },
            { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } }
        );
        return this.keyVaultClient.db(this.keyVaultDatabase).collection(this.keyVaultCollection);
    }

    /**
     * Get or create MongoClient for the key vault
     * @returns {MongoClient}
     */
    getKeyVaultClient() {
        if (!this.keyVaultClient) {
            this.keyVaultClient = new MongoClient(this.keyVaultUri);
        }
        return this.keyVaultClient;
    }

    /**
     * Get or create ClientEncryption for the key vault
     * @returns {ClientEncryption}
     */
    getKeyVaultClientEncryption() {
        if (this.keyVaultClientEncryption) {
            return this.keyVaultClientEncryption;
        }
        this.keyVaultClientEncryption = new ClientEncryption(this.getKeyVaultClient(), {
            keyVaultNamespace: this.keyVaultNamespace,
            kmsProviders: this.kmsProviders
        });
        return this.keyVaultClientEncryption;
    }

    /**
     * Get or create a data key in the key vault
     * @param {string} keyAltName - Alternate name for the data key
     * @param {string} [kmsProviderName="local"] - KMS provider name
     * @returns {Promise<Binary>} The data key ID
     */
    async getKeyVaultKeyID(keyAltName, kmsProviderName = "local") {
        const keyVaultEncryption = this.getKeyVaultClientEncryption();
        const keyVaultColl = await this.initKeyVault();
        const key = await keyVaultColl.findOne({ keyAltNames: keyAltName });
        if (key) return key._id;
        return keyVaultEncryption.createDataKey(kmsProviderName, { keyAltNames: [keyAltName] });
    }

    /**
     * Get or create an encrypted MongoClient
     * @param {Object} options
     * @param {Object} [options.schemaMap] - Encrypted fields map
     * @param {Object} [options.extraOptions] - Extra options for autoEncryption
     * @returns {Promise<MongoClient>} The encrypted MongoClient
     */
    async getEncryptedClient(options) {
        const { schemaMap = {}, extraOptions = {} } = options;

        if (this.encryptedClient) {
            return this.encryptedClient;
        }

        this.cryptSharedLibPath && (extraOptions.cryptSharedLibPath = this.cryptSharedLibPath);
        //extraOptions.mongocryptdURI = MONGOCRYPTD_URI;
        //extraOptions.mongocryptdBypassSpawn = false;

        this.encryptedClient = new MongoClient(this.uri, {
            autoEncryption: {
                kmsProviders: this.kmsProviders,
                keyVaultNamespace: this.keyVaultNamespace,
                schemaMap,
                extraOptions
            }
        });

        await this.encryptedClient.connect();
        return this.encryptedClient;
    }

    /**
     * Check if a value is an encrypted Binary
     * @param {*} value - The value to check
     * @returns {boolean} True if the value is an encrypted Binary, false otherwise
     */
    isEncryptedValue(value) {
        return (value && value._bsontype === "Binary") || value instanceof Binary;
    }

    /**
     * Get the full collection namespace
     * @param {string} database - Database name
     * @param {string} collection - Collection name
     * @returns {string} The full collection namespace
     */
    getCollectionNamespace(database, collection) {
        return `${database}.${collection}`;
    }

    /**
     * Parse database and collection from namespace
     * @param {string} namespace - The full collection namespace
     * @returns {{database: string, collection: string}} An object with database and collection properties
     */
    getFromNamespace(namespace) {
        const parts = namespace.split(".");
        return {
            database: parts[0],
            collection: parts[1]
        };
    }

    /**
     * Manually Encrypt a value explicitly
     * @param {*} value - The value to encrypt
     * @param {Object} options
     * @param {Binary[]} [options.keyId] - Data key ID(s) to use for encryption
     * @param {string} [options.algorithm="AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"] - Encryption algorithm
     * @param {string} [options.bsonType="string"] - BSON type of the value
     * @param {string} [options.keyAltName] - Alternate name of the data key
     * @param {string} [options.kmsProviderName="local"] - KMS provider name
     * @returns {Promise<Binary>} The encrypted value as a Binary
     */
    async encrypt(value, options) {
        if (!value) {
            throw new Error("Value to encrypt must be provided");
        }
        let {
            keyId,
            algorithm = "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
            bsonType = "string",
            keyAltName,
            kmsProviderName = "local"
        } = options || {};
        try {
            keyId = keyId || (keyAltName ? await this.getKeyVaultKeyID(keyAltName, kmsProviderName) : null);
            const clientEncryption = this.getKeyVaultClientEncryption();
            return await clientEncryption.encrypt(value, {
                keyId,
                algorithm,
                bsonType
            });
        }
        catch (e) {
            console.error("Encryption error:", e);
            throw e;
        }
    }

    /**
     * Manually Decrypt a value explicitly
     * @param {Binary} value - The encrypted value as a Binary
     * @returns {Promise<*>} The decrypted value
     */
    async decrypt(value) {
        if (!value) {
            throw new Error("Value to decrypt must be provided");
        }
        try {
            const clientEncryption = this.getKeyVaultClientEncryption();
            return await clientEncryption.decrypt(value);
        } catch (e) {
            console.error("Decryption error:", e);
            throw e;
        }
    }
}