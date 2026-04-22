import assert from "node:assert/strict";
import test from "node:test";
import { parseCoordinateText } from "./coordinates.ts";

test("parses an anchored coordinate pair", () => {
  assert.deepEqual(parseCoordinateText("37.7749, -122.4194"), {
    lat: 37.7749,
    lng: -122.4194,
  });
});

test("parses labeled latitude and longitude", () => {
  assert.deepEqual(parseCoordinateText("lat: 37.7749, lng: -122.4194"), {
    lat: 37.7749,
    lng: -122.4194,
  });
});

test("parses Google Maps @lat,lng URLs", () => {
  assert.deepEqual(
    parseCoordinateText("https://maps.google.com/@37.7749,-122.4194,16z"),
    {
      lat: 37.7749,
      lng: -122.4194,
    },
  );
});

test("parses Google Maps q parameter URLs", () => {
  assert.deepEqual(
    parseCoordinateText("https://maps.google.com/?q=37.7749,-122.4194"),
    {
      lat: 37.7749,
      lng: -122.4194,
    },
  );
});

test("parses Google Maps ll parameter URLs", () => {
  assert.deepEqual(
    parseCoordinateText("https://maps.google.com/?ll=37.7749,-122.4194"),
    {
      lat: 37.7749,
      lng: -122.4194,
    },
  );
});

test("parses percent-encoded coordinates", () => {
  assert.deepEqual(
    parseCoordinateText("https://maps.google.com/?q=37.7749%2C-122.4194"),
    {
      lat: 37.7749,
      lng: -122.4194,
    },
  );
});

test("parses full-width comma coordinate separators", () => {
  assert.deepEqual(parseCoordinateText("37.7749，-122.4194"), {
    lat: 37.7749,
    lng: -122.4194,
  });
});

test("rejects out-of-range pairs", () => {
  assert.equal(parseCoordinateText("91, -122.4194"), null);
  assert.equal(parseCoordinateText("37.7749, -181"), null);
});

test("does not parse embedded unrelated number pairs", () => {
  assert.equal(parseCoordinateText("Use the 1024, 768 flyer image."), null);
  assert.equal(parseCoordinateText("Specs: 1.5 GB, 2.0 GHz"), null);
});
