import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type CloudStorageProvider = "google_drive" | "onedrive";

type SignedState = {
  provider: CloudStorageProvider;
  userId: string;
  returnTo: string;
  nonce: string;
  issuedAt: number;
};

const oneHourMs = 60 * 60 * 1000;

export const cloudStorageProviders: Record<
  CloudStorageProvider,
  {
    label: string;
    tokenEnvName: string;
    authUrl: string;
    tokenUrl: string;
    clientIdEnvName: string;
    clientSecretEnvName: string;
    scopes: string[];
  }
> = {
  google_drive: {
    label: "Google Drive",
    tokenEnvName: "CLOUD_STORAGE_GOOGLE_TOKEN_ENCRYPTION_KEY",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnvName: "GOOGLE_DRIVE_CLIENT_ID",
    clientSecretEnvName: "GOOGLE_DRIVE_CLIENT_SECRET",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file",
    ],
  },
  onedrive: {
    label: "OneDrive",
    tokenEnvName: "CLOUD_STORAGE_ONEDRIVE_TOKEN_ENCRYPTION_KEY",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnvName: "MICROSOFT_ONEDRIVE_CLIENT_ID",
    clientSecretEnvName: "MICROSOFT_ONEDRIVE_CLIENT_SECRET",
    scopes: ["offline_access", "User.Read", "Files.ReadWrite.AppFolder"],
  },
};

function getStateSecret() {
  const secret =
    process.env.CLOUD_STORAGE_OAUTH_STATE_SECRET ??
    process.env.CANVAS_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("CLOUD_STORAGE_OAUTH_STATE_SECRET is required for cloud storage login.");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

export function isCloudStorageProvider(
  provider: string | null | undefined,
): provider is CloudStorageProvider {
  return provider === "google_drive" || provider === "onedrive";
}

export function createCloudStorageState(
  provider: CloudStorageProvider,
  userId: string,
  returnTo = "/support/docs",
) {
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/support/docs";
  const payload = base64UrlEncode(
    JSON.stringify({
      provider,
      userId,
      returnTo: safeReturnTo,
      nonce: randomBytes(16).toString("base64url"),
      issuedAt: Date.now(),
    } satisfies SignedState),
  );

  return `${payload}.${signPayload(payload)}`;
}

export function verifyCloudStorageState(state: string): SignedState {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    throw new Error("Cloud storage login state is invalid.");
  }

  const expectedSignature = signPayload(payload);
  const provided = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new Error("Cloud storage login state could not be verified.");
  }

  const parsed = JSON.parse(base64UrlDecode(payload)) as SignedState;
  if (!isCloudStorageProvider(parsed.provider)) {
    throw new Error("Cloud storage provider is invalid.");
  }

  if (!parsed.userId || !parsed.nonce || !parsed.issuedAt) {
    throw new Error("Cloud storage login state is incomplete.");
  }

  if (Date.now() - parsed.issuedAt > oneHourMs) {
    throw new Error("Cloud storage login expired. Start again from Docs & Packing.");
  }

  return parsed;
}

export function getCloudStorageRedirectUri(
  origin: string,
  provider: CloudStorageProvider,
) {
  return `${origin}/api/storage/oauth/callback/${provider}`;
}

export function getCloudStorageConfig(provider: CloudStorageProvider) {
  const providerConfig = cloudStorageProviders[provider];
  const clientId = process.env[providerConfig.clientIdEnvName];
  const clientSecret = process.env[providerConfig.clientSecretEnvName];

  if (!clientId || !clientSecret) {
    throw new Error(
      `${providerConfig.label} OAuth is not configured yet. Add ${providerConfig.clientIdEnvName} and ${providerConfig.clientSecretEnvName}.`,
    );
  }

  return {
    ...providerConfig,
    clientId,
    clientSecret,
  };
}
