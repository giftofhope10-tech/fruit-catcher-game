package com.fruitcatcher.game;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;

import com.getcapacitor.BridgeActivity;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsLoadOptions;
import com.unity3d.ads.UnityAdsShowOptions;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "FruitCatcher";
    private static final String GAME_ID = "6082243";
    private static final boolean TEST_MODE = false;
    private static final String PLACEMENT_VIDEO = "Interstitial_Android";
    private static final String PLACEMENT_BANNER = "Banner_Android";

    private BannerView mBannerView;
    private volatile boolean mAdsReady = false;
    private volatile boolean mVideoLoaded = false;
    private final Handler mHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // MUST be registered here, before the page JS executes.
        // addJavascriptInterface called after page load is invisible to already-loaded JS.
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.addJavascriptInterface(new JsBridge(), "NativeUnityAds");
                Log.d(TAG, "NativeUnityAds JS bridge registered successfully");
            } else {
                Log.e(TAG, "CRITICAL: WebView is null — JS bridge NOT registered");
            }
        } catch (Exception e) {
            Log.e(TAG, "CRITICAL: Failed to register JS bridge: " + e.getMessage(), e);
        }

        initUnityAds();
    }

    private void initUnityAds() {
        try {
            if (UnityAds.isInitialized()) {
                mAdsReady = true;
                Log.d(TAG, "Unity Ads already initialized");
                loadVideoAd(0);
                mHandler.post(this::setupBanner);
                return;
            }

            UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
                @Override
                public void onInitializationComplete() {
                    mAdsReady = true;
                    Log.d(TAG, "Unity Ads initialized successfully");
                    loadVideoAd(0);
                    mHandler.post(() -> {
                        setupBanner();
                        // Notify JS — handles the case where SDK finishes after page is loaded
                        try {
                            getBridge().getWebView().evaluateJavascript(
                                "if(typeof window.onNativeAdsReady==='function') window.onNativeAdsReady();",
                                null);
                            Log.d(TAG, "Notified JS: onNativeAdsReady");
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to notify JS: " + e.getMessage());
                        }
                    });
                }

                @Override
                public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                    Log.e(TAG, "Unity Ads init FAILED [" + error + "]: " + message);
                    mHandler.post(() -> {
                        try {
                            String safeMsg = message == null ? "null" : message.replace("'", "\\'");
                            String safeErr = error == null ? "null" : error.name();
                            getBridge().getWebView().evaluateJavascript(
                                "if(window.unityAds&&window.unityAds._diag)" +
                                "window.unityAds._diag('INIT FAILED [" + safeErr + "]:\\n" + safeMsg + "','#ff5252');",
                                null);
                        } catch (Exception ex) {
                            Log.e(TAG, "Failed to send error to JS: " + ex.getMessage());
                        }
                    });
                    mHandler.postDelayed(() -> initUnityAds(), 10000);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Unity Ads initialize threw: " + e.getMessage());
        }
    }

    private void loadVideoAd(int retryCount) {
        try {
            Log.d(TAG, "Loading video ad (attempt " + (retryCount + 1) + ")");
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override
                public void onUnityAdsAdLoaded(String placementId) {
                    mVideoLoaded = true;
                    Log.d(TAG, "Video ad loaded: " + placementId);
                }

                @Override
                public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                    mVideoLoaded = false;
                    int next = retryCount + 1;
                    long delayMs = Math.min(30000L, 5000L * next);
                    Log.w(TAG, "Video ad failed [" + error + "]: " + message + ". Retry in " + delayMs + "ms");
                    mHandler.postDelayed(() -> loadVideoAd(next), delayMs);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "loadVideoAd threw: " + e.getMessage());
        }
    }

    private void setupBanner() {
        try {
            if (mBannerView != null) {
                // Remove from parent layout before destroying to prevent view leaks
                if (mBannerView.getParent() != null) {
                    ((android.view.ViewGroup) mBannerView.getParent()).removeView(mBannerView);
                }
                mBannerView.destroy();
                mBannerView = null;
            }

            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override
                public void onBannerLoaded(BannerView b) {
                    Log.d(TAG, "Banner loaded successfully");
                    mHandler.post(() -> {
                        if (mBannerView != null) mBannerView.setVisibility(View.VISIBLE);
                    });
                }
                @Override public void onBannerShown(BannerView b) {}
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override
                public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    Log.e(TAG, "Banner FAILED: " + (e != null ? e.errorMessage : "unknown"));
                    mHandler.postDelayed(() -> setupBanner(), 15000);
                }
            });

            mBannerView.setVisibility(View.GONE);
            mBannerView.load();

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
            );

            FrameLayout rootLayout = findViewById(android.R.id.content);
            if (rootLayout != null) {
                rootLayout.addView(mBannerView, params);
                Log.d(TAG, "Banner added to layout");
            } else {
                Log.e(TAG, "Root layout not found for banner");
            }
        } catch (Exception e) {
            Log.e(TAG, "setupBanner threw: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        if (mBannerView != null) {
            mBannerView.destroy();
            mBannerView = null;
        }
        super.onDestroy();
    }

    public class JsBridge {

        @JavascriptInterface
        public boolean isInitialized() {
            return mAdsReady;
        }

        @JavascriptInterface
        public boolean isVideoReady() {
            return mAdsReady && mVideoLoaded;
        }

        @JavascriptInterface
        public void showVideo() {
            if (!mAdsReady || !mVideoLoaded) {
                Log.w(TAG, "showVideo: not ready (mAdsReady=" + mAdsReady + ", mVideoLoaded=" + mVideoLoaded + ")");
                return;
            }
            mHandler.post(() -> {
                try {
                    Log.d(TAG, "Showing interstitial ad");
                    UnityAds.show(MainActivity.this, PLACEMENT_VIDEO,
                        new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                            @Override
                            public void onUnityAdsShowFailure(String p, UnityAds.UnityAdsShowError e, String m) {
                                Log.e(TAG, "Show FAILED [" + e + "]: " + m);
                                mVideoLoaded = false;
                                loadVideoAd(0);
                            }
                            @Override public void onUnityAdsShowStart(String p) { Log.d(TAG, "Ad show started"); }
                            @Override public void onUnityAdsShowClick(String p) {}
                            @Override
                            public void onUnityAdsShowComplete(String p, UnityAds.UnityAdsShowCompletionState s) {
                                Log.d(TAG, "Ad show complete: " + s);
                                mVideoLoaded = false;
                                loadVideoAd(0);
                            }
                        });
                } catch (Exception e) {
                    Log.e(TAG, "showVideo threw: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showBanner() {
            mHandler.post(() -> {
                try {
                    if (mBannerView != null) {
                        mBannerView.setVisibility(View.VISIBLE);
                        Log.d(TAG, "Banner set visible via JS");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "showBanner threw: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mHandler.post(() -> {
                try {
                    if (mBannerView != null) {
                        mBannerView.setVisibility(View.GONE);
                        Log.d(TAG, "Banner hidden via JS");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "hideBanner threw: " + e.getMessage());
                }
            });
        }
    }
}
