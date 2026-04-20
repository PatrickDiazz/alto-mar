/**
 * Executar à mão: ativa display_preference=on para PIX nas payment method configurations.
 * Uso (na pasta server):
 *   npm run stripe:enable-pix-pmc
 *   npm run stripe:enable-pix-pmc -- acct_XXXXX   (conta Connect do locador)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getStripe } from "./client.js";
import { ensureStripePixOnPaymentMethodConfigurations } from "./ensureStripePixPmc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const stripe = getStripe();
if (!stripe) {
  // eslint-disable-next-line no-console
  console.error("Defina STRIPE_SECRET_KEY em server/.env");
  process.exit(1);
}

const connectArg = process.argv[2]?.trim();
const stripeAccount = connectArg && connectArg.startsWith("acct_") ? connectArg : undefined;
const r = await ensureStripePixOnPaymentMethodConfigurations(stripe, { force: true, stripeAccount });
// eslint-disable-next-line no-console
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
