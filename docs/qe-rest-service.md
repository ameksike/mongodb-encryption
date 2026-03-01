# QE REST Service – Queryable Encryption CRUD Demo

Minimal REST service that demonstrates **every query type supported by MongoDB Queryable Encryption (QE)** over encrypted fields using different BSON types.

## Purpose

Help developers understand Queryable Encryption by providing a single working service that shows how to configure encrypted fields and execute each supported query type.

---

## Quick Start

```bash
npm install              # install dependencies (express, mongodb, etc.)
npm run demo:qe:service  # start the server at http://localhost:3000
```

Load sample data:

```bash
curl --request POST --url http://localhost:3000/api/employees/seed
```

---

## Architecture

```
src/service/
├── server.js        # Express server – boot sequence
├── routes.js        # Application layer – HTTP handlers
├── repository.js    # Data layer – CRUD operations
├── utils.js         # Query builders, type coercion, DB connection
├── config.js        # encryptedFieldsMap – QE configuration
└── seed.js          # Sample data
```

| Layer | File | Responsibility |
|---|---|---|
| **Application** | `routes.js` | Parses HTTP input, validates, delegates to repository, returns JSON |
| **Data** | `repository.js` | Executes CRUD operations against the encrypted collection |
| **Utilities** | `utils.js` | QE query builders, BSON type coercion, DB init and collection access |
| **Config** | `config.js` | Defines which fields are encrypted and with which query type |

---

## Data Model: `employees`

| Field | BSON Type | Encrypted | Query Type | Description |
|---|---|---|---|---|
| `name` | string | No | — | Employee name |
| `department` | string | No | — | Department |
| `ssn` | string | **Yes** | `equality` | Social Security Number |
| `employeeId` | int | **Yes** | `equality` | Employee ID |
| `age` | int | **Yes** | `range` | Age |
| `salary` | double | **Yes** | `range` | Salary (2-decimal precision) |
| `birthDate` | date | **Yes** | `range` | Date of birth |
| `email` | string | **Yes** | `prefixPreview` | Email address |
| `phone` | string | **Yes** | `suffixPreview` | Phone number |
| `address` | string | **Yes** | `substringPreview` | Postal address |

---

## QE Query Types Covered

### 1. Equality (Exact Match)

**Status:** GA (production-ready)

Finds documents where an encrypted field exactly matches a given value.

**Supported BSON types:** all except `double`, `decimal128`, `object`, and `array`.

**Supported operators:** `$eq`, `$ne`, `$in`, `$nin`, `$and`, `$or`, `$not`, `$nor`

**Configuration:**
```json
{
    "path": "ssn",
    "bsonType": "string",
    "queries": { "queryType": "equality", "contention": 8 }
}
```

**Curl – equality on string (ssn):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?ssn=123-45-6789" \
  --header "Accept: application/json"
```

**Curl – equality on int (employeeId):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?employeeId=1001" \
  --header "Accept: application/json"
```

---

### 2. Range

**Status:** GA (production-ready)

Finds documents where an encrypted numeric or date field falls within a given range.

**Supported BSON types:** `int`, `long`, `double`, `decimal`, `date`

**Supported operators:** `$gt`, `$gte`, `$lt`, `$lte`

**Configuration parameters:**
- `min` / `max` – Required for `double` and `decimal`; recommended for `int`, `long`, and `date`
- `precision` – Only for `double` and `decimal` (decimal digits)
- `sparsity` – Controls the trade-off between performance and storage (1-8)

**Configuration:**
```json
{
    "path": "age",
    "bsonType": "int",
    "queries": { "queryType": "range", "min": 18, "max": 120, "sparsity": 2 }
}
```
```json
{
    "path": "salary",
    "bsonType": "double",
    "queries": { "queryType": "range", "min": 0, "max": 9999999.99, "precision": 2, "sparsity": 2 }
}
```
```json
{
    "path": "birthDate",
    "bsonType": "date",
    "queries": { "queryType": "range", "sparsity": 2 }
}
```

**Curl – range on int (age between 25 and 40):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?ageMin=25&ageMax=40" \
  --header "Accept: application/json"
```

**Curl – range on double (salary between 70k and 100k):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?salaryMin=70000&salaryMax=100000" \
  --header "Accept: application/json"
```

**Curl – range on date (born between 1980 and 1995):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?birthDateFrom=1980-01-01&birthDateTo=1995-12-31" \
  --header "Accept: application/json"
```

**Curl – lower bound only (older than 35):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?ageMin=35" \
  --header "Accept: application/json"
```

**Curl – upper bound only (salary up to 90k):**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?salaryMax=90000" \
  --header "Accept: application/json"
