import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

type PasskeyResult = {
  data?: unknown | null
  error?: {
    message?: string
  } | null
}

type PasskeyNamespace = {
  signInWithPasskey?: (credentials?: unknown) => Promise<PasskeyResult>
  registerPasskey?: (credentials?: unknown) => Promise<PasskeyResult>
}

type WebAuthnMfaNamespace = {
  register?: (params: { friendlyName: string }) => Promise<PasskeyResult>
}

type PasskeyReadyAuth = {
  signInWithPasskey?: (credentials?: unknown) => Promise<PasskeyResult>
  registerPasskey?: (credentials?: unknown) => Promise<PasskeyResult>
  passkey?: PasskeyNamespace
  mfa?: {
    webauthn?: WebAuthnMfaNamespace
  }
}

const supabaseOptions = {
  auth: {
    experimental: {
      passkey: true,
    },
  },
} as NonNullable<Parameters<typeof createClient>[2]>

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, supabaseOptions)
  : null

export const isSupabaseConfigured = supabase !== null

function passkeyUnavailableResult(message: string): PasskeyResult {
  return {
    data: null,
    error: { message },
  }
}

function getPasskeyReadyAuth() {
  return supabase?.auth as unknown as PasskeyReadyAuth | undefined
}

function canUseWebAuthn() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "PublicKeyCredential" in window
  )
}

async function runPasskeyAction(action: () => Promise<PasskeyResult>) {
  try {
    return await action()
  } catch (error) {
    return passkeyUnavailableResult(
      error instanceof Error
        ? error.message
        : "Passkey access is not available yet. Use the secure email link.",
    )
  }
}

export async function signInWithDevicePasskey(email?: string) {
  const auth = getPasskeyReadyAuth()

  if (!auth) {
    return passkeyUnavailableResult("Supabase Auth is not configured yet.")
  }

  if (!canUseWebAuthn()) {
    return passkeyUnavailableResult(
      "This browser is not ready for passkeys. Use the secure email link on this device.",
    )
  }

  const credentials = email ? { email } : undefined

  const signInWithPasskey = auth.signInWithPasskey?.bind(auth)
  if (typeof signInWithPasskey === "function") {
    return runPasskeyAction(() => signInWithPasskey(credentials))
  }

  const passkey = auth.passkey
  const namespaceSignInWithPasskey =
    passkey?.signInWithPasskey?.bind(passkey)
  if (typeof namespaceSignInWithPasskey === "function") {
    return runPasskeyAction(() => namespaceSignInWithPasskey(credentials))
  }

  return passkeyUnavailableResult(
    "Passkey sign-in is not enabled in this Supabase client yet. Use the secure email link once, then set up Touch ID when passkeys are available.",
  )
}

export async function registerDevicePasskey(friendlyName: string) {
  const auth = getPasskeyReadyAuth()

  if (!auth) {
    return passkeyUnavailableResult("Supabase Auth is not configured yet.")
  }

  if (!canUseWebAuthn()) {
    return passkeyUnavailableResult(
      "This browser is not ready for passkeys. Use this on Josephine's MacBook with Touch ID enabled.",
    )
  }

  const registerPasskey = auth.registerPasskey?.bind(auth)
  if (typeof registerPasskey === "function") {
    return runPasskeyAction(() => registerPasskey())
  }

  const passkey = auth.passkey
  const namespaceRegisterPasskey = passkey?.registerPasskey?.bind(passkey)
  if (typeof namespaceRegisterPasskey === "function") {
    return runPasskeyAction(() => namespaceRegisterPasskey())
  }

  const webauthn = auth.mfa?.webauthn
  const registerWebAuthnFactor = webauthn?.register?.bind(webauthn)
  if (typeof registerWebAuthnFactor === "function") {
    return runPasskeyAction(() => registerWebAuthnFactor({ friendlyName }))
  }

  return passkeyUnavailableResult(
    "Passkey setup is not enabled in this Supabase client yet. The secure email link remains active.",
  )
}
