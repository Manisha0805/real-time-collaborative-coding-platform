#!/usr/bin/env node
// Pre-pull the sandbox images so the first user request is not slow.
//   npm run pull-images
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const languageMap = require("../src/utils/languageMap");
const docker = require("../src/services/execution/dockerProvider");

(async () => {
  const images = [...new Set(Object.values(languageMap).filter((l) => l && l.image).map((l) => l.image))];
  console.log("Pulling:", images.join(", "));
  let failed = 0;
  for (const image of images) {
    process.stdout.write(`  ${image} ... `);
    try { await docker.pullImage(image); console.log("ok"); }
    catch (e) { failed++; console.log(`FAILED (${e.message})`); }
  }
  if (failed) { console.error(`\n${failed} image(s) failed. Is Docker running and reachable?`); process.exit(1); }
  console.log("\nAll runner images are ready.");
})();
