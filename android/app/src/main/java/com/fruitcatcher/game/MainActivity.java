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

import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

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
    // Keep the game launch independent from the optional ad SDK. Enable only
    // after the release APK has been verified on the target Android devices.
    private static final boolean ENABLE_NATIVE_ADS = false;
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
    // Ads are optional. A broken/missing SDK must never prevent the game UI
    // from starting, especially on devices without Google Play services.
    private volatile boolean mAdsDisabled   = false;
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
        // Keep the Capacitor launch path minimal. Optional native services and
        // custom window handling must never be able to crash app startup.
        super.onCreate(savedInstanceState);
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
        mHandler.removeCallbacksAndMessages(null);
        if (mBannerView != null) {
            mBannerView.destroy();
            mBannerView = null;
        }
        super.onDestroy();
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
                } else {
                    Log.w(TAG, "Review flow request failed");
                }
            });
        } catch (Throwable t) {
            Log.e(TAG, "warmUpReview failed; review disabled", t);
            mReviewManager = null;
            mReviewInfo = null;
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
            if (getBridge() == null) return;
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
        if (mAdsDisabled || mAdsReady || mInitializing) return;
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
        } catch (Throwable t) {
            mInitializing = false;
            mAdsDisabled = true;
            Log.e(TAG, "Unity Ads unavailable; continuing without ads", t);
        }
    }

    private void notifyJsReady(int attempt) {
        try {
            if (getBridge() == null) return;
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) wv.evaluateJavascript(
                "if(typeof window.onNativeAdsReady==='function')window.onNativeAdsReady();", null);
        } catch (Exception e) {
            Log.e(TAG, "notifyJsReady: " + e.getMessage());
        }
        if (attempt < 2) mHandler.postDelayed(() -> notifyJsReady(attempt + 1), 1000);
    }

    private void loadVideoAd(int retryCount) {
        if (mAdsDisabled) return;
        try {
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override public void onUnityAdsAdLoaded(String id) {
                    mVideoLoaded = true;
                }
                @Override public void onUnityAdsFailedToLoad(String id,
                                                             UnityAds.UnityAdsLoadError error,
                                                             String msg) {
                    mVideoLoaded = false;
                    int next = Math.min(retryCount + 1, 6);
                    mHandler.postDelayed(() -> loadVideoAd(next), 5_000L * next);
                }
            });
        } catch (Throwable t) {
            Log.e(TAG, "loadVideoAd failed", t);
        }
    }

    private void setupBanner() {
        if (mAdsDisabled) return;
        try {
            // Detach listener BEFORE destroy — prevents stale callbacks on old view
            if (mBannerView != null) {
                mBannerView.setListener(null);
                if (mBannerView.getParent() != null)
                    ((android.view.ViewGroup) mBannerView.getParent()).removeView(mBannerView);
                mBannerView.destroy();
                mBannerView = null;
            }
            mBannerLoaded = false;

            // Per Unity Ads docs: create → setListener → load()
            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView b) {
                    mBannerLoaded = true;
                    mHandler.post(() -> {
                        if (mBannerView == null) return;
                        if (mBannerView.getParent() == null) {
                            FrameLayout root = (FrameLayout) getWindow().getDecorView()
                                    .findViewById(android.R.id.content);
                            if (root != null) {
                                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                                    FrameLayout.LayoutParams.MATCH_PARENT,
                                    FrameLayout.LayoutParams.WRAP_CONTENT,
                                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                                mBannerView.setElevation(20f);
                                root.addView(mBannerView, lp);
                            }
                        }
                        if (mBannerVisible) {
                            mBannerView.setVisibility(View.VISIBLE);
                            mBannerView.bringToFront();
                            applyWebViewMargin(true);
                        } else {
                            mBannerView.setVisibility(View.GONE);
                        }
                    });
                }
                @Override public void onBannerShown(BannerView b) {
                    mHandler.post(() -> {
                        if (mBannerView != null && mBannerVisible) mBannerView.bringToFront();
                    });
                }
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    mBannerLoaded = false;
                    Log.e(TAG, "Banner failed: " + (e != null ? e.errorMessage : "unknown"));
                    if (!isFinishing() && !isDestroyed()) {
                        mHandler.postDelayed(() -> {
                            if (!isFinishing() && !isDestroyed()) setupBanner();
                        }, 15_000);
                    }
                }
            });

            mBannerView.load();
        } catch (Throwable t) {
            mBannerLoaded = false;
            Log.e(TAG, "setupBanner failed; banner disabled", t);
        }
    }

    /**
     * Edge-to-edge inset handling (Android 15 / SDK 35+).
     * Pads the activity content so the game, the Unity banner and the system
     * bars / display cutout never overlap, on every Android version.
     */
    private void applySystemBarInsets() {
        try {
            final View content = getWindow().getDecorView().findViewById(android.R.id.content);
            if (content == null) return;
            ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                                | WindowInsetsCompat.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(content);
        } catch (Exception e) {
            Log.e(TAG, "applySystemBarInsets: " + e.getMessage());
        }
    }

    /**
     * Shrinks the WebView by setting a bottom margin so the banner is fully visible.
     */
    private void applyWebViewMargin(boolean add) {
        try {
            if (getBridge() == null) return;
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv == null) return;
            int px = add ? (int)(50 * getResources().getDisplayMetrics().density) : 0;
            android.view.ViewGroup.MarginLayoutParams lp =
                    (android.view.ViewGroup.MarginLayoutParams) wv.getLayoutParams();
            if (lp != null) {
                lp.bottomMargin = px;
                wv.setLayoutParams(lp);
            }
        } catch (Exception e) {
            Log.e(TAG, "applyWebViewMargin: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // JavaScript Bridge
    // ══════════════════════════════════════════════════════════════════════

    public class JsBridge {

        @JavascriptInterface
        public boolean isInitialized() {
            if (mAdsDisabled) return false;
            try {
                if (!mAdsReady && UnityAds.isInitialized()) {
                    mInitializing = false;
                    mAdsReady     = true;
                    mHandler.post(() -> { loadVideoAd(0); setupBanner(); notifyJsReady(0); });
                }
            } catch (Throwable t) {
                mAdsDisabled = true;
                mInitializing = false;
                Log.e(TAG, "Unity Ads unavailable from JS bridge", t);
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
                } catch (Throwable t) {
                    Log.e(TAG, "showVideo failed", t);
                }
            });
        }

        @JavascriptInterface
        public void showBanner() {
            mBannerVisible = true;
            mHandler.post(() -> {
                if (mBannerView == null) {
                    // No banner yet — create one
                    setupBanner();
                    return;
                }
                if (!mBannerLoaded) {
                    // Still loading — wait for onBannerLoaded which will auto-show it
                    return;
                }
                mBannerView.setVisibility(View.VISIBLE);
                mBannerView.bringToFront();
                mBannerView.setElevation(20f);
                applyWebViewMargin(true);
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mBannerVisible = false;
            mHandler.post(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.GONE);
                applyWebViewMargin(false);
            });
        }

        @JavascriptInterface
        public void onGameCompleted() {
            mGameCount++;
            if (mGameCount == 3 || mGameCount == 15) {
                mHandler.post(MainActivity.this::launchReviewFlow);
            }
        }
    }
}
