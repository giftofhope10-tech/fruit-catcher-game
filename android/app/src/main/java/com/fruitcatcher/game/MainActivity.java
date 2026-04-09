package com.fruitcatcher.game;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
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

    private static final String  TAG               = "FruitCatcher";
    private static final String  GAME_ID           = "6082243";
    private static final boolean TEST_MODE         = false;
    private static final String  PLACEMENT_VIDEO   = "Interstitial_Android";
    private static final String  PLACEMENT_BANNER  = "Banner_Android";
    private static final long    BACK_PRESS_WINDOW = 2000L;

    // ── Unity Ads ──────────────────────────────────────────────────────────
    private BannerView       mBannerView;
    private volatile boolean mAdsReady      = false;
    private volatile boolean mInitializing  = false;
    private volatile boolean mVideoLoaded   = false;
    private volatile boolean mBannerLoaded  = false;
    private volatile boolean mBannerVisible = false;
    private final Handler    mHandler       = new Handler(Looper.getMainLooper());

    // ── Google Play In-App Review ──────────────────────────────────────────
    private ReviewManager    mReviewManager;
    private ReviewInfo       mReviewInfo;
    private int              mGameCount     = 0;

    // ── Double-back-to-exit ────────────────────────────────────────────────
    private long             mLastBackPress = 0;

    // ══════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ══════════════════════════════════════════════════════════════════════

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerBridge();
        initUnityAds();
        warmUpReview();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (mBannerView != null) mBannerView.setVisibility(View.GONE);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mBannerView != null && mBannerLoaded && mBannerVisible) {
            mBannerView.setVisibility(View.VISIBLE);
            mBannerView.bringToFront();
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

    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - mLastBackPress < BACK_PRESS_WINDOW) {
            finish();
        } else {
            mLastBackPress = now;
            Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Google Play In-App Review
    // ══════════════════════════════════════════════════════════════════════

    private void warmUpReview() {
        try {
            mReviewManager = ReviewManagerFactory.create(this);
            mReviewManager.requestReviewFlow().addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    mReviewInfo = task.getResult();
                    Log.d(TAG, "Review info ready");
                } else {
                    Log.w(TAG, "Review flow request failed");
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "warmUpReview: " + e.getMessage());
        }
    }

    private void launchReviewFlow() {
        if (mReviewManager == null || mReviewInfo == null) {
            warmUpReview();
            return;
        }
        try {
            mReviewManager.launchReviewFlow(this, mReviewInfo)
                .addOnCompleteListener(task -> warmUpReview());
        } catch (Exception e) {
            Log.e(TAG, "launchReviewFlow: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // JS Bridge registration
    // ══════════════════════════════════════════════════════════════════════

    private void registerBridge() {
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) wv.addJavascriptInterface(new JsBridge(), "NativeUnityAds");
        } catch (Exception e) {
            Log.e(TAG, "registerBridge: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Unity Ads
    // ══════════════════════════════════════════════════════════════════════

    private void initUnityAds() {
        if (mAdsReady || mInitializing) return;
        try {
            if (UnityAds.isInitialized()) {
                mAdsReady = true;
                loadVideoAd(0);
                mHandler.post(() -> { setupBanner(); notifyJsReady(0); });
                return;
            }
            mInitializing = true;

            // Watchdog: if init hangs for 30 s, retry
            mHandler.postDelayed(() -> {
                if (!mAdsReady && mInitializing) { mInitializing = false; initUnityAds(); }
            }, 30_000);

            UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
                @Override
                public void onInitializationComplete() {
                    mInitializing = false;
                    mAdsReady     = true;
                    loadVideoAd(0);
                    mHandler.post(() -> { setupBanner(); notifyJsReady(0); });
                }

                @Override
                public void onInitializationFailed(UnityAds.UnityAdsInitializationError error,
                                                   String message) {
                    mInitializing = false;
                    Log.e(TAG, "Unity Ads init failed [" + error + "]: " + message);
                    mHandler.postDelayed(MainActivity.this::initUnityAds, 15_000);
                }
            });
        } catch (Exception e) {
            mInitializing = false;
            Log.e(TAG, "initUnityAds: " + e.getMessage());
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
        if (attempt < 2) mHandler.postDelayed(() -> notifyJsReady(attempt + 1), 1000);
    }

    private void loadVideoAd(int retryCount) {
        try {
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override public void onUnityAdsAdLoaded(String id) {
                    mVideoLoaded = true;
                }
                @Override public void onUnityAdsFailedToLoad(String id,
                                                             UnityAds.UnityAdsLoadError error,
                                                             String msg) {
                    mVideoLoaded = false;
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
            if (mBannerView != null) {
                if (mBannerView.getParent() != null)
                    ((android.view.ViewGroup) mBannerView.getParent()).removeView(mBannerView);
                mBannerView.destroy();
                mBannerView = null;
            }
            mBannerLoaded = false;

            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView b) {
                    mBannerLoaded = true;
                    mHandler.post(() -> {
                        if (mBannerView == null) return;
                        if (mBannerVisible) {
                            mBannerView.setVisibility(View.VISIBLE);
                            mBannerView.bringToFront();
                            applyWebViewPadding(true);
                        }
                    });
                }
                @Override public void onBannerShown(BannerView b) {}
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    mBannerLoaded = false;
                    Log.e(TAG, "Banner failed: " + (e != null ? e.errorMessage : "unknown"));
                    mHandler.postDelayed(() -> setupBanner(), 15_000);
                }
            });
            mBannerView.setVisibility(View.GONE);
            mBannerView.setElevation(20f);

            FrameLayout root = (FrameLayout) getWindow().getDecorView()
                    .findViewById(android.R.id.content);
            if (root != null) {
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                root.addView(mBannerView, lp);
                mBannerView.bringToFront();
            }

            mBannerView.load();
        } catch (Exception e) {
            Log.e(TAG, "setupBanner: " + e.getMessage());
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

    // ══════════════════════════════════════════════════════════════════════
    // JavaScript Bridge
    // ══════════════════════════════════════════════════════════════════════

    public class JsBridge {

        @JavascriptInterface
        public boolean isInitialized() {
            if (!mAdsReady && UnityAds.isInitialized()) {
                mInitializing = false;
                mAdsReady     = true;
                mHandler.post(() -> { loadVideoAd(0); setupBanner(); notifyJsReady(0); });
            }
            return mAdsReady;
        }

        @JavascriptInterface
        public boolean isVideoReady() { return mAdsReady && mVideoLoaded; }

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
            mHandler.post(() -> {
                if (mBannerView == null) { setupBanner(); return; }
                if (!mBannerLoaded) return;
                mBannerView.setVisibility(View.VISIBLE);
                mBannerView.bringToFront();
                mBannerView.setElevation(20f);
                applyWebViewPadding(true);
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mBannerVisible = false;
            mHandler.post(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.GONE);
                applyWebViewPadding(false);
            });
        }

        @JavascriptInterface
        public void onGameCompleted() {
            mGameCount++;
            // Prompt for review at meaningful milestones (5th and 20th game)
            if (mGameCount == 5 || mGameCount == 20) {
                mHandler.post(MainActivity.this::launchReviewFlow);
            }
        }
    }
}