```

---

### 3. Prefix – Preview

**Status:** Public Preview (MongoDB 8.2) – Do not use in production

Finds documents where an encrypted field starts with a given string.

**BSON type:** `string`

**Operator:** `$encStrStartsWith`

**Configuration:**
```json
{
    "path": "email",
    "bsonType": "string",
    "queries": {
        "queryType": "prefixPreview",
        "contention": 8,
        "strMinQueryLength": 3,
        "strMaxQueryLength": 60,
        "strMaxLength": 60,
        "caseSensitive": false,
        "diacriticSensitive": false
    }
}
```

**Curl – emails starting with "alice":**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?emailPrefix=alice" \
  --header "Accept: application/json"
```

---

### 4. Suffix – Preview

**Status:** Public Preview (MongoDB 8.2) – Do not use in production

Finds documents where an encrypted field ends with a given string.

**BSON type:** `string`

**Operator:** `$encStrEndsWith`

**Configuration:**
```json
{
    "path": "phone",
    "bsonType": "string",
    "queries": {
        "queryType": "suffixPreview",
        "contention": 8,
        "strMinQueryLength": 3,
        "strMaxQueryLength": 20,
        "strMaxLength": 20,
        "caseSensitive": false,
        "diacriticSensitive": false
    }
}
```

**Curl – phone numbers ending in "2001":**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?phoneSuffix=2001" \
  --header "Accept: application/json"
```

---

### 5. Substring – Preview

**Status:** Public Preview (MongoDB 8.2) – Do not use in production

Finds documents where an encrypted field contains a given string.

**BSON type:** `string`

**Operator:** `$encStrContains`

**Configuration:**
```json
{
    "path": "address",
    "bsonType": "string",
    "queries": {
        "queryType": "substringPreview",
        "contention": 8,
        "strMinQueryLength": 3,
        "strMaxQueryLength": 60,
        "strMaxLength": 60,
        "caseSensitive": false,
        "diacriticSensitive": false
    }
}
```

**Curl – addresses containing "Springfield":**
```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?addressContains=Springfield" \
  --header "Accept: application/json"
```

---

## REST Endpoints

### Seed sample data

```bash
curl --request POST \
  --url http://localhost:3000/api/employees/seed \
  --header "Accept: application/json"
```

### Create an employee

```bash
curl --request POST \
  --url http://localhost:3000/api/employees \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  --data '{
    "name": "Frank Miller",
    "department": "Engineering",
    "ssn": "333-44-5555",
    "employeeId": 1006,
    "age": 29,
    "salary": 78000.00,
    "birthDate": "1995-06-20",
    "email": "frank.miller@acme.com",
    "phone": "+1-555-600-7006",
    "address": "100 Main Street, Boston, MA 02101"
  }'
```

### List all employees

```bash
curl --request GET \
  --url http://localhost:3000/api/employees \
  --header "Accept: application/json"
```

### Combined filters

```bash
curl --request GET \
  --url "http://localhost:3000/api/employees?department=Engineering&ageMin=25&ageMax=35" \
  --header "Accept: application/json"
```

### Get by ID

Replace `<objectId>` with an actual `_id` value from a previous response.

```bash
curl --request GET \
  --url http://localhost:3000/api/employees/<objectId> \
  --header "Accept: application/json"
```

### Update an employee

```bash
curl --request PUT \
  --url http://localhost:3000/api/employees/<objectId> \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  --data '{ "salary": 90000.00, "department": "Senior Engineering" }'
```

### Delete an employee

```bash
curl --request DELETE \
  --url http://localhost:3000/api/employees/<objectId> \
  --header "Accept: application/json"
