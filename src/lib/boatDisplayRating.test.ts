import { describe, expect, it } from "vitest";
import {
  buildDemoBoatReviews,
  computeBoatDisplayRating,
} from "../../server/boatDisplayRating.js";

describe("computeBoatDisplayRating", () => {
  const boatId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("uses only demo stars when there are no real ratings", () => {
    const demo = buildDemoBoatReviews(boatId);
    const { average, count } = computeBoatDisplayRating(boatId, []);
    const expected = demo.reduce((s, r) => s + r.stars, 0) / demo.length;
    expect(count).toBe(demo.length);
    expect(average).toBe(Math.round(expected * 10) / 10);
  });

  it("combines real and demo stars in one average", () => {
    const { average, count } = computeBoatDisplayRating(boatId, [5, 3]);
    const demo = buildDemoBoatReviews(boatId);
    const all = [5, 3, ...demo.map((r) => r.stars)];
    const expected = all.reduce((a, b) => a + b, 0) / all.length;
    expect(count).toBe(all.length);
    expect(average).toBe(Math.round(expected * 10) / 10);
  });

  it("ignores invalid real star values", () => {
    const onlyDemo = computeBoatDisplayRating(boatId, [0, 9]);
    const demoOnly = computeBoatDisplayRating(boatId, []);
    expect(onlyDemo).toEqual(demoOnly);
  });
});
