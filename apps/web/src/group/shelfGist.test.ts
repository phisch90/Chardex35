import { describe, expect, it } from "vitest";
import { shelfIdFromLink, shelfUrl } from "./shelfGist.js";

/**
 * Was Philipp weitergibt, ist nicht vorhersehbar: manchmal die Adresse, manchmal
 * nur die Kennung, manchmal was WhatsApp aus dem Link gemacht hat. Wenn das
 * Einfügen scheitert, gibt der Freund auf — deshalb ist diese Funktion großzügig
 * und deshalb ist sie geprüft.
 */
describe("shelfIdFromLink", () => {
  const id = "3f7a9c1e2b4d6f8a0c2e";

  it(`nimmt die reine Kennung`, () => {
    expect(shelfIdFromLink(id)).toBe(id);
    expect(shelfIdFromLink(`  ${id}\n`)).toBe(id);
  });

  it(`holt sie aus einer Gist-Adresse`, () => {
    expect(shelfIdFromLink(shelfUrl(id))).toBe(id);
    expect(shelfIdFromLink(`https://gist.github.com/phisch90/${id}`)).toBe(id);
    // Mit Anhängseln, wie sie beim Kopieren im Browser entstehen.
    expect(shelfIdFromLink(`https://gist.github.com/phisch90/${id}#file-regal-json`)).toBe(id);
    expect(shelfIdFromLink(`https://gist.github.com/phisch90/${id}/revisions`)).toBe(id);
  });

  it(`überlebt einen Satz drumherum`, () => {
    // So kommt es in WhatsApp an.
    expect(shelfIdFromLink(`Hier mein Regal: ${shelfUrl(id)} — Kennwort sag ich dir gleich`)).toBe(id);
  });

  it(`macht Großbuchstaben klein`, () => {
    expect(shelfIdFromLink(id.toUpperCase())).toBe(id);
  });

  it(`gibt bei Unsinn leer zurück, statt sich etwas zu erfinden`, () => {
    expect(shelfIdFromLink("")).toBe("");
    expect(shelfIdFromLink("mein Regal")).toBe("");
    expect(shelfIdFromLink("https://example.com/nix hier")).toBe("");
  });

  it(`nimmt bei zwei Kennungen die LETZTE`, () => {
    /*
      Der Fall entsteht beim Kopieren aus dem Browser: in der Adresse steht erst
      der Benutzername als Zahlenfolge, dann die Kennung. Die Kennung ist die, die
      hinten steht.
    */
    const other = "aaaaaaaaaaaaaaaaaaaa";
    expect(shelfIdFromLink(`https://gist.github.com/${other}/${id}`)).toBe(id);
  });
});
