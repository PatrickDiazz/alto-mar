#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import { fetchStripeConnectMetrics } from "./stripe/metrics.js";

const m = await fetchStripeConnectMetrics();
console.log(JSON.stringify(m, null, 2));
