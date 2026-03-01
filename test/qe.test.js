import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, Binary } from "mongodb";
import { runQueryableEncryptionDemo } from "../src/demo.fle-v2.qe.js";
import "dotenv/config";

const {
  MONGODB_URI = "mongodb://localhost:27017",
  MONGODB_DATABASE = "medicalRecords",
  MONGODB_COLLECTION = "patients_qe"
} = process.env;

test("Queryable Encryption demo encrypts and decrypts queryable fields", async () => {
  const { decrypted, ssnIsEncrypted, insertedId } = await runQueryableEncryptionDemo({
    dropExisting: true
  });

  assert.equal(decrypted?.patientRecord?.ssn, "987-65-4320");
  assert.ok(ssnIsEncrypted, "SSN should be stored encrypted on disk");

  const rawClient = new MongoClient(MONGODB_URI);
  await rawClient.connect();

  const raw = await rawClient
    .db(MONGODB_DATABASE)
    .collection(MONGODB_COLLECTION)
    .findOne({ _id: insertedId });

  await rawClient.close();

  assert.ok(
    raw?.patientRecord?.ssn instanceof Binary,
    "SSN must be stored as Binary ciphertext"
  );
});
