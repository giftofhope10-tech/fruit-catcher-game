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

targets.forEach(p => {
    if (!fs.existsSync(p)) {
        console.log(`[AD_ID-patch] not found (skip): ${p}`);
        return;
    }
    const content = fs.readFileSync(p, 'utf8');
    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        console.log(`[AD_ID-patch] OK       : ${p}`);
        return;
    }
    fs.writeFileSync(p, content.replace('</manifest>', `${AD_ID_LINE}\n</manifest>`), 'utf8');
    console.log(`[AD_ID-patch] INJECTED : ${p}`);
});
