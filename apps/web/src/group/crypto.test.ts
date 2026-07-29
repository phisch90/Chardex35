import { describe, expect, it } from "vitest";
import { fromBase64, GroupCryptoError, openEnvelope, sealText, toBase64 } from "./crypto.js";

/**
 * Der Fall, der in der Gruppe wirklich vorkommt, ist nicht der Angreifer — es ist
 * das falsch abgetippte Kennwort. Deshalb steht hier vor allem, dass ein Fehlgriff
 * eine klare Meldung ergibt und nicht ein halb gelesenes Regal.
 */

describe("Base64", () => {
  it(`überlebt beliebige Bytes, auch die über 127`, () => {
    // Genau daran scheitert btoa — und verschlüsselte Daten sind beliebige Bytes.
    const bytes = new Uint8Array([0, 1, 127, 128, 200, 255, 65, 66]);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  it(`kommt mit jeder Länge klar (Auffüllen am Ende)`, () => {
    for (let length = 0; length <= 8; length++) {
      const bytes = new Uint8Array(Array.from({ length }, (_, i) => (i * 37) % 256));
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
  });
});

describe("Verschlüsseln und öffnen", () => {
  const regal = JSON.stringify({ app: "chardex35", characters: [{ name: "Hike Greatbush" }] });

  it(`macht eine Rundreise mit Kennwort`, async () => {
    const envelope = await sealText(regal, "Drachenblut42");
    expect(await openEnvelope(envelope, "Drachenblut42")).toBe(regal);
  });

  it(`lässt den Inhalt nicht durchscheinen`, async () => {
    const envelope = await sealText(regal, "Drachenblut42");
    expect(JSON.stringify(envelope)).not.toContain("Hike");
    expect(JSON.stringify(envelope)).not.toContain("chardex35");
  });

  it(`nimmt zweimal ein anderes Salz — gleicher Inhalt sieht nicht gleich aus`, async () => {
    const a = await sealText(regal, "Drachenblut42");
    const b = await sealText(regal, "Drachenblut42");
    if (a.enc !== "aes-gcm-256" || b.enc !== "aes-gcm-256") throw new Error("nicht verschlüsselt");
    expect(a.salt).not.toBe(b.salt);
    expect(a.data).not.toBe(b.data);
  });

  it(`sagt beim falschen Kennwort klar, was los ist`, async () => {
    const envelope = await sealText(regal, "Drachenblut42");
    await expect(openEnvelope(envelope, "drachenblut42")).rejects.toThrow(/Falsches Kennwort/);
  });

  it(`merkt, wenn am Regal herumgeschraubt wurde`, async () => {
    /*
      AES-GCM prüft den Inhalt mit. Ohne das könnte jemand mit Schreibzugriff auf
      die Ablage Werte verändern, und beim Lesenden käme es unbemerkt an.
    */
    const envelope = await sealText(regal, "Drachenblut42");
    if (envelope.enc !== "aes-gcm-256") throw new Error("nicht verschlüsselt");
    const bytes = fromBase64(envelope.data);
    bytes[3] = (bytes[3] ?? 0) ^ 0xff;
    const verbogen = { ...envelope, data: toBase64(bytes) };
    await expect(openEnvelope(verbogen, "Drachenblut42")).rejects.toThrow(GroupCryptoError);
  });

  it(`kann auch ohne Kennwort — sagt das dann aber offen`, async () => {
    const envelope = await sealText(regal, "");
    expect(envelope.enc).toBe("none");
    expect(await openEnvelope(envelope, "")).toBe(regal);
  });

  it(`verwechselt die beiden Fälle nicht`, async () => {
    const offen = await sealText(regal, "");
    await expect(openEnvelope(offen, "irgendwas")).rejects.toThrow(/gar nicht verschlüsselt/);
    const zu = await sealText(regal, "Drachenblut42");
    await expect(openEnvelope(zu, "")).rejects.toThrow(/braucht ein Kennwort/);
  });

  it(`hält eine fremde Datei für keine Hülle`, async () => {
    await expect(openEnvelope({ irgendwas: 1 }, "x")).rejects.toThrow(/kein Chardex35-Regal/);
    await expect(openEnvelope(null, "")).rejects.toThrow(GroupCryptoError);
  });

  it(`weigert sich bei einer neueren Fassung statt zu raten`, async () => {
    const envelope = await sealText(regal, "Drachenblut42");
    await expect(openEnvelope({ ...envelope, v: 99 }, "Drachenblut42")).rejects.toThrow(
      /neueren Fassung/,
    );
  });
});
