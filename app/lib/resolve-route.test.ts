import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRoute } from "./resolve-route.ts";

const routes = [
  "lab",
  "plurise",
  "time-away",
  "figma-detach",
  "linkedin-nav",
  "two-streams",
  "best-part",
  "voice-note",
  "contra-schedule",
  "could-be-an-email",
  "lunon-living-report",
];

describe("resolveRoute", () => {
  it("sends every mangled PLURISE link to /plurise/", () => {
    const links = [
      "/plurise)",
      "/plurise).",
      "/plurise),",
      "/plurise.",
      "/plurise,",
      "/plurise;",
      "/plurise:",
      "/plurise]",
      "/plurise>",
      "/plurise!",
      "/plurise'",
      '/plurise"',
      "/plurise/)",
      "/plurise/).",
      "/plurise%29",
      "/plurise%29.",
      "/plurise%20",
      "/PLURISE",
      "/Plurise",
      "/PLURISE)",
      "/Plurise/",
      "/plurise/index.html",
      "/plurise//",
      "/plurise/anything",
      "/plurise-lab/",
      "/plurse",
      "/plurisee",
      "/plur",
      "/(plurise)",
    ];
    for (const link of links) assert.equal(resolveRoute(link, routes), "/plurise/", link);
  });

  it("fixes case, punctuation and truncation on other pages", () => {
    assert.equal(resolveRoute("/Linkedin-nav", routes), "/linkedin-nav/");
    assert.equal(resolveRoute("/figma-deta", routes), "/figma-detach/");
    assert.equal(resolveRoute("/time-away).", routes), "/time-away/");
    assert.equal(resolveRoute("/two-streams-phone/", routes), "/two-streams/");
    assert.equal(resolveRoute("/LAB", routes), "/lab/");
  });

  it("sends an empty or punctuation-only path home", () => {
    assert.equal(resolveRoute("/)", routes), "/");
    assert.equal(resolveRoute("/.", routes), "/");
  });

  it("leaves genuinely unknown or ambiguous paths alone", () => {
    assert.equal(resolveRoute("/wp-admin", routes), null);
    assert.equal(resolveRoute("/xyz", routes), null);
    // "co" starts both contra-schedule and could-be-an-email, and is too short anyway.
    assert.equal(resolveRoute("/co", routes), null);
  });

  it("survives a path that can't be decoded", () => {
    assert.equal(resolveRoute("/plurise%", routes), "/plurise/");
  });

  it("works when serialised and run on its own, as the 404 page does", () => {
    const standalone = new Function(`return (${resolveRoute.toString()})`)() as typeof resolveRoute;
    assert.equal(standalone("/plurise)", routes), "/plurise/");
    assert.equal(standalone("/Linkedin-nav", routes), "/linkedin-nav/");
  });
});
