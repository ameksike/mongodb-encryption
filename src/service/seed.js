/**
 * Sample employee data for testing every QE query type.
 *
 * Each document contains:
 *   - Unencrypted: name, department
 *   - Encrypted equality: ssn (string), employeeId (int)
 *   - Encrypted range: age (int), salary (double), birthDate (date)
 *   - Encrypted prefix: email (string)
 *   - Encrypted suffix: phone (string)
 *   - Encrypted substring: address (string)
 *
 * Note: salary uses BSON Double to ensure the driver encodes it as double
 * rather than int32 (JS treats 120000.00 === 120000 which maps to int32).
 */

import { Double } from "mongodb";

/** @type {Object[]} */
export const employees = [
    {
        name: "Alice Johnson",
        department: "Engineering",
        ssn: "123-45-6789",
        employeeId: 1001,
        age: 30,
        salary: new Double(85000.50),
        birthDate: new Date("1994-03-15"),
        email: "alice.johnson@acme.com",
        phone: "+1-555-100-2001",
        address: "742 Evergreen Terrace, Springfield, IL 62704",
    },
    {
        name: "Bob Smith",
        department: "Marketing",
        ssn: "987-65-4321",
        employeeId: 1002,
        age: 45,
        salary: new Double(120000),
        birthDate: new Date("1979-07-22"),
        email: "bob.smith@acme.com",
        phone: "+1-555-200-3002",
        address: "221B Baker Street, London, UK",
    },
    {
        name: "Carlos Rivera",
        department: "Engineering",
        ssn: "456-78-9012",
        employeeId: 1003,
        age: 28,
        salary: new Double(72000.75),
        birthDate: new Date("1996-11-05"),
        email: "carlos.rivera@acme.com",
        phone: "+1-555-300-4003",
        address: "1600 Pennsylvania Avenue, Washington, DC 20500",
    },
    {
        name: "Diana Lee",
        department: "Finance",
        ssn: "111-22-3333",
        employeeId: 1004,
        age: 38,
        salary: new Double(95000),
        birthDate: new Date("1986-01-30"),
        email: "diana.lee@acme.com",
        phone: "+1-555-400-5004",
        address: "350 Fifth Avenue, New York, NY 10118",
    },
    {
        name: "Elena Torres",
        department: "HR",
        ssn: "222-33-4444",
        employeeId: 1005,
        age: 52,
        salary: new Double(110000.25),
        birthDate: new Date("1972-09-12"),
        email: "elena.torres@acme.com",
        phone: "+1-555-500-6005",
        address: "1 Infinite Loop, Cupertino, CA 95014",
    },
];
