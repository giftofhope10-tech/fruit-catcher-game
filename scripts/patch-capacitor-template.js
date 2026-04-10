/**
 * patch-capacitor-template.js
 *
 * Runs via the "postinstall" npm hook (after every `npm install`).
 *
 * THREE-TARGET STRATEGY:
 *
 * TARGET 1 — node_modules/@capacitor/android/capacitor/src/main/AndroidManifest.xml
 *   This is the ':capacitor-android' Gradle library module that is ALWAYS merged
 *   into the app's merged manifest by AGP, regardless of what Appflow does to the
 *   android/ directory.  Patching here is the most reliable fix.
 *
 * TARGET 2 — node_modules/@capacitor/cli/assets/android-template.tar.gz
 *   This is the archive Appflow extracts when it runs `cap add android` to
 *   recreate the android/ directory from scratch.  Patching the archive ensures
 *   the freshly-created android/app/src/main/AndroidManifest.xml already contains
 *   the AD_ID permission before any other step runs.
 *
 * TARGET 3 — android/app/src/main/AndroidManifest.xml  (live project source)
 *   Belt-and-suspenders fallback for when neither of the above run.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AD_ID_LINE = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />';

// ─── helpers ────────────────────────────────────────────────────────────────

function injectAdId(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`[AD_ID-patch] not found (skip): ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        console.log(`[AD_ID-patch] OK (already present): ${filePath}`);
        return true;
    }

    let patched = false;

    // Strategy 1: after INTERNET permission (flexible regex)
    const internetRegex = /(<uses-permission[^>]*android\.permission\.INTERNET[^>]*\/>)/;
    if (internetRegex.test(content)) {
        content = content.replace(internetRegex, `$1\n${AD_ID_LINE}`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 1 (after INTERNET): ${filePath}`);
    }

    // Strategy 2: before <application tag
    if (!patched) {
        const appTagRegex = /(\s*<application\b)/;
        if (appTagRegex.test(content)) {
            content = content.replace(appTagRegex, `\n${AD_ID_LINE}$1`);
            patched = true;
            console.log(`[AD_ID-patch] Strategy 2 (before <application>): ${filePath}`);
        }
    }

    // Strategy 3: before </manifest>
    if (!patched && content.includes('</manifest>')) {
        content = content.replace('</manifest>', `${AD_ID_LINE}\n</manifest>`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 3 (before </manifest>): ${filePath}`);
    }

    if (!patched) {
        console.error(`[AD_ID-patch] ERROR: No insertion point found in: ${filePath}`);
        return false;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[AD_ID-patch] INJECTED successfully: ${filePath}`);
    return true;
}

// ─── TARGET 1: capacitor-android Gradle library manifest ────────────────────
// This is the DEFINITIVE fix. AGP always merges this manifest into the app,
// no matter what Appflow does to android/app/src/main/AndroidManifest.xml.

const libraryManifest = path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'android',
    'capacitor', 'src', 'main', 'AndroidManifest.xml'
);
injectAdId(libraryManifest);

// ─── TARGET 2: patch the android-template.tar.gz archive ────────────────────
// When Appflow recreates android/ from scratch via `cap add android`, it
// extracts this archive.  We patch the manifest inside the archive so the
// freshly created project already includes AD_ID.

const archivePath = path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'cli',
    'assets', 'android-template.tar.gz'
);

if (fs.existsSync(archivePath)) {
    const tmpDir = path.join(require('os').tmpdir(), 'cap-android-template-patch');
    try {
        // Clean and extract
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.mkdirSync(tmpDir, { recursive: true });
        execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`);

        // Patch the manifest inside the extracted tree
        const archiveManifest = path.join(tmpDir, 'app', 'src', 'main', 'AndroidManifest.xml');
        const patched = injectAdId(archiveManifest);

        if (patched) {
            // Repack — preserve original directory structure
            execSync(`tar -czf "${archivePath}" -C "${tmpDir}" .`);
            console.log(`[AD_ID-patch] Template archive repacked: ${archivePath}`);
        }

        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
        console.error(`[AD_ID-patch] WARNING: Template archive patch failed: ${err.message}`);
        // Non-fatal — TARGET 1 is the primary fix
    }
} else {
    console.log(`[AD_ID-patch] not found (skip): ${archivePath}`);
}

// ─── TARGET 3: live android source manifest ──────────────────────────────────

const sourceManifest = path.join(
    __dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'
);
injectAdId(sourceManifest);
