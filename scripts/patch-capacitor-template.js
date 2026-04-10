/**
 * patch-capacitor-template.js
 *
 * Runs via the "postinstall" npm hook (after every `npm install`).
 *
 * FOUR-TARGET STRATEGY:
 *
 * TARGET 1 — node_modules/@capacitor/android/capacitor/src/main/AndroidManifest.xml
 *   The ':capacitor-android' Gradle library included by capacitor.settings.gradle.
 *   AGP ALWAYS merges this into the app manifest. Most reliable fix.
 *
 * TARGET 2 — node_modules/@capacitor/app/android/src/main/AndroidManifest.xml
 *   The ':capacitor-app' Gradle library. Also always merged.
 *
 * TARGET 3 — node_modules/@capacitor/cli/assets/android-template.tar.gz
 *   Template archive extracted by `cap add android`. Patching it means a
 *   freshly-created android/ directory already has the permission.
 *
 * TARGET 4 — android/app/src/main/AndroidManifest.xml  (live project source)
 *   Belt-and-suspenders fallback.
 *
 * All injections use tools:node="replace" so our declaration wins even if a
 * library manifest has tools:node="remove" on the same permission.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AD_ID_PLAIN   = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />';
const AD_ID_REPLACE = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />';

// ─── helpers ────────────────────────────────────────────────────────────────

function ensureToolsNs(content) {
    if (content.includes('xmlns:tools')) return content;
    return content.replace(
        'xmlns:android="http://schemas.android.com/apk/res/android"',
        'xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"'
    );
}

function injectAdId(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`[AD_ID-patch] not found (skip): ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        // Always replace the entire element to ensure it's clean and has tools:node="replace"
        const cleanDecl = '<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />';
        const alreadyClean = content.includes(cleanDecl);
        if (!alreadyClean) {
            // Replace entire element (handles malformed, missing tools:node, etc.)
            content = content.replace(
                /<uses-permission[^>]*com\.google\.android\.gms\.permission\.AD_ID[^>]*>/,
                cleanDecl
            );
            content = ensureToolsNs(content);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`[AD_ID-patch] NORMALIZED to clean declaration: ${filePath}`);
        } else {
            console.log(`[AD_ID-patch] OK (clean declaration present): ${filePath}`);
        }
        return true;
    }

    // Ensure xmlns:tools is declared
    content = ensureToolsNs(content);

    let patched = false;

    // Strategy 1: after INTERNET permission (flexible regex)
    const internetRegex = /(<uses-permission[^>]*android\.permission\.INTERNET[^>]*\/>)/;
    if (internetRegex.test(content)) {
        content = content.replace(internetRegex, `$1\n${AD_ID_REPLACE}`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 1 (after INTERNET): ${filePath}`);
    }

    // Strategy 2: before <application tag
    if (!patched) {
        const appTagRegex = /(\s*<application\b)/;
        if (appTagRegex.test(content)) {
            content = content.replace(appTagRegex, `\n${AD_ID_REPLACE}$1`);
            patched = true;
            console.log(`[AD_ID-patch] Strategy 2 (before <application>): ${filePath}`);
        }
    }

    // Strategy 3: before </manifest>
    if (!patched && content.includes('</manifest>')) {
        content = content.replace('</manifest>', `${AD_ID_REPLACE}\n</manifest>`);
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
injectAdId(path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'android',
    'capacitor', 'src', 'main', 'AndroidManifest.xml'
));

// ─── TARGET 2: capacitor-app Gradle library manifest ───────────────────────
injectAdId(path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'app',
    'android', 'src', 'main', 'AndroidManifest.xml'
));

// ─── TARGET 3: patch the android-template.tar.gz archive ────────────────────
const archivePath = path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'cli',
    'assets', 'android-template.tar.gz'
);

if (fs.existsSync(archivePath)) {
    const tmpDir = path.join(require('os').tmpdir(), 'cap-android-template-patch');
    try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.mkdirSync(tmpDir, { recursive: true });
        execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`);

        const archiveManifest = path.join(tmpDir, 'app', 'src', 'main', 'AndroidManifest.xml');
        const patched = injectAdId(archiveManifest);

        if (patched) {
            execSync(`tar -czf "${archivePath}" -C "${tmpDir}" .`);
            console.log(`[AD_ID-patch] Template archive repacked: ${archivePath}`);
        }

        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
        console.error(`[AD_ID-patch] WARNING: Template archive patch failed: ${err.message}`);
    }
} else {
    console.log(`[AD_ID-patch] not found (skip): ${archivePath}`);
}

// ─── TARGET 4: live android source manifest ──────────────────────────────────
injectAdId(path.join(
    __dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'
));
