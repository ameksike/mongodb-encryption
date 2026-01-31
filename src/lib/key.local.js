
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs/promises";

const KEY_PATH = process.env.LOCAL_TOKEN || path.resolve(__dirname, "../../cfg/master.key");

export async function getMasterKeyFromLocal() {
    let key = await fs.readFile(KEY_PATH);

    if (key?.length !== 96) {
        key = crypto.randomBytes(96);
        await fs.writeFile(KEY_PATH, key);
    }

    return key;
}