package com.fruitcatcher.game;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

/**
 * Keep the Android entry activity on the standard Capacitor launch path.
 * Optional services must not be referenced from the activity class because a
 * release-only SDK/linkage problem can otherwise crash the app before the
 * WebView is displayed.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "FruitCatcher";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int bridgeAttempts = 0;

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Let Capacitor/WebView render first. The optional ad bridge is loaded
        // separately so an SDK/linkage problem can never block app startup.
        handler.postDelayed(this::installAdsBridge, 1500L);
    }

    private void installAdsBridge() {
        try {
            if (getBridge() == null || getBridge().getWebView() == null) {
                retryAdsBridge();
                return;
            }

            Class<?> bridgeClass = Class.forName("com.fruitcatcher.game.NativeAdsBridge");
            Object bridge = bridgeClass
                    .getConstructor(android.app.Activity.class)
                    .newInstance(this);
            getBridge().getWebView().addJavascriptInterface(bridge, "NativeUnityAds");
        } catch (Throwable t) {
            Log.w(TAG, "Native ads unavailable; continuing without ads", t);
        }
    }

    private void retryAdsBridge() {
        if (++bridgeAttempts < 10) {
            handler.postDelayed(this::installAdsBridge, 500L);
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}