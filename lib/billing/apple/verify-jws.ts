import { compactVerify, importX509 } from "jose";

/** Verifies JWS using the leaf certificate in x5c. Does not substitute for App Store Server API when certs are absent. */
export async function verifyJwsWithEmbeddedX5c(jws: string): Promise<boolean> {
  const headerJson = decodeHeader(jws);
  const x5c = headerJson.x5c;
  if (!Array.isArray(x5c) || typeof x5c[0] !== "string") {
    return false;
  }
  const pem = derToPem(x5c[0]);
  try {
    const key = await importX509(pem, "ES256");
    await compactVerify(jws, key);
    return true;
  } catch {
    return false;
  }
}

function decodeHeader(jws: string): { x5c?: unknown } {
  const parts = jws.split(".");
  if (parts.length < 2) return {};
  const padded = parts[0]!.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (parts[0]!.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { x5c?: unknown };
}

function derToPem(b64: string): string {
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
}