```

---

## BSON Type Support by Query Type

| Query Type | Supported BSON Types |
|---|---|
| `equality` | All except `double`, `decimal128`, `object`, `array` |
| `range` | `int`, `long`, `double`, `decimal`, `date` |
| `prefixPreview` | `string` |
| `suffixPreview` | `string` |
| `substringPreview` | `string` |

---

## The `__safeContent__` Field

When you inspect a document directly (e.g. via `mongosh` without an auto-decrypting client),
you will see an extra array field called `__safeContent__`:

```json
{
  "_id": ObjectId("..."),
  "name": "Alice Johnson",
  "ssn": Binary(6, "..."),
  "age": Binary(6, "..."),
  "__safeContent__": [
    Binary(0, "aGVsbG8..."),
    Binary(0, "d29ybGQ..."),
    ...
  ]
}
```

**What it is:** An array of encrypted index tokens (HMAC-derived tags) that MongoDB stores
alongside every document in a QE-encrypted collection. Each entry corresponds to one
queryable encrypted field.

**How it works:**

- On **insert / update**, the driver generates encrypted tokens from the plaintext values
  and writes them into `__safeContent__`.
- On **query**, the driver encrypts the search value into a matching token and the server
  compares tokens in `__safeContent__` to find matches.
- The server only sees opaque binary tags — it never learns the actual values.

**Key rules:**

- Never modify or remove it manually — doing so will break queries on encrypted fields.
- It is automatically managed by the driver's `autoEncryption` layer.
- Its size grows with the number of queryable encrypted fields and the `contention` factor.
- It does **not** appear when reading through an auto-decrypting client (the driver strips it).

This service uses `find()` with `{ projection: { __safeContent__: 0 } }` to strip
this field from all query responses, keeping the API output clean.

> **Note:** Aggregation `$match` with `{ $unset: "__safeContent__" }` is **not** used because
> the csfle library does not support preview operators (`$encStrStartsWith`,
> `$encStrEndsWith`, `$encStrContains`) inside aggregation pipeline stages.

---

## Key Limitations

1. **Cannot combine equality and range** on the same field – choose one when creating the collection
2. **Query type is immutable** – it cannot be changed after the collection is created
3. **Cannot compare two encrypted fields** against each other
4. **Cannot compare encrypted fields with `null`** or regular expressions
5. **Does not support arrays of documents** – fields inside arrays cannot be automatically encrypted
6. **Does not support `updateMany`** or `bulkWrite` with multiple update/delete operations
7. **Does not support `findAndModify` with `new: true`** – use `updateOne` + `findOne` instead
8. **Prefix/Suffix/Substring are in Preview** – the GA release will be incompatible with the preview

## `contention` Parameter

The contention factor controls the trade-off between read and write performance:
- **Low value (0-4):** faster reads, but higher contention on concurrent writes
- **High value (4-8):** more efficient concurrent writes, slightly slower reads
- **For demos** use `8` (default) or `0` if there is no concurrency

---

## Prerequisites

- Node.js 18+
- MongoDB Enterprise/Atlas 8.2+ (required for prefix/suffix/substring)
- `mongo_crypt_v1` shared library – set `MONGODB_CRYPT_SHARED_LIB_PATH` in `.env`
- HashiCorp Vault or local key for the master key (see `src/lib/key.vault.js`)

## Environment Variables (.env)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB server URI |
| `MONGODB_DATABASE` | `qe` | Database for the service |
| `MONGODB_CRYPT_SHARED_LIB_PATH` | — | Absolute path to `mongo_crypt_v1` |
| `KEYVAULT_DATABASE` | `encryption` | Key vault database |
| `KEYVAULT_COLLECTION` | `keyVault` | Key vault collection |
| `QE_ENABLE_PREVIEW` | `false` | Set to `true` to enable prefix/suffix/substring |
| `PORT` | `3000` | Express server port |

---

## Troubleshooting

### Vault unavailable (`ECONNREFUSED 127.0.0.1:8200`)

If HashiCorp Vault is not running the service automatically falls back to a local
file-based master key (`cfg/master-key.bin`). You will see a warning in the console:

```
Vault unavailable, falling back to local master key: ECONNREFUSED
Failed to start: TypeError: fetch failed
    at c:\data\dev\check\mongodb-encryption\lib\internal\deps\undici\undici.js:13502:13
    at process.processTicksAndRejections (c:\data\dev\check\mongodb-encryption\lib\internal\process\task_queues.js:105:5)
    at async get (c:\data\dev\check\mongodb-encryption\src\lib\key.vault.js:47:17)
    at async getMasterKey (c:\data\dev\check\mongodb-encryption\src\lib\key.vault.js:17:27)
    at async initDatabase (c:\data\dev\check\mongodb-encryption\src\service\db.js:30:27)
    at async start (file:///C:/data/dev/check/mongodb-encryption/src/service/server.js:32:9) {stack: 'TypeError: fetch failed
    at node:internal/…ongodb-encryption/src/service/server.js:32:9)', message: 'fetch failed', cause: Error: connect ECONNREFUSED 127.0.0.1:8200
   …onnectWrap.afterConnect [as oncomplete] (node…}
server.js:40
Process exited with code 1
```

This is safe for local development and demos. For production, start Vault or
configure a real KMS provider.

### Schema mismatch after changing `encryptedFieldsMap`

The encrypted collection schema is **immutable**. If you change `config.js`
(e.g. add/remove fields or change query types), you must drop the old collection
and its internal QE collections first:

```bash
mongosh --eval '
  const db = db.getSiblingDB("qe");
  db.employees.drop();
  db["enxcol_.employees.esc"].drop();
  db["enxcol_.employees.ecoc"].drop();
  db["enxcol_.employees.ecc"].drop();
'
```

Then restart the service so it recreates the collection with the new schema.

## References

- [Queryable Encryption](https://www.mongodb.com/docs/manual/core/queryable-encryption/)
- [Supported Operations for QE](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/)
- [Encrypted Fields and Enabled Queries](https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/)
- [QE Limitations](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/limitations/)
- [QE Quick Start](https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/)
