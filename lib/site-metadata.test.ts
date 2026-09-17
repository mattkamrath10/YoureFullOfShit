import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_ASSET_VERSION,
  buildRootMetadata,
  buildStoryMetadata,
  getOgImageUrl,
} from "./site-metadata.ts";

test("OG image is 1200x630 for iMessage and Facebook", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://laststoryteller.com";
  const meta = buildRootMetadata();
  const images = meta.openGraph?.images;
  assert.ok(Array.isArray(images));
  const first = images[0] as {
    url: string;
    width: number;
    height: number;
  };
  assert.equal(first.width, 1200);
  assert.equal(first.height, 630);
  assert.match(String(first.url), /og-share\.png/);
  assert.match(
    getOgImageUrl(),
    new RegExp(
      `^https://laststoryteller\\.com/og-share\\.png\\?v=${BRAND_ASSET_VERSION}$`,
    ),
  );
  const apple = meta.icons?.apple;
  assert.ok(Array.isArray(apple));
  assert.equal(
    (apple[0] as { url: string }).url,
    "/apple-touch-icon.png",
  );
});

test("public story metadata uses the same branded OG image", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://laststoryteller.com";
  const meta = buildStoryMetadata({
    id: "abc",
    title: "A story",
    preview: "Hello",
  });
  const images = meta.openGraph?.images;
  assert.ok(Array.isArray(images));
  const first = images[0] as { url: string; width: number; height: number };
  assert.equal(first.width, 1200);
  assert.equal(first.height, 630);
  assert.match(String(first.url), /og-share\.png/);
});
