package com.fruitcatcher.game;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Expose the Unity Ads bridge to the WebView as window.NativeUnityAds
        // so the game's JavaScript can call isInitialized(), showVideo(), etc.
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            NativeAdsBridge adsBridge = new NativeAdsBridge(this);
            webView.addJavascriptInterface(adsBridge, "NativeUnityAds");
        }
    }
}