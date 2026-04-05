package com.fruitcatcher.game;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import android.widget.TextView;

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

    private static final String TAG              = "FruitCatcher";
    private static final String GAME_ID          = "6082243";
    private static final boolean TEST_MODE       = true;          // DEBUG: test mode ON
    private static final String PLACEMENT_VIDEO  = "Interstitial_Android";
    private static final String PLACEMENT_BANNER = "Banner_Android";

    private BannerView       mBannerView;
    private volatile boolean mAdsReady      = false;
    private volatile boolean mInitializing  = false;
    private volatile boolean mVideoLoaded   = false;
    private volatile boolean mBannerLoaded  = false;
    private volatile boolean mBannerVisible = false;
    private String           mBannerError   = "none";
    private final Handler    mHandler       = new Handler(Looper.getMainLooper());

    // ── Debug overlay ────────────────────────────────────────────────
    private TextView mDebugView;

    private void createDebugOverlay() {
        mDebugView = new TextView(this);
        mDebugView.setTextColor(Color.WHITE);
        mDebugView.setTextSize(10f);
        mDebugView.setBackgroundColor(Color.argb(180, 0, 0, 0));
        mDebugView.setPadding(8, 8, 8, 8);
        mDebugView.setElevation(100f);
        mDebugView.setText("Unity Ads: starting...");

        FrameLayout root = (FrameLayout) getWindow().getDecorView()
                .findViewById(android.R.id.content);
        if (root != null) {
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP | Gravity.START);
            lp.topMargin = 80;
            lp.leftMargin = 8;
            root.addView(mDebugView, lp);
        }
    }

    private void updateDebugView() {
        mHandler.post(() -> {
            if (mDebugView == null) return;
            String txt =
                "=== UNITY ADS DEBUG ===\n" +
                "TEST_MODE : " + TEST_MODE + "\n" +
                "GAME_ID   : " + GAME_ID + "\n" +
                "placement : " + PLACEMENT_BANNER + "\n" +
                "initialized: " + UnityAds.isInitialized() + "\n" +
                "mAdsReady : " + mAdsReady + "\n" +
                "mBannerLoaded : " + mBannerLoaded + "\n" +
                "mBannerVisible: " + mBannerVisible + "\n" +
                "mBannerView   : " + (mBannerView != null ? "exists" : "null") + "\n" +
                "bannerError   : " + mBannerError + "\n" +
                "mVideoLoaded  : " + mVideoLoaded;
            mDebugView.setText(txt);
        });
    }
    // ─────────────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerBridge();
        mHandler.post(this::createDebugOverlay);
        initUnityAds();
        // Refresh debug overlay every 2 s so the user can see live state
        mHandler.postDelayed(new Runnable() {
            @Override public void run() {
                updateDebugView();
                mHandler.postDelayed(this, 2000);
            }
        }, 2000);
    }

    @Override
    public void onDestroy() {
        if (mBannerView != null) {
            mBannerView.destroy();
            mBannerView = null;
        }
        super.onDestroy();
    }

    private void registerBridge() {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) wv.addJavascriptInterface(new JsBridge(), "NativeUnityAds");
        } catch (Exception e) {
            Log.e(TAG, "registerBridge: " + e.getMessage());
        }
    }

    private void initUnityAds() {
        if (mAdsReady || mInitializing) return;
        try {
            if (UnityAds.isInitialized()) {
                mAdsReady = true;
                loadVideoAd(0);
                mHandler.post(() -> { setupBanner(); notifyJsReady(0); updateDebugView(); });
                return;
            }
            mInitializing = true;
            updateDebugView();

            // Watchdog: reset flag if neither callback fires within 30 s
            mHandler.postDelayed(() -> {
                if (!mAdsReady && mInitializing) {
                    mInitializing = false;
                    Log.w(TAG, "initUnityAds watchdog: retrying");
                    initUnityAds();
                }
            }, 30_000);

            UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
                @Override
                public void onInitializationComplete() {
                    mInitializing = false;
                    mAdsReady     = true;
                    Log.d(TAG, "Unity Ads initialized OK");
                    loadVideoAd(0);
                    mHandler.post(() -> { setupBanner(); notifyJsReady(0); updateDebugView(); });
                }

                @Override
                public void onInitializationFailed(UnityAds.UnityAdsInitializationError error,
                                                   String message) {
                    mInitializing = false;
                    mBannerError  = "init failed: " + error + " | " + message;
                    Log.e(TAG, "Unity Ads init failed [" + error + "]: " + message);
                    updateDebugView();
                    mHandler.postDelayed(MainActivity.this::initUnityAds, 15_000);
                }
            });
        } catch (Exception e) {
            mInitializing = false;
            mBannerError  = "initUnityAds ex: " + e.getMessage();
            Log.e(TAG, "initUnityAds: " + e.getMessage());
            updateDebugView();
            mHandler.postDelayed(this::initUnityAds, 15_000);
        }
    }

    private void notifyJsReady(int attempt) {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) wv.evaluateJavascript(
                "if(typeof window.onNativeAdsReady==='function')window.onNativeAdsReady();", null);
        } catch (Exception e) {
            Log.e(TAG, "notifyJsReady: " + e.getMessage());
        }
        if (attempt < 4) mHandler.postDelayed(() -> notifyJsReady(attempt + 1), 1000);
    }

    private void loadVideoAd(int retryCount) {
        try {
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override public void onUnityAdsAdLoaded(String id) {
                    mVideoLoaded = true;
                    updateDebugView();
                }
                @Override public void onUnityAdsFailedToLoad(String id,
                                                             UnityAds.UnityAdsLoadError error,
                                                             String msg) {
                    mVideoLoaded = false;
                    Log.w(TAG, "Video load failed: " + error + " | " + msg);
                    long delay = Math.min(30_000L, 5_000L * (retryCount + 1));
                    mHandler.postDelayed(() -> loadVideoAd(retryCount + 1), delay);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "loadVideoAd: " + e.getMessage());
        }
    }

    private void setupBanner() {
        try {
            // Tear down any existing banner first
            if (mBannerView != null) {
                if (mBannerView.getParent() != null)
                    ((android.view.ViewGroup) mBannerView.getParent()).removeView(mBannerView);
                mBannerView.destroy();
                mBannerView = null;
            }
            mBannerLoaded = false;
            mBannerError  = "loading...";
            updateDebugView();

            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView b) {
                    mBannerLoaded = true;
                    mBannerError  = "loaded OK";
                    Log.d(TAG, "Banner loaded; mBannerVisible=" + mBannerVisible);
                    mHandler.post(() -> {
                        if (mBannerView == null) return;
                        // Always make visible once loaded — the JS showBanner
                        // sets mBannerVisible; if it already fired, show now.
                        if (mBannerVisible) {
                            mBannerView.setVisibility(View.VISIBLE);
                            mBannerView.bringToFront();
                            applyWebViewPadding(true);
                        }
                        updateDebugView();
                    });
                }
                @Override public void onBannerShown(BannerView b) {
                    Log.d(TAG, "onBannerShown");
                    updateDebugView();
                }
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    mBannerLoaded = false;
                    mBannerError  = "FAILED: " + (e != null ? e.errorMessage : "unknown") +
                                    " code=" + (e != null ? e.errorCode : "?");
                    Log.e(TAG, "Banner failed: " + mBannerError);
                    updateDebugView();
                    mHandler.postDelayed(() -> setupBanner(), 15_000);
                }
            });
            mBannerView.setVisibility(View.GONE);
            mBannerView.setElevation(20f);

            // Use the activity's root decor view — guaranteed to sit above the WebView
            FrameLayout root = (FrameLayout) getWindow().getDecorView()
                    .findViewById(android.R.id.content);
            if (root != null) {
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                root.addView(mBannerView, lp);
                mBannerView.bringToFront();
                // Make sure debug overlay stays on top
                if (mDebugView != null) mDebugView.bringToFront();
            }

            mBannerView.load();
            Log.d(TAG, "Banner load() requested — placement=" + PLACEMENT_BANNER +
                        " testMode=" + TEST_MODE);
            updateDebugView();
        } catch (Exception e) {
            mBannerError = "setupBanner ex: " + e.getMessage();
            Log.e(TAG, "setupBanner: " + e.getMessage());
            updateDebugView();
        }
    }

    private void applyWebViewPadding(boolean add) {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) {
                int px = add ? (int)(50 * getResources().getDisplayMetrics().density) : 0;
                wv.setPadding(0, 0, 0, px);
            }
        } catch (Exception e) {
            Log.e(TAG, "applyWebViewPadding: " + e.getMessage());
        }
    }

    // ── JS Bridge ────────────────────────────────────────────────────
    public class JsBridge {

        @JavascriptInterface
        public boolean isInitialized() {
            if (!mAdsReady && UnityAds.isInitialized()) {
                mInitializing = false;
                mAdsReady     = true;
                mHandler.post(() -> { loadVideoAd(0); setupBanner(); notifyJsReady(0); updateDebugView(); });
            }
            return mAdsReady;
        }

        @JavascriptInterface
        public boolean isVideoReady() { return mAdsReady && mVideoLoaded; }

        @JavascriptInterface
        public String getDebugInfo() {
            return "initialized=" + UnityAds.isInitialized() +
                   "|adsReady=" + mAdsReady +
                   "|bannerLoaded=" + mBannerLoaded +
                   "|bannerVisible=" + mBannerVisible +
                   "|bannerView=" + (mBannerView != null ? "exists" : "null") +
                   "|bannerError=" + mBannerError +
                   "|videoLoaded=" + mVideoLoaded +
                   "|testMode=" + TEST_MODE;
        }

        @JavascriptInterface
        public void showVideo() {
            if (!mAdsReady || !mVideoLoaded) return;
            mHandler.post(() -> {
                try {
                    UnityAds.show(MainActivity.this, PLACEMENT_VIDEO,
                        new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                            @Override public void onUnityAdsShowStart(String p) {}
                            @Override public void onUnityAdsShowClick(String p) {}
                            @Override public void onUnityAdsShowFailure(String p,
                                                                        UnityAds.UnityAdsShowError e,
                                                                        String m) {
                                mVideoLoaded = false;
                                loadVideoAd(0);
                            }
                            @Override public void onUnityAdsShowComplete(String p,
                                                                         UnityAds.UnityAdsShowCompletionState s) {
                                mVideoLoaded = false;
                                loadVideoAd(0);
                            }
                        });
                } catch (Exception e) {
                    Log.e(TAG, "showVideo: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showBanner() {
            mBannerVisible = true;
            Log.d(TAG, "JS showBanner() called; bannerLoaded=" + mBannerLoaded);
            mHandler.post(() -> {
                if (mBannerView == null) {
                    Log.d(TAG, "showBanner: no view, calling setupBanner");
                    setupBanner();
                    return;
                }
                if (!mBannerLoaded) {
                    Log.d(TAG, "showBanner: view exists but not loaded yet — waiting for onBannerLoaded");
                    return;
                }
                mBannerView.setVisibility(View.VISIBLE);
                mBannerView.bringToFront();
                mBannerView.setElevation(20f);
                applyWebViewPadding(true);
                updateDebugView();
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mBannerVisible = false;
            mHandler.post(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.GONE);
                applyWebViewPadding(false);
                updateDebugView();
            });
        }
    }
}
