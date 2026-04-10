/**
 * patch-capacitor-template.js
 *
 * Runs via the "postinstall" npm hook (after every `npm install`).
 * Appflow runs `npm install` BEFORE `cap sync`, so patching the Capacitor
 * Android template here means cap sync will COPY the already-patched version
 * into android/app/src/main/AndroidManifest.xml.
 *
 * Also patches the live android source manifest as a fallback.
 */

const fs = require('fs');
const path = require('path');

const AD_ID_LINE = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />';

const targets = [
    // Capacitor Android template — this is what cap sync COPIES from
    path.join(__dirname, '..', 'node_modules', '@capacitor', 'android',
              'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    // Live android project source (in case cap sync already ran)
    path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
];

function injectAdId(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`[AD_ID-patch] not found (skip): ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        console.log(`[AD_ID-patch] OK (already present): ${filePath}`);
        return;
    }

    let patched = false;

    // Strategy 1: Insert after INTERNET permission (flexible regex)
    const internetPermRegex = /(<uses-permission[^>]*android\.permission\.INTERNET[^>]*\/>)/;
    if (internetPermRegex.test(content)) {
        content = content.replace(internetPermRegex, `$1\n${AD_ID_LINE}`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 1 (after INTERNET): ${filePath}`);
    }

    // Strategy 2: Insert before <application tag
    if (!patched) {
        const appTagRegex = /(\s*<application\b)/;
        if (appTagRegex.test(content)) {
            content = content.replace(appTagRegex, `\n${AD_ID_LINE}$1`);
            patched = true;
            console.log(`[AD_ID-patch] Strategy 2 (before <application>): ${filePath}`);
        }
    }

    // Strategy 3: Insert before </manifest>
    if (!patched && content.includes('</manifest>')) {
        content = content.replace('</manifest>', `${AD_ID_LINE}\n</manifest>`);
        patched = true;
        console.log(`[AD_ID-patch] Strategy 3 (before </manifest>): ${filePath}`);
    }

    if (!patched) {
        console.error(`[AD_ID-patch] ERROR: No insertion point found in: ${filePath}`);
        return;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[AD_ID-patch] INJECTED successfully: ${filePath}`);
}

targets.forEach(injectAdId);
