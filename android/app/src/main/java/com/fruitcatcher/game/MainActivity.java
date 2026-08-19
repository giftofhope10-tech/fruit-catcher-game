package com.fruitcatcher.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            NativeAdsBridge adsBridge = new NativeAdsBridge(this);
            webView.addJavascriptInterface(adsBridge, "NativeUnityAds");
        }
    }
}