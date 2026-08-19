package com.fruitcatcher.game;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Android entry activity on the standard Capacitor launch path.
 * Optional services must not be referenced from the activity class because a
 * release-only SDK/linkage problem can otherwise crash the app before the
 * WebView is displayed.
 */
public class MainActivity extends BridgeActivity {
}