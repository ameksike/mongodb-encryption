/**
 * Queryable Encryption - Encrypted Fields Configuration
 *
 * Defines which fields are encrypted and what query types each supports.
 * Covers all QE-supported query types and representative BSON types:
 *
 *  - equality  → string (ssn), int (employeeId)
 *  - range     → int (age), double (salary), date (birthDate)
 *  - prefix    → string (email)          [Preview – MongoDB 8.2]
 *  - suffix    → string (phone)          [Preview – MongoDB 8.2]
 *  - substring → string (address)        [Preview – MongoDB 8.2]
 *
 * @see https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
 * @see https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/
 */

export const COLLECTION_NAME = "employees";
export const DATABASE_NAME = process.env.MONGODB_DATABASE || "qe";

export const encryptedFieldsMap = {
    encryptedFields: {
        fields: [
            // ── Equality queries ──────────────────────────────────────
            // Supported BSON types: all except double, decimal128, object, array
            // Operators: $eq, $ne, $in, $nin, $and, $or, $not, $nor
            {
                path: "ssn",
                bsonType: "string",
                queries: { queryType: "equality", contention: 8 },
            },
            {
                path: "employeeId",
                bsonType: "int",
                queries: { queryType: "equality", contention: 0 },
            },

            // ── Range queries ─────────────────────────────────────────
            // Supported BSON types: int, long, double, decimal, date
            // Operators: $gt, $gte, $lt, $lte (combined for range)
            {
                path: "age",
                bsonType: "int",
                queries: {
                    queryType: "range",
                    min: 18,
                    max: 120,
                    contention: 8,
                    sparsity: 2,
                },
            },
            {
                path: "salary",
                bsonType: "double",
                queries: {
                    queryType: "range",
                    min: 0,
                    max: 9999999.99,
                    precision: 2,
                    contention: 8,
                    sparsity: 2,
                },
            },
            {
                path: "birthDate",
                bsonType: "date",
                queries: {
                    queryType: "range",
                    contention: 8,
                    sparsity: 2,
                },
            },

            // ── Prefix / Suffix / Substring queries (Preview – 8.2) ──
            // Operators: $encStrStartsWith, $encStrEndsWith, $encStrContains
            // Only string bsonType is supported
            {
                path: "email",
                bsonType: "string",
                queries: {
                    queryType: "prefixPreview",
                    contention: 8,
                },
            },
            {
                path: "phone",
                bsonType: "string",
                queries: {
                    queryType: "suffixPreview",
                    contention: 8,
                },
            },
            {
                path: "address",
                bsonType: "string",
                queries: {
                    queryType: "substringPreview",
                    contention: 8,
                },
            },
        ],
    },
};
