/**
 * patch-capacitor-template.js
 *
 * Runs via the "postinstall" npm hook (after every `npm install`).
 *
 * Problem: Capacitor 6's library manifests include
 *   <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
 * which can interfere with the manifest merger and cause AD_ID to be absent
 * from the final AAB, triggering Play Store and Unity Ads warnings.
 *
 * Strategy: Strip any tools:node attribute from the AD_ID permission in every
 * Capacitor library manifest so they never instruct the merger to remove it.
 * The app's own AndroidManifest.xml (highest-priority manifest) uses a plain
 * <uses-permission> declaration which is always preserved by the merger.
 *
 * THREE TARGETS:
 *
 * TARGET 1 — node_modules/@capacitor/android/capacitor/src/main/AndroidManifest.xml
 *   The ':capacitor-android' Gradle library included by capacitor.settings.gradle.
 *
 * TARGET 2 — node_modules/@capacitor/app/android/src/main/AndroidManifest.xml
 *   The ':capacitor-app' Gradle library.
 *
 * TARGET 3 — node_modules/@capacitor/cli/assets/android-template.tar.gz
 *   Template archive extracted by `cap add android`. Patching it means a
 *   freshly-created android/ directory already has the permission.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AD_ID_PLAIN = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />';

function injectAdId(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`[AD_ID-patch] not found (skip): ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        const alreadyPlain = content.includes(AD_ID_PLAIN);
        if (!alreadyPlain) {
            content = content.replace(
                /<uses-permission[^>]*com\.google\.android\.gms\.permission\.AD_ID[^>]*\/>/,
                AD_ID_PLAIN
            );
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`[AD_ID-patch] NORMALIZED to plain declaration (stripped tools:node): ${filePath}`);
        } else {
            console.log(`[AD_ID-patch] OK (plain declaration present): ${filePath}`);
        }
        return true;
    }

    let patched = false;

    const internetRegex = /(<uses-permission[^>]*android\.permission\.INTERNET[^>]*\/>)/;
    if (internetRegex.test(content)) {
        content = content.replace(internetRegex, `$1\n${AD_ID_PLAIN}`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 1 (after INTERNET): ${filePath}`);
    }

    if (!patched) {
        const appTagRegex = /(\s*<application\b)/;
        if (appTagRegex.test(content)) {
            content = content.replace(appTagRegex, `\n${AD_ID_PLAIN}$1`);
            patched = true;
            console.log(`[AD_ID-patch] Strategy 2 (before <application>): ${filePath}`);
        }
    }

    if (!patched && content.includes('</manifest>')) {
        content = content.replace('</manifest>', `${AD_ID_PLAIN}\n</manifest>`);
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

injectAdId(path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'android',
    'capacitor', 'src', 'main', 'AndroidManifest.xml'
));

injectAdId(path.join(
    __dirname, '..', 'node_modules', '@capacitor', 'app',
    'android', 'src', 'main', 'AndroidManifest.xml'
));

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
