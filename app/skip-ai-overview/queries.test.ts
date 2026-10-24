import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SEARCH, normalise, SEARCHES, SOURCES, searchFor } from "./queries.ts";

describe("searchFor", () => {
  it("finds each canned query", () => {
    assert.equal(searchFor("how long to boil an egg").id, "egg");
    assert.equal(searchFor("is a tomato a fruit").id, "tomato");
    assert.equal(searchFor("how many ounces in a cup").id, "cup");
  });

  it("ignores case, punctuation and extra spaces", () => {
    assert.equal(searchFor("  Is a Tomato a FRUIT?? ").id, "tomato");
    assert.equal(searchFor("How many ounces in a cup?").id, "cup");
    assert.equal(searchFor("how   long to boil an egg.").id, "egg");
  });

  it("falls back to the egg page for anything else", () => {
    assert.equal(searchFor("weather tomorrow"), DEFAULT_SEARCH);
    assert.equal(searchFor(""), DEFAULT_SEARCH);
    assert.equal(searchFor("tomato"), DEFAULT_SEARCH);
  });
});

describe("normalise", () => {
  it("keeps letters and digits from any script", () => {
    assert.equal(normalise("Café — 1/2 cup!"), "café 1 2 cup");
  });
});

describe("content", () => {
  it("only cites sources that exist", () => {
    for (const search of SEARCHES) {
      const cited = [
        ...search.cards.map((card) => card.source),
        ...search.results.map((result) => result.source),
        ...search.overview.flatMap((block) => {
          if (block.kind === "h") return [];

          const lines = block.kind === "p" ? [block.line] : block.items;

          return lines.flatMap((line) => line.cite?.sources ?? []);
        }),
      ];

      for (const id of cited) assert.ok(SOURCES[id], `${search.id} cites unknown source "${id}"`);
    }
  });

  it("never links to a real domain", () => {
    for (const source of Object.values(SOURCES)) assert.match(source.url, /\.example$/);
  });
});
