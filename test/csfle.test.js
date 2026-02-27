import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, Binary } from "mongodb";
import { runCsfleDemo } from "../src/demo.fle-v1.csfle.js";
import "dotenv/config";

const {
  MONGODB_URI = "mongodb://localhost:27017",
  MONGODB_DATABASE = "demo",
  MONGODB_COLLECTION = "customers_csfle"
} = process.env;

test("CSFLE demo encrypts and decrypts sensitive fields", async () => {
  const { decrypted, ssnIsEncrypted, insertedId } = await runCsfleDemo({ dropExisting: true });

  assert.equal(decrypted?.ssn, "123-45-6789");
  assert.equal(decrypted?.email, "alice@example.com");
  assert.ok(ssnIsEncrypted, "SSN should be stored encrypted on disk");

  const rawClient = new MongoClient(MONGODB_URI);
  await rawClient.connect();

  const raw = await rawClient
    .db(MONGODB_DATABASE)
    .collection(MONGODB_COLLECTION)
    .findOne({ _id: insertedId });

  await rawClient.close();

  assert.ok(raw?.ssn instanceof Binary, "SSN must be stored as Binary ciphertext");
});
