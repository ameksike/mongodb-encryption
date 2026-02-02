const { randomBytes } = require("crypto");
const { writeFileSync } = require("fs");

// generate a local master key (96 random bytes)
const key = randomBytes(96);

// write the key to a file
writeFileSync("../cfg/master-key.bin", key);

// inform the user
console.log("master-key.bin generated with 96 random bytes");
