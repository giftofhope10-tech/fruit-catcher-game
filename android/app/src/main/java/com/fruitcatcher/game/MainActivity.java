package com.fruitcatcher.game;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Android entry activity on the standard Capacitor launch path.
 * Unity Ads is not initialized during app startup because a native SDK failure
 * must never terminate the game before the WebView is usable.
 */
public class MainActivity extends BridgeActivity {
}
