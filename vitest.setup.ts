import { loadEnv } from "vite";
import path from "path";

// Load .env.local into process.env for all tests
const env = loadEnv("", path.resolve(__dirname), "");
Object.assign(process.env, env);
