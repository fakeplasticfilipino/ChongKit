// Empties ../chong-die before a build, keeping TRACKER.md (Vite's emptyOutDir would delete it)
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "chong-die");
if (fs.existsSync(out)) {
  for (const name of fs.readdirSync(out)) {
    if (name !== "TRACKER.md") {
      fs.rmSync(path.join(out, name), { recursive: true, force: true });
    }
  }
}
