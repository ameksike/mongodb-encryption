# QE REST Service – Queryable Encryption CRUD Demo

Minimal REST service that demonstrates **every query type supported by MongoDB Queryable Encryption (QE)** over encrypted fields using different BSON types.

## Purpose

Help developers understand Queryable Encryption by providing a single working service that shows how to configure encrypted fields and execute each supported query type.

---

## Quick Start

```bash
npm install              # install dependencies (express, mongodb, etc.)
npm run service:qe       # start the server at http://localhost:3000
```

Load sample data:

```bash
curl -X POST http://localhost:3000/api/employees/seed
```

---

## Architecture

```
src/service/
├── index.js          # Entry point – Express server
├── routes.js         # Application layer – HTTP handlers
├── repository.js     # Data layer – CRUD + QE query builders
├── config.js         # encryptedFieldsMap – QE configuration
├── db.js             # Encrypted connection via FLEv2
└── seed.js           # Sample data
```

| Layer | File | Responsibility |
|---|---|---|
| **Application** | `routes.js` | Parses HTTP input, validates, delegates to repository, returns JSON |
| **Data** | `repository.js` | Builds MongoDB QE queries, executes CRUD operations |
| **Config** | `config.js` | Defines which fields are encrypted and with which query type |
| **Infrastructure** | `db.js` | Initialises `FLEv2` with `crypt_shared` and key vault |

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

**Usage examples:**
```bash
# Find by exact SSN
curl "http://localhost:3000/api/employees?ssn=123-45-6789"

# Find by exact employeeId
curl "http://localhost:3000/api/employees?employeeId=1001"
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

**Usage examples:**
```bash
# Employees aged 25 to 40
curl "http://localhost:3000/api/employees?ageMin=25&ageMax=40"

# Salary between 70000 and 100000
curl "http://localhost:3000/api/employees?salaryMin=70000&salaryMax=100000"

# Born between 1980 and 1995
curl "http://localhost:3000/api/employees?birthDateFrom=1980-01-01&birthDateTo=1995-12-31"

# Lower bound only (older than 35)
curl "http://localhost:3000/api/employees?ageMin=35"

# Upper bound only (salary up to 90000)
curl "http://localhost:3000/api/employees?salaryMax=90000"
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
    "queries": { "queryType": "prefixPreview", "contention": 8 }
}
```

**Usage examples:**
```bash
# Emails starting with "alice"
curl "http://localhost:3000/api/employees?emailPrefix=alice"

# Emails starting with "carlos"
curl "http://localhost:3000/api/employees?emailPrefix=carlos"
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
    "queries": { "queryType": "suffixPreview", "contention": 8 }
}
```

**Usage examples:**
```bash
# Phone numbers ending in "2001"
curl "http://localhost:3000/api/employees?phoneSuffix=2001"
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
    "queries": { "queryType": "substringPreview", "contention": 8 }
}
```

**Usage examples:**
```bash
# Addresses containing "Springfield"
curl "http://localhost:3000/api/employees?addressContains=Springfield"

# Addresses containing "Avenue"
curl "http://localhost:3000/api/employees?addressContains=Avenue"
```

---

## REST Endpoints

### Create an employee

```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
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

### List / search employees

```bash
# All employees
curl http://localhost:3000/api/employees

# Combined filters
curl "http://localhost:3000/api/employees?department=Engineering&ageMin=25&ageMax=35"
```

### Get by ID

```bash
curl http://localhost:3000/api/employees/<objectId>
```

### Update an employee

```bash
curl -X PUT http://localhost:3000/api/employees/<objectId> \
  -H "Content-Type: application/json" \
  -d '{ "salary": 90000.00, "department": "Senior Engineering" }'
```

### Delete an employee

```bash
curl -X DELETE http://localhost:3000/api/employees/<objectId>
```

### Load sample data

```bash
curl -X POST http://localhost:3000/api/employees/seed
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

## Key Limitations

1. **Cannot combine equality and range** on the same field – choose one when creating the collection
2. **Query type is immutable** – it cannot be changed after the collection is created
3. **Cannot compare two encrypted fields** against each other
4. **Cannot compare encrypted fields with `null`** or regular expressions
5. **Does not support arrays of documents** – fields inside arrays cannot be automatically encrypted
6. **Does not support `updateMany`** or `bulkWrite` with multiple update/delete operations
7. **Prefix/Suffix/Substring are in Preview** – the GA release will be incompatible with the preview

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
| `PORT` | `3000` | Express server port |

---

## References

- [Queryable Encryption](https://www.mongodb.com/docs/manual/core/queryable-encryption/)
- [Supported Operations for QE](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/)
- [Encrypted Fields and Enabled Queries](https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/)
- [QE Limitations](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/limitations/)
- [QE Quick Start](https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/)
