import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
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
) {
  const form = new FormData();
  form.set("image", new File([bytes], "photo.jpg", { type }));
  return new NextRequest("http://localhost:3000/api/ai/listing", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
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
describe("AI API boundary with mocked provider (no real API request)", () => {
  it("refuses cross-origin requests", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/listing", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });
    expect((await POST(req)).status).toBe(403);
  });
  it("requires backend and authentication", async () => {
    state.configured = false;
    expect((await POST(request())).status).toBe(503);
    state.configured = true;
    state.user = false;
    expect((await POST(request())).status).toBe(401);
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
      headers: { origin: "http://localhost:3000", "content-length": "9000000" },
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
