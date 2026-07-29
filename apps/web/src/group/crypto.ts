import { ENVELOPE_VERSION, envelopeSchema, type Envelope } from "@codex35/core";

/**
 * Kennwort-Verschlüsselung für ein Regal.
 *
 * Der Grund ist nicht Paranoia, sondern eine Eigenschaft von GitHub: ein
 * „geheimer" Gist ist nicht geheim, er ist nur nicht auffindbar. Wer die Kennung
 * hat, liest mit. Für einen Charakterbogen wäre das verkraftbar — für Philipps
 * eigenes Regelwerk, das aus seinen gekauften Büchern stammt, nicht. Das darf
 * seine Gruppe sehen und sonst niemand.
 *
 * Deshalb: der Inhalt wird verschlüsselt, und der Link allein reicht nicht. Link
 * plus Kennwort sind die Zugangsdaten — genau das, was er vergeben wollte.
 *
 * Gewählt ist, was der Browser von sich aus mitbringt (WebCrypto): PBKDF2 mit
 * SHA-256 zum Ableiten des Schlüssels aus dem Kennwort, AES-GCM zum
 * Verschlüsseln. Keine Bibliothek, kein Nachladen, funktioniert offline. GCM
 * prüft dabei mit: ein falsches Kennwort oder ein verändertes Regal fällt beim
 * Entschlüsseln auf, statt Unsinn zu liefern.
 */

/** Wie oft das Kennwort durch die Ableitung geht. Kostet auf dem Handy ~0,2 s. */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export class GroupCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupCryptoError";
  }
}

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) {
    throw new GroupCryptoError(
      "Dieser Browser kann nicht verschlüsseln (WebCrypto fehlt). Über eine unverschlüsselte Verbindung (http://) sperren Browser das ab — die App muss über https:// laufen.",
    );
  }
  return api;
}

// Base64 von Hand, weil btoa nur Zeichen bis 255 verträgt und die
// verschlüsselten Daten beliebige Bytes sind.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const rest = bytes.length - i;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b >> 4)];
    out += rest > 1 ? B64[((b & 15) << 2) | (c >> 6)] : "=";
    out += rest > 2 ? B64[c & 63] : "=";
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let at = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => {
      const ch = clean[i + k];
      return ch === undefined ? 0 : B64.indexOf(ch);
    });
    const chunk = ((v[0] ?? 0) << 18) | ((v[1] ?? 0) << 12) | ((v[2] ?? 0) << 6) | (v[3] ?? 0);
    if (at < out.length) out[at++] = (chunk >> 16) & 255;
    if (at < out.length) out[at++] = (chunk >> 8) & 255;
    if (at < out.length) out[at++] = chunk & 255;
  }
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const api = subtle();
  const base = await api.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return await api.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Verschlüsselt einen Text. Leeres Kennwort heißt AUSDRÜCKLICH unverschlüsselt —
 * das steht dann auch so in der Hülle, damit niemand eine offene Ablage für eine
 * geschützte hält.
 */
export async function sealText(plain: string, passphrase: string): Promise<Envelope> {
  if (passphrase === "") return { v: ENVELOPE_VERSION, enc: "none", data: plain };
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const cipher = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plain),
  );
  return {
    v: ENVELOPE_VERSION,
    enc: "aes-gcm-256",
    kdf: "pbkdf2-sha256",
    iter: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher)),
  };
}

/**
 * Öffnet eine Hülle. Ein falsches Kennwort führt zu einer klaren Meldung, nicht
 * zu einem kaputten Regal: das ist der Fall, der in der Gruppe wirklich vorkommt.
 */
export async function openEnvelope(raw: unknown, passphrase: string): Promise<string> {
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GroupCryptoError("Das ist kein Chardex35-Regal (unbekanntes Format).");
  }
  const envelope = parsed.data;
  if (envelope.v > ENVELOPE_VERSION) {
    throw new GroupCryptoError(
      `Dieses Regal wurde mit einer neueren Fassung der App geschrieben (Format ${envelope.v}). Aktualisiere die App.`,
    );
  }
  if (envelope.enc === "none") {
    if (passphrase !== "") {
      throw new GroupCryptoError(
        "Dieses Regal ist gar nicht verschlüsselt — lass das Kennwort leer.",
      );
    }
    return envelope.data;
  }
  if (passphrase === "") {
    throw new GroupCryptoError("Dieses Regal braucht ein Kennwort.");
  }
  const key = await deriveKey(passphrase, fromBase64(envelope.salt), envelope.iter);
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64(envelope.iv) as unknown as BufferSource },
      key,
      fromBase64(envelope.data) as unknown as BufferSource,
    );
  } catch {
    // AES-GCM prüft mit: hier landet man bei falschem Kennwort UND bei
    // verändertem Inhalt. Beides ist für den Lesenden dasselbe Problem.
    throw new GroupCryptoError("Falsches Kennwort — oder das Regal ist beschädigt.");
  }
  return new TextDecoder().decode(plain);
}
