import { z } from "zod";

/**
 * Die Hülle, in der ein Regal in der Ablage liegt.
 *
 * Das Schema steht hier in core, das Verschlüsseln selbst in apps/web: core ist
 * plattformfrei (nur ES2022, kein Browser), und WebCrypto ist eine
 * Browser-Schnittstelle. Die Form der Daten gehört trotzdem hierher — zu den
 * anderen Schemata, damit sie an einer Stelle nachlesbar und geprüft ist.
 *
 * Absichtlich lesbares JSON und nicht ein Klumpen Base64: wer von Hand in die
 * Ablage schaut, soll sehen, WAS das ist und mit welchem Verfahren. Sonst hält man
 * eine kaputte Datei für eine verschlüsselte.
 */

export const ENVELOPE_VERSION = 1;

export const envelopeSchema = z.discriminatedUnion("enc", [
  z.object({
    v: z.number().int(),
    enc: z.literal("none"),
    data: z.string(),
  }),
  z.object({
    v: z.number().int(),
    enc: z.literal("aes-gcm-256"),
    kdf: z.literal("pbkdf2-sha256"),
    iter: z.number().int(),
    salt: z.string(),
    iv: z.string(),
    data: z.string(),
  }),
]);
export type Envelope = z.infer<typeof envelopeSchema>;
