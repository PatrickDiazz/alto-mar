/**
 * Ativa o PIX via Payment Method Configurations (API).
 * - Conta da plataforma: configs diretas (parent=null).
 * - Conta Connect: configs da conta ligada (Stripe-Account), p.ex. Express com Dashboard.
 * @see https://docs.stripe.com/connect/payment-method-configurations
 * @see https://docs.stripe.com/api/payment_method_configurations/update
 */

/** Chaves já tratadas neste processo: `"platform"` ou `acct_…`. */
const pmcPixReady = new Set();

function cacheKey(stripeAccount) {
  return stripeAccount ? String(stripeAccount).trim() : "platform";
}

/**
 * @param {import("stripe").default} stripe
 * @param {{ force?: boolean; stripeAccount?: string | null }} [options]
 * stripeAccount — ID `acct_…` do locador Connect (header Stripe-Account).
 * @returns {Promise<{ ok: boolean; skipped?: boolean; updatedIds?: string[]; reason?: string; message?: string; scope?: string }>}
 */
export async function ensureStripePixOnPaymentMethodConfigurations(stripe, options = {}) {
  const force = Boolean(options.force);
  const stripeAccount =
    options.stripeAccount && String(options.stripeAccount).trim()
      ? String(options.stripeAccount).trim()
      : null;
  const key = cacheKey(stripeAccount);

  if (!stripe) {
    return { ok: false, reason: "no_client" };
  }
  if (force) {
    pmcPixReady.delete(key);
  }
  if (pmcPixReady.has(key) && !force) {
    return { ok: true, skipped: true, scope: key };
  }

  const requestOpts = stripeAccount ? { stripeAccount } : {};

  try {
    if (typeof stripe.paymentMethodConfigurations?.list !== "function") {
      // eslint-disable-next-line no-console
      console.warn("[stripe] SDK sem paymentMethodConfigurations.list — atualize o pacote `stripe` no servidor.");
      pmcPixReady.add(key);
      return { ok: false, reason: "sdk", scope: key };
    }

    const list = await stripe.paymentMethodConfigurations.list({ limit: 100 }, requestOpts);
    const active = list.data.filter((c) => c.active);

    /** Na plataforma: só configs “direct”. Na Connect: normalmente configs filhas (com parent). */
    const pool = stripeAccount
      ? active
      : active.filter((c) => c.parent == null);

    const withDefaultFlag = pool.filter((c) => c.is_default);
    const targets = withDefaultFlag.length ? withDefaultFlag : pool;

    if (!targets.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[stripe] Nenhuma payment_method_configuration ativa para PIX (${stripeAccount || "plataforma"}). ` +
          (stripeAccount
            ? "A conta Connect pode ainda não ter config — reabra o link de onboarding ou confira o Dashboard Connect."
            : "Confira na Stripe se existe config para o Checkout.")
      );
      pmcPixReady.add(key);
      return { ok: false, reason: "no_config", scope: key };
    }

    const updatedIds = [];
    for (const cfg of targets) {
      const pref = cfg.pix?.display_preference?.preference;
      if (pref === "on") continue;
      await stripe.paymentMethodConfigurations.update(
        cfg.id,
        { pix: { display_preference: { preference: "on" } } },
        requestOpts
      );
      updatedIds.push(cfg.id);
    }

    if (updatedIds.length) {
      // eslint-disable-next-line no-console
      console.log(
        `[stripe] PIX (PMC) preference=on [${stripeAccount || "plataforma"}]: ${updatedIds.join(", ")}.`
      );
    }

    pmcPixReady.add(key);
    return { ok: true, updatedIds, scope: key };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[stripe] Falha ao ativar PIX (PMC) [${key}]:`, msg);
    return { ok: false, reason: "stripe_error", message: msg, scope: key };
  }
}
