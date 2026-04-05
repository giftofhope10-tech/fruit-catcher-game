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
    private static final boolean TEST_MODE = true;
    private static final String PLACEMENT_VIDEO = "Interstitial_Android";
    private static final String PLACEMENT_BANNER = "Banner_Android";

    private BannerView   mBannerView;
    private volatile boolean mAdsReady    = false;
    private volatile boolean mVideoLoaded = false;
    private volatile String  mStatusMsg   = "Not started";
    private final Handler mHandler = new Handler(Looper.getMainLooper());

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerNativeBridge();
        initUnityAds();
    }

    @Override
    public void onDestroy() {
        if (mBannerView != null) {
            mBannerView.destroy();
            mBannerView = null;
        }
        super.onDestroy();
    }

    // ── Bridge registration ───────────────────────────────────────────────────

    private void registerNativeBridge() {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.addJavascriptInterface(new JsBridge(), "NativeUnityAds");
                Log.d(TAG, "NativeUnityAds bridge registered");
            } else {
                Log.e(TAG, "WebView is null — bridge NOT registered");
            }
        } catch (Exception e) {
            Log.e(TAG, "registerNativeBridge failed: " + e.getMessage(), e);
        }
    }

    // ── Unity Ads initialisation ──────────────────────────────────────────────

    private void initUnityAds() {
        try {
            if (UnityAds.isInitialized()) {
                mAdsReady   = true;
                mStatusMsg  = "Already initialized";
                Log.d(TAG, "Unity Ads already initialized");
                loadVideoAd(0);
                mHandler.post(this::setupBanner);
                mHandler.post(this::notifyJsReady);
                return;
            }

            mStatusMsg = "Initializing…";
            Log.d(TAG, "Starting Unity Ads initialize — gameId=" + GAME_ID + " testMode=" + TEST_MODE);

            UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {

                @Override
                public void onInitializationComplete() {
                    mAdsReady  = true;
                    mStatusMsg = "Init complete";
                    Log.d(TAG, "Unity Ads initialized successfully");
                    loadVideoAd(0);
                    mHandler.post(() -> {
                        setupBanner();
                        notifyJsReady();
                    });
                }

                @Override
                public void onInitializationFailed(UnityAds.UnityAdsInitializationError error,
                                                   String message) {
                    String errStr = (error != null ? error.name() : "null");
                    String msgStr = (message != null ? message : "null");
                    mStatusMsg = "FAILED [" + errStr + "]: " + msgStr;
                    Log.e(TAG, "Unity Ads init FAILED [" + errStr + "]: " + msgStr);

                    // Push the exact error to the JS diagnostic overlay
                    mHandler.post(() -> evalJs(
                        "if(window.unityAds&&window.unityAds._diag)" +
                        "window.unityAds._diag('INIT FAILED\\n[" + errStr + "]\\n" +
                        msgStr.replace("'", "\\'").replace("\"","\\\"").replace("\n"," ") +
                        "','#ff5252');"
                    ));

                    // Retry after 15 s
                    mHandler.postDelayed(MainActivity.this::initUnityAds, 15000);
                }
            });

        } catch (Exception e) {
            mStatusMsg = "Exception: " + e.getMessage();
            Log.e(TAG, "initUnityAds threw: " + e.getMessage(), e);
            mHandler.postDelayed(this::initUnityAds, 15000);
        }
    }

    // ── Notify JS that SDK is ready ───────────────────────────────────────────

    private void notifyJsReady() {
        // Try up to 5 times, 1 s apart, to handle page-not-loaded-yet race
        notifyJsReady(0);
    }

    private void notifyJsReady(int attempt) {
        evalJs("(function(){" +
               "  if(typeof window.onNativeAdsReady==='function'){" +
               "    window.onNativeAdsReady();" +
               "  }" +
               "})();");
        Log.d(TAG, "notifyJsReady attempt " + attempt);
        if (attempt < 4) {
            mHandler.postDelayed(() -> notifyJsReady(attempt + 1), 1000);
        }
    }

    // ── evalJs helper ─────────────────────────────────────────────────────────

    private void evalJs(String js) {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "evalJs failed: " + e.getMessage());
        }
    }

    // ── Video ad loading ─────────────────────────────────────────────────────

    private void loadVideoAd(int retryCount) {
        try {
            Log.d(TAG, "Loading video ad, attempt " + (retryCount + 1));
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override
                public void onUnityAdsAdLoaded(String placementId) {
                    mVideoLoaded = true;
                    Log.d(TAG, "Video ad loaded: " + placementId);
                }

                @Override
                public void onUnityAdsFailedToLoad(String placementId,
                                                   UnityAds.UnityAdsLoadError error,
                                                   String message) {
                    mVideoLoaded = false;
                    int next = retryCount + 1;
                    long delay = Math.min(30_000L, 5_000L * next);
                    Log.w(TAG, "Video ad failed [" + error + "]: " + message +
                               " — retry in " + delay + "ms");
                    mHandler.postDelayed(() -> loadVideoAd(next), delay);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "loadVideoAd threw: " + e.getMessage());
        }
    }

    // ── Banner ad setup ──────────────────────────────────────────────────────

    private void setupBanner() {
        try {
            if (mBannerView != null) {
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
                    Log.d(TAG, "Banner loaded");
                    mHandler.post(() -> {
                        if (mBannerView != null) mBannerView.setVisibility(View.VISIBLE);
                    });
                }
                @Override public void onBannerShown(BannerView b) {}
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override
                public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    Log.e(TAG, "Banner failed: " + (e != null ? e.errorMessage : "unknown"));
                    mHandler.postDelayed(() -> setupBanner(), 15_000);
                }
            });

            mBannerView.setVisibility(View.GONE);
            mBannerView.load();

            FrameLayout rootLayout = findViewById(android.R.id.content);
            if (rootLayout != null) {
                rootLayout.addView(mBannerView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
                ));
                Log.d(TAG, "Banner added to layout");
            } else {
                Log.e(TAG, "Root layout null — banner not added");
            }
        } catch (Exception e) {
            Log.e(TAG, "setupBanner threw: " + e.getMessage());
        }
    }

    // ── JavaScript bridge ─────────────────────────────────────────────────────

    public class JsBridge {

        /** True once the SDK has initialised (checked via both flag and SDK directly). */
        @JavascriptInterface
        public boolean isInitialized() {
            if (!mAdsReady && UnityAds.isInitialized()) {
                mAdsReady  = true;
                mStatusMsg = "Ready (detected via poll)";
                Log.d(TAG, "isInitialized: SDK ready (detected via direct poll)");
                mHandler.post(() -> {
                    loadVideoAd(0);
                    setupBanner();
                });
            }
            return mAdsReady;
        }

        /** Returns a human-readable status string for the diagnostic overlay. */
        @JavascriptInterface
        public String getStatus() {
            return mStatusMsg;
        }

        @JavascriptInterface
        public boolean isVideoReady() {
            return mAdsReady && mVideoLoaded;
        }

        @JavascriptInterface
        public void showVideo() {
            if (!mAdsReady || !mVideoLoaded) {
                Log.w(TAG, "showVideo: not ready");
                return;
            }
            mHandler.post(() -> {
                try {
                    UnityAds.show(MainActivity.this, PLACEMENT_VIDEO,
                        new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                            @Override
                            public void onUnityAdsShowFailure(String p,
                                                              UnityAds.UnityAdsShowError e,
                                                              String m) {
                                Log.e(TAG, "Show FAILED [" + e + "]: " + m);
                                mVideoLoaded = false;
                                loadVideoAd(0);
                            }
                            @Override public void onUnityAdsShowStart(String p) {
                                Log.d(TAG, "Ad show started");
                            }
                            @Override public void onUnityAdsShowClick(String p) {}
                            @Override
                            public void onUnityAdsShowComplete(String p,
                                                               UnityAds.UnityAdsShowCompletionState s) {
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
                        Log.d(TAG, "Banner visible via JS");
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
