import { describe, expect, it } from "vitest";
import { readJson, sameOrigin } from "../src/lib/http";

describe("request boundaries", () => {
  it("recognizes the browser host when the framework rewrites the request URL", () => {
    expect(
      sameOrigin(
        new Request("http://localhost:3000/api/demo", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBe(true);
  });
  it("respects the HTTPS public origin and rejects a different origin", () => {
    const headers = {
      host: "internal:3000",
      "x-forwarded-host": "cardapio.example",
      "x-forwarded-proto": "https",
    };
    expect(
      sameOrigin(
        new Request("http://internal:3000/api/demo", {
          headers: { ...headers, origin: "https://cardapio.example" },
        }),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new Request("http://internal:3000/api/demo", {
          headers: { ...headers, origin: "https://outro.example" },
        }),
      ),
    ).toBe(false);
  });
  it("rejects malformed JSON and bodies exceeding the byte limit", async () => {
    const parse = (body: string) =>
      readJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );
    await expect(parse('{"name":"Cozinha"}')).resolves.toEqual({
      name: "Cozinha",
    });
    await expect(parse("{")).resolves.toBeNull();
    await expect(parse(JSON.stringify("é".repeat(24001)))).resolves.toBeNull();
  });
});
