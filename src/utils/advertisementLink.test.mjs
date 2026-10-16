import { test } from "node:test";
import assert from "node:assert/strict";
import { advertisementLink } from "./advertisementLink.js";
const site = "https://shikshacom.com";
test("shared ad paths open on the website, including query and hash", () => {
  assert.equal(advertisementLink("/courses?board=mbse#classes", site), site + "/courses?board=mbse#classes");
  assert.equal(advertisementLink("experts/teacher", site), site + "/experts/teacher");
});
test("absolute dashboard or external destinations stay unchanged", () => {
  assert.equal(advertisementLink("https://app.shikshacom.com/subjects", site), "https://app.shikshacom.com/subjects");
  assert.equal(advertisementLink("https://example.com/info", site), "https://example.com/info");
});
test("missing, malformed and executable destinations are not clickable", () => {
  for (const value of [null, "", " ", "javascript:alert(1)", "data:text/html,test", "https://["]) {
    assert.equal(advertisementLink(value, site), "");
  }
});
