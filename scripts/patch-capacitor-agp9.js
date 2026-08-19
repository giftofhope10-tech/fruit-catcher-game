'use strict';

const fs = require('fs');
const path = require('path');

const capacitorRoot = path.join(__dirname, '..', 'node_modules', '@capacitor');
const legacyFile = "getDefaultProguardFile('proguard-android.txt')";
const optimizedFile = "getDefaultProguardFile('proguard-android-optimize.txt')";

let patchedCount = 0;
let legacyCount = 0;

function patchGradleFiles(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      patchGradleFiles(fullPath);
      continue;
    }

    if (entry.name !== 'build.gradle') continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(legacyFile)) continue;

    legacyCount += 1;
    const updated = content.split(legacyFile).join(optimizedFile);
    fs.writeFileSync(fullPath, updated, 'utf8');
    patchedCount += 1;
    console.log(`[AGP9-patch] Updated: ${fullPath}`);
  }
}

try {
  patchGradleFiles(capacitorRoot);

  if (!fs.existsSync(capacitorRoot)) {
    console.log(`[AGP9-patch] Capacitor is not installed; nothing to patch.`);
  } else if (patchedCount === 0) {
    console.log(`[AGP9-patch] OK: no unsupported ProGuard defaults found.`);
  } else {
    console.log(`[AGP9-patch] Patched ${patchedCount} of ${legacyCount} legacy Gradle file(s).`);
  }
} catch (err) {
  console.warn(`[AGP9-patch] WARNING: ${err.message} — continuing (non-fatal)`);
}
