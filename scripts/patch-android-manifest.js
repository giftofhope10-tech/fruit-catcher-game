const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const AD_ID_REPLACE = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID"\n        tools:node="replace" />';
const TOOLS_NS = 'xmlns:tools="http://schemas.android.com/tools"';

function patchManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.log('[patch-manifest] AndroidManifest.xml not found, skipping.');
        return;
    }

    let content = fs.readFileSync(MANIFEST_PATH, 'utf8');

    // Check if already correct (has tools:node="replace")
    if (content.includes('com.google.android.gms.permission.AD_ID') &&
        content.includes('tools:node="replace"') &&
        content.includes(TOOLS_NS)) {
        console.log('[patch-manifest] AD_ID already declared with tools:node="replace", nothing to do.');
        return;
    }

    // Ensure xmlns:tools namespace is declared on the <manifest> element
    if (!content.includes(TOOLS_NS)) {
        content = content.replace(
            /(<manifest\b[^>]*)(>)/,
            (match, start, end) => `${start}\n    ${TOOLS_NS}${end}`
        );
        console.log('[patch-manifest] Added xmlns:tools namespace to <manifest>.');
    }

    // Replace or insert the AD_ID permission with tools:node="replace"
    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        // Replace whatever form it currently has with the correct form.
        // Use 's' (dotAll) flag so [\s\S]*? matches across newlines for
        // multi-line <uses-permission .../> declarations.
        content = content.replace(
            /<uses-permission\b[\s\S]*?com\.google\.android\.gms\.permission\.AD_ID[\s\S]*?\/>/s,
            AD_ID_REPLACE
        );
        console.log('[patch-manifest] AD_ID updated to tools:node="replace" declaration.');
    } else {
        // Insert before </manifest>
        content = content.replace('</manifest>', `${AD_ID_REPLACE}\n</manifest>`);
        console.log('[patch-manifest] AD_ID inserted with tools:node="replace" before </manifest>.');
    }

    fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
    console.log('[patch-manifest] AndroidManifest.xml patched successfully.');
}

patchManifest();
