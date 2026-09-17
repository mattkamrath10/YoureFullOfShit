import assert from "node:assert/strict";
import test from "node:test";
import { submitStory } from "./submit-story.ts";

const baseInput = {
  title: "A story",
  categoryId: "category-1",
  body: "Story body",
  isAnonymous: true,
  media: [],
};

test("story submission uses the cookie-authenticated server route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ input: url, init });
    if (url === "/api/stories") {
      return Response.json(
        {
          data: {
            id: "story-1",
            userId: "user-1",
            status: "pending",
          },
        },
        { status: 201 },
      );
    }
    return Response.json({ ok: true });
  };

  try {
    assert.equal(await submitStory(baseInput), "story-1");
    assert.equal(calls[0]?.input, "/api/stories");
    assert.equal(calls[0]?.init?.credentials, "include");
    const body = JSON.parse(String(calls[0]?.init?.body));
    assert.equal(body.title, "A story");
    assert.equal("hasPlus" in body, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authoritative server quota rejection is shown to the client", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: "PLUS_REQUIRED",
          message:
            "Your 2 free story submissions have been used. Join Last Storyteller Plus for $1.99/month to continue telling your stories.",
        },
      },
      { status: 403 },
    );

  try {
    await assert.rejects(
      submitStory({ ...baseInput, hasPlus: true }),
      /Your 2 free story submissions have been used/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
