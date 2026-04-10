const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const AD_ID_PERMISSION = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />';

function ensureToolsNs(content) {
    if (content.includes('xmlns:tools')) return content;
    return content.replace(
        'xmlns:android="http://schemas.android.com/apk/res/android"',
        'xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"'
    );
}

function patchManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.log('[patch-manifest] AndroidManifest.xml not found, skipping.');
        return;
    }

    let content = fs.readFileSync(MANIFEST_PATH, 'utf8');

    // Ensure xmlns:tools is present
    content = ensureToolsNs(content);

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        // Normalize: ensure tools:node="replace" is on the declaration
        const cleanDecl = '<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />';
        if (!content.includes(cleanDecl)) {
            content = content.replace(
                /<uses-permission[^>]*com\.google\.android\.gms\.permission\.AD_ID[^>]*>/,
                cleanDecl
            );
            fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
            console.log('[patch-manifest] AD_ID normalized to include tools:node="replace".');
        } else {
            console.log('[patch-manifest] AD_ID permission already clean, nothing to do.');
        }
        return;
    }

    let patched = false;

    // Strategy 1: Insert after INTERNET permission
    const internetPermRegex = /(<uses-permission[^>]*android\.permission\.INTERNET[^>]*\/>)/;
    if (internetPermRegex.test(content)) {
        content = content.replace(internetPermRegex, `$1\n${AD_ID_PERMISSION}`);
        patched = true;
        console.log('[patch-manifest] Strategy 1: Inserted AD_ID after INTERNET permission.');
    }

    // Strategy 2: Insert before <application tag
    if (!patched) {
        const appTagRegex = /(\s*<application\b)/;
        if (appTagRegex.test(content)) {
            content = content.replace(appTagRegex, `\n${AD_ID_PERMISSION}$1`);
            patched = true;
            console.log('[patch-manifest] Strategy 2: Inserted AD_ID before <application> tag.');
        }
    }

    // Strategy 3: Insert before </manifest> as last resort
    if (!patched) {
        if (content.includes('</manifest>')) {
            content = content.replace('</manifest>', `${AD_ID_PERMISSION}\n</manifest>`);
            patched = true;
            console.log('[patch-manifest] Strategy 3: Inserted AD_ID before </manifest>.');
        }
    }

    if (!patched) {
        console.error('[patch-manifest] ERROR: Could not find an insertion point. Manifest unchanged.');
        process.exit(1);
    }

    fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
    console.log('[patch-manifest] AD_ID permission successfully written to AndroidManifest.xml');
}

patchManifest();
