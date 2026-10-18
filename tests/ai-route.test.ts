import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { AI_INSTRUCTIONS } from "../src/lib/ai";
const state = vi.hoisted(() => ({
  configured: true,
  user: true,
  key: true,
  allowed: true,
  parse: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  serverSupabase: async () =>
    state.configured
      ? {
          auth: {
            getUser: async () => ({
              data: { user: state.user ? { id: "user" } : null },
            }),
          },
          rpc: async () => ({ data: state.allowed, error: null }),
        }
      : null,
}));
vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  class FakeOpenAI {
    static APIError = actual.APIError;
    responses = { parse: state.parse };
  }
  return { default: FakeOpenAI };
});
import { POST } from "../src/app/api/ai/listing/route";
const draft = {
  title: "Cream lamp",
  category: "items",
  subcategory: "Electronics",
  description: "A cream desk lamp with an adjustable arm.",
  visible_details: ["Cream shade"],
  seller_checks: ["Check it works."],
};
function request(
  type = "image/jpeg",
  bytes = new Uint8Array([255, 216, 255, 224]),
  {
    url = "http://localhost:3000/api/ai/listing",
    headers = { host: "localhost:3000", origin: "http://localhost:3000" },
  }: { url?: string; headers?: HeadersInit } = {},
) {
  const form = new FormData();
  form.set("image", new File([bytes], "photo.jpg", { type }));
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: form,
  });
}
beforeEach(() => {
  state.configured = true;
  state.user = true;
  state.allowed = true;
  state.parse.mockReset();
  vi.stubEnv("OPENAI_API_KEY", "test-placeholder-not-a-real-key");
});
afterEach(() => vi.unstubAllEnvs());

