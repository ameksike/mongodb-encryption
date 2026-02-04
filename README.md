# MongoDB Encryption Demos

Two minimal demos that write and read encrypted data with MongoDB 8.2:

- **CSFLE (FLE v1):** deterministic/range encryption using `mongocryptd`.
- **Queryable Encryption (FLE v2):** equality/range queries backed by `crypt_shared`.

## Prerequisites

- Node.js 18+.
- MongoDB 8.2 server (Enterprise or Atlas) running and reachable.
- MongoDB Crypto service
    - `mongocryptd` available on PATH (for CSFLE).
    - `mongo_crypt_v1` shared library built/installed; set `MONGODB_CRYPT_SHARED_LIB_PATH` to its absolute path (for QE).
    - [![](./docs/mdb.prd.ea.download.jpg)](https://www.mongodb.com/try/download/enterprise)

## Configuration

Create a `.env` (or set env vars) for the values you need. Useful vars:

- `MONGODB_URI` (default `mongodb://localhost:27017`)
- `MASTER_KEY_PATH` (defaults to `cfg/master-key.bin`, created automatically)
- `KEYVAULT_DATABASE` / `KEYVAULT_COLLECTION`
- `MONGODB_DATABASE` / `MONGODB_COLLECTION`
- `MONGODB_CRYPT_SHARED_LIB_PATH` (Windows path example already in the demo)

## Install & Run

```bash
npm install
npm run demo:cs:manual
npm run demo:cs:auto   # CSFLE / mongocryptd
npm run demo:qe        # Queryable Encryption / crypt_shared
npm test               # Integration tests (requires services above)
```

## Openssl Commands
- Hex 96
    ```
    openssl rand -hex 96 > hex96_key.txt
    ```
- RSA 2048 bits:
    ```
    openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
    openssl rsa -pubout -in private_key.pem -out public_key.pem
    ```
- AES 32
    ```
    openssl rand -base64 32 > aes_key.txt
    ```
- SHA256
    ```
    echo -n "TextoSeguroParaClave" | openssl dgst -sha256
    ```
- Master Key
    ```
    openssl rand -out master-key.bin 96
    ```

## References
- [MongoDB Enterprise Server Download](https://www.mongodb.com/try/download/enterprise)
- [MongoDB Docker Image Download](https://hub.docker.com/_/mongo)
- [Docker and MongoDB](https://www.mongodb.com/resources/products/compatibilities/docker)
- [Client Encryption](https://www.mongodb.com/docs/manual/reference/method/ClientEncryption.encrypt/)
- [Queryable Encryption quick-start](https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/)
- [Queryable Encryption Dependencies](https://www.mongodb.com/docs/manual/core/queryable-encryption/install/?language-no-dependencies=nodejs&operating-system=windows)
- [Manage MongoDB Atlas Database Secrets in HashiCorp Vault](https://www.mongodb.com/company/blog/technical/manage-atlas-database-secrets-hashicorp-vault)
- [Cost Optimization with Optimal Document Size](https://www.mongodb.com/company/blog/technical/cost-optimization-with-optimal-document-size?utm_source=TWITTER&utm_medium=ORGANIC_SOCIAL_ADVOCACY)