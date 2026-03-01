/**
 * Queryable Encryption - Encrypted Fields Configuration
 *
 * Defines which fields are encrypted and what query types each supports.
 * Covers all QE-supported query types and representative BSON types:
 *
 *  GA (equality + range):
 *    - equality  → string (ssn), int (employeeId)
 *    - range     → int (age), double (salary), date (birthDate)
 *
 *  Preview (prefix / suffix / substring – requires Atlas M10+ or Enterprise):
 *    - prefix    → string (email)          [Preview – MongoDB 8.2]
 *    - suffix    → string (phone)          [Preview – MongoDB 8.2]
 *    - substring → string (address)        [Preview – MongoDB 8.2]
 *
 * Set the env var QE_ENABLE_PREVIEW=true to include the preview query types.
 * They are excluded by default because shared-tier Atlas clusters reject them.
 *
 * @see https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
 * @see https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/supported-operations/
 */

import { Double } from "mongodb";

export const COLLECTION_NAME = "employees";
export const DATABASE_NAME = process.env.MONGODB_DATABASE || "qe";

// ── GA fields (equality + range) ────────────────────────────────────────────

const gaFields = [
    // Equality – string
    {
        path: "ssn",
        bsonType: "string",
        queries: { queryType: "equality", contention: 8 },
    },
    // Equality – int
    {
        path: "employeeId",
        bsonType: "int",
        queries: { queryType: "equality", contention: 0 },
    },
    // Range – int
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
    // Range – double
    {
        path: "salary",
        bsonType: "double",
        queries: {
            queryType: "range",
            min: new Double(0),
            max: new Double(9999999.99),
            precision: 2,
            contention: 8,
            sparsity: 2,
        },
    },
    // Range – date
    {
        path: "birthDate",
        bsonType: "date",
        queries: {
            queryType: "range",
            contention: 8,
            sparsity: 2,
        },
    },
];

// ── Preview fields (prefix / suffix / substring) ────────────────────────────
// Requires Atlas M10+ dedicated cluster or self-managed MongoDB Enterprise 8.2+
// Required params per field:
//   strMinQueryLength  – min length of the search string (>=1 prefix/suffix, >=2 substring)
//   strMaxQueryLength  – max length of the search string
//   strMaxLength       – max length of the stored field value
//   caseSensitive      – case-sensitive matching
//   diacriticSensitive – diacritic-sensitive matching

const previewFields = [
    // Prefix – string
    {
        path: "email",
        bsonType: "string",
        queries: {
            queryType: "prefixPreview",
            contention: 8,
            strMinQueryLength: 3,
            strMaxQueryLength: 60,
            strMaxLength: 60,
            caseSensitive: false,
            diacriticSensitive: false,
        },
    },
    // Suffix – string
    {
        path: "phone",
        bsonType: "string",
        queries: {
            queryType: "suffixPreview",
            contention: 8,
            strMinQueryLength: 3,
            strMaxQueryLength: 20,
            strMaxLength: 20,
            caseSensitive: false,
            diacriticSensitive: false,
        },
    },
    // Substring – string
    {
        path: "address",
        bsonType: "string",
        queries: {
            queryType: "substringPreview",
            contention: 8,
            strMinQueryLength: 3,
            strMaxQueryLength: 60,
            strMaxLength: 60,
            caseSensitive: false,
            diacriticSensitive: false,
        },
    },
];

// ── Build final encrypted fields map ────────────────────────────────────────

const enablePreview = process.env.QE_ENABLE_PREVIEW === "true";

export const encryptedFieldsMap = {
    encryptedFields: {
        fields: enablePreview ? [...gaFields, ...previewFields] : gaFields,
    },
};

if (enablePreview) {
    console.log("QE Preview query types enabled (prefix, suffix, substring).");
} else {
    console.log("QE Preview query types disabled. Set QE_ENABLE_PREVIEW=true to enable.");
}