describe.each(["development", "production"])(
  "AI request origins in %s",
  (mode) => {
    beforeEach(() => vi.stubEnv("NODE_ENV", mode));

    it.each([
      ["http://localhost:3000", "localhost:3000", "http://localhost:3000"],
      ["http://0.0.0.0:3000", "localhost:3000", "http://localhost:3000"],
      ["http://127.0.0.1:3000", "127.0.0.1:3000", "http://127.0.0.1:3000"],
      ["http://[::1]:3000", "[::1]:3000", "http://[::1]:3000"],
      ["http://0.0.0.0:3001", "192.168.1.10:3001", "http://192.168.1.10:3001"],
      [
        "https://0.0.0.0:3000",
        "campusloop.example",
        "https://campusloop.example",
      ],
      [
        "https://campusloop.vercel.app",
        "campusloop.vercel.app",
        "https://campusloop.vercel.app",
      ],
    ])(
      "accepts request URL %s with Host %s and Origin %s",
      async (url, host, origin) => {
        state.parse.mockResolvedValue({ output_parsed: draft });
        const response = await POST(
          request(undefined, undefined, {
            url: `${url}/api/ai/listing`,
            headers: { host, origin },
          }),
        );
        expect(response.status).toBe(200);
        expect((await response.json()).draft).toEqual(draft);
        expect(state.parse).toHaveBeenCalledOnce();
      },
    );

    it.each([
      ["cross-site", "https://attacker.example"],
      ["wrong scheme", "http://campusloop.example"],
      ["wrong port", "https://campusloop.example:3000"],
      ["localhost against a deployed Host", "http://localhost:3000"],
      ["internal binding address", "https://0.0.0.0:3000"],
      ["deceptive hostname", "https://campusloop.example.attacker.example"],
      ["missing", undefined],
      ["empty", ""],
      ["opaque", "null"],
      ["malformed", "not a URL"],
      ["relative", "//campusloop.example"],
      ["non-HTTP scheme", "blob:https://campusloop.example/photo"],
      ["credentials", "https://attacker@campusloop.example"],
      ["path", "https://campusloop.example/"],
      ["query", "https://campusloop.example?x=1"],
      ["fragment", "https://campusloop.example#x"],
      [
        "multiple origins",
        "https://campusloop.example, https://attacker.example",
      ],
    ])("rejects %s origins before calling OpenAI", async (_label, origin) => {
      const headers: Record<string, string> = { host: "campusloop.example" };
      if (origin !== undefined) headers.origin = origin;
      const response = await POST(
        request(undefined, undefined, {
          url: "https://0.0.0.0:3000/api/ai/listing",
          headers,
        }),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Invalid request origin.",
      });
      expect(state.parse).not.toHaveBeenCalled();
    });

    it.each([
      undefined,
      "",
      "campusloop.example/path",
      "campusloop.example, attacker.example",
    ])("rejects missing or malformed Host %s", async (host) => {
      const headers: Record<string, string> = {
        origin: "https://campusloop.example",
      };
      if (host !== undefined) headers.host = host;
      const response = await POST(
        request(undefined, undefined, {
          url: "https://campusloop.example/api/ai/listing",
          headers,
        }),
      );
      expect(response.status).toBe(403);
      expect(state.parse).not.toHaveBeenCalled();
    });

    it("ignores forged forwarding headers when checking the destination", async () => {
      const headers = {
        host: "campusloop.example",
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
        forwarded: "host=attacker.example;proto=https",
      };
      const url = "https://0.0.0.0:3000/api/ai/listing";
      const rejected = await POST(
        request(undefined, undefined, { url, headers }),
      );
      expect(rejected.status).toBe(403);
      expect(state.parse).not.toHaveBeenCalled();

      state.parse.mockResolvedValue({ output_parsed: draft });
      headers.origin = "https://campusloop.example";
      expect(
        (await POST(request(undefined, undefined, { url, headers }))).status,
      ).toBe(200);
    });

    it("still requires authentication with a different binding address", async () => {
      state.user = false;
      const response = await POST(
        request(undefined, undefined, {
          url: "http://0.0.0.0:3000/api/ai/listing",
        }),
      );
      expect(response.status).toBe(401);
      expect(state.parse).not.toHaveBeenCalled();
    });
  },
);
describe("AI API boundary with mocked provider (no real API request)", () => {
  it("refuses cross-origin requests", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/listing", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "https://attacker.example" },
    });
    expect((await POST(req)).status).toBe(403);
  });
  it("requires backend and authentication", async () => {
    state.configured = false;
    expect((await POST(request())).status).toBe(503);
    state.configured = true;
    state.user = false;
    expect((await POST(request())).status).toBe(401);
    expect(state.parse).not.toHaveBeenCalled();
  });
  it("provides a manual fallback without a key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await POST(request());
    expect(r.status).toBe(503);
    expect((await r.json()).error).toContain("finish manually");
    expect(state.parse).not.toHaveBeenCalled();
  });
  it("rejects forged image MIME and oversized bodies", async () => {
    expect(
      (await POST(request("image/jpeg", new TextEncoder().encode("<script>"))))
        .status,
    ).toBe(415);
    const r = new NextRequest("http://localhost:3000/api/ai/listing", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-length": "9000000",
      },
      body: "x",
    });
    expect((await POST(r)).status).toBe(413);
  });
  it("enforces database-backed quota before calling provider", async () => {
    state.allowed = false;
    expect((await POST(request())).status).toBe(429);
    expect(state.parse).not.toHaveBeenCalled();
  });
  it("returns schema-validated drafts via the Responses API", async () => {
    state.parse.mockResolvedValue({ output_parsed: draft });
    const r = await POST(request());
    expect(r.status).toBe(200);
    expect((await r.json()).draft).toEqual(draft);
    expect(state.parse.mock.calls[0][0].store).toBe(false);
    expect(state.parse.mock.calls[0][0].instructions).toBe(AI_INSTRUCTIONS);
  });
  it("handles refusals and empty outputs without fake success", async () => {
    state.parse.mockResolvedValue({ output_parsed: null });
    expect((await POST(request())).status).toBe(422);
  });
  it("rejects malformed outputs", async () => {
    state.parse.mockResolvedValue({ output_parsed: { title: "x" } });
    expect((await POST(request())).status).toBe(422);
  });
  it("handles network failure without leaking provider details", async () => {
    state.parse.mockRejectedValue(new Error("secret provider context"));
    const r = await POST(request());
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toContain(
      "secret provider context",
    );
  });
});
