import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";

const productMap: Record<string, Products> = {
  assets: Products.Assets,
  auth: Products.Auth,
  balance: Products.Balance,
  identity: Products.Identity,
  investments: Products.Investments,
  liabilities: Products.Liabilities,
  transactions: Products.Transactions,
};

function plaidEnvironment() {
  const env = process.env.PLAID_ENV?.toLowerCase() ?? "sandbox";
  if (env === "production") return PlaidEnvironments.production;
  if (env === "development") return PlaidEnvironments.development;
  return PlaidEnvironments.sandbox;
}

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required.");
  }

  return new PlaidApi(
    new Configuration({
      basePath: plaidEnvironment(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
        },
      },
    }),
  );
}

export function plaidProducts() {
  const products = (process.env.PLAID_PRODUCTS ?? "transactions")
    .split(",")
    .map((product) => product.trim().toLowerCase())
    .filter(Boolean)
    .map((product) => productMap[product])
    .filter((product): product is Products => Boolean(product));

  return products.length > 0 ? products : [Products.Transactions];
}

export function plaidCountryCodes() {
  return [CountryCode.Us];
}
