package com.fruitcatcher.game;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.lang.reflect.Constructor;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "FruitCatcher";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView == null) {
            Log.w(TAG, "WebView unavailable; ads bridge not installed");
            return;
        }

        installAdsbridgeSafely(webView);
    }

    private void installAdsbridgeSafely(WebView webView) {
        try {
            Class<?> bridgeClass = Class.forName(
                    "com.fruitcatcher.game.NativeAdsBridge",
                    true,
                    getClassLoader());
            Constructor<?> constructor = bridgeClass.getDeclaredConstructor(Activity.class);
            Object adsBridge = constructor.newInstance(this);
            webView.addJavascriptInterface(adsBridge, "NativeUnityAds");
            Log.i(TAG, "Unity Ads bridge installed");
        } catch (Throwable t) {
            // Ads are optional: a broken or unsupported SDK must never crash the game.
            Log.e(TAG, "Unity Ads bridge could not be loaded; continuing without ads", t);
        }
    }
}
