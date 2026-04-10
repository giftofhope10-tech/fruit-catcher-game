const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const AD_ID_PERMISSION = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />';

function patchManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.log('[patch-manifest] AndroidManifest.xml not found, skipping.');
        return;
    }

    let content = fs.readFileSync(MANIFEST_PATH, 'utf8');

    if (content.includes('com.google.android.gms.permission.AD_ID')) {
        console.log('[patch-manifest] AD_ID permission already present, nothing to do.');
        return;
    }

    content = content.replace(
        '<uses-permission android:name="android.permission.INTERNET" />',
        '<uses-permission android:name="android.permission.INTERNET" />\n' + AD_ID_PERMISSION
    );

    fs.writeFileSync(MANIFEST_PATH, content, 'utf8');
    console.log('[patch-manifest] AD_ID permission successfully added to AndroidManifest.xml');
}

patchManifest();
