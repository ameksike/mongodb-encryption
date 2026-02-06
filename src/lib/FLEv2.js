import { MongoClient, ClientEncryption } from 'mongodb';

export class FLEv2 {
    constructor(options) {
        const {
            uri,
            keyVaultNamespace,
            kmsProviders,
            schemaMap,
            databaseName,
            collectionName,
            cryptSharedLibPath,
        } = options;

        this.uri = uri;
        this.keyVaultNamespace = keyVaultNamespace;
        this.kmsProviders = kmsProviders;
        this.client = null;
        this.clientEncryption = null;
        this.schemaMap = schemaMap;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.cryptSharedLibPath = cryptSharedLibPath;
    }

    /**
     * Initialize the encrypted MongoClient
     * @returns {Promise<MongoClient>} The encrypted MongoClient
     */
    async init() {
        if (this.client)
            return this.client;
        this.client = new MongoClient(this.uri, { autoEncryption: this.getEncryptedOptions() });
        await this.client.connect();
        return this.client;
    }

    /**
     * Get or create an encrypted MongoClient
     * @param {Object} options
     * @param {Object} [options.schemaMap] - Encrypted fields map
     * @param {Object} [options.extraOptions] - Extra options for autoEncryption
     * @returns {Promise<MongoClient>} The encrypted MongoClient
     */
    async getEncryptedClient(options) {

        await this.init();

        if (this.clientEncryption) {
            return this.clientEncryption;
        }

        this.clientEncryption = new ClientEncryption(this.client, this.getEncryptedOptions());
        let schemaMap = options?.schemaMap || this.schemaMap;

        schemaMap && await this.initEncryptedCollection({
            schemaMap: schemaMap || this.schemaMap,
            databaseName: this.databaseName,
            collectionName: this.collectionName,
            provider: 'local',
        });

        return this.client;
    }

    /**
     * Get options for encrypted MongoClient
     * @returns {Object} Options for autoEncryption
     */
    getEncryptedOptions() {
        return {
            keyVaultNamespace: this.keyVaultNamespace,
            kmsProviders: this.kmsProviders,
            extraOptions: {
                cryptSharedLibPath: this.cryptSharedLibPath,
            },
        };
    }

    /**
     * Get or create the key vault collection
     * @returns {Promise<Collection>} The key vault collection
     */
    async initEncryptedCollection(options) {
        const { schemaMap, databaseName, collectionName, provider } = options;
        const db = this.client.db(databaseName);
        const coll = await db.listCollections({ name: collectionName }).hasNext();
        if (coll) {
            return coll;
        }
        return await this.clientEncryption.createEncryptedCollection(
            this.client.db(databaseName),
            collectionName,
            { 'provider': provider, 'createCollectionOptions': schemaMap },
        );
    }

    /**
     * Get the collection with encryption enabled
     * @returns {Collection} The encrypted collection
     */
    getCollection() {
        return this.client.db(this.databaseName).collection(this.collectionName);
    }
}