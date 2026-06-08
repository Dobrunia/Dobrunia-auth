const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../src/db/migrations');
const targetDir = path.join(__dirname, '../dist/db/migrations');

fs.mkdirSync(targetDir, { recursive: true });

for (const file of fs.readdirSync(sourceDir)) {
  if (!file.endsWith('.sql')) {
    continue;
  }

  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}
