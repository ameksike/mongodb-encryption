import dotenv from "dotenv";
import { start } from "./service/server.js";

dotenv.config({ override: true });

start();