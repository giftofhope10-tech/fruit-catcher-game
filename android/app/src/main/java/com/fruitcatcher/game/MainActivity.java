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

    private static final String TAG              = "FruitCatcher";
    private static final String GAME_ID          = "6082243";
    private static final boolean TEST_MODE       = false;
    private static final String PLACEMENT_VIDEO  = "Interstitial_Android";
    private static final String PLACEMENT_BANNER = "Banner_Android";

    private BannerView       mBannerView;
    private volatile boolean mAdsReady     = false;
    private volatile boolean mInitializing = false;
    private volatile boolean mVideoLoaded  = false;
    private final Handler    mHandler      = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerBridge();
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
                mHandler.post(() -> { setupBanner(); notifyJsReady(0); });
                return;
            }
            mInitializing = true;

            // Watchdog: reset flag if neither callback fires within 30 s
            mHandler.postDelayed(() -> {
                if (!mAdsReady && mInitializing) {
                    mInitializing = false;
                    initUnityAds();
                }
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
        if (attempt < 4) mHandler.postDelayed(() -> notifyJsReady(attempt + 1), 1000);
    }

    private void loadVideoAd(int retryCount) {
        try {
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override public void onUnityAdsAdLoaded(String id) { mVideoLoaded = true; }
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
            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView b) {
                    mHandler.post(() -> {
                        if (mBannerView == null) return;
                        mBannerView.setVisibility(View.VISIBLE);
                        mBannerView.bringToFront();
                        mBannerView.setElevation(10f);
                        Log.d(TAG, "Banner loaded and visible");
                    });
                }
                @Override public void onBannerShown(BannerView b) {}
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    Log.e(TAG, "Banner failed: " + (e != null ? e.errorMessage : "unknown"));
                    mHandler.postDelayed(() -> setupBanner(), 15_000);
                }
            });
            mBannerView.setVisibility(View.GONE);
            mBannerView.setElevation(10f);
            mBannerView.load();

            android.view.ViewGroup parent;
            try {
                android.webkit.WebView wv = getBridge().getWebView();
                parent = (android.view.ViewGroup) wv.getParent();
            } catch (Exception ex) {
                parent = findViewById(android.R.id.content);
            }
            if (parent != null) {
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                parent.addView(mBannerView, lp);
                mBannerView.bringToFront();
            }
        } catch (Exception e) {
            Log.e(TAG, "setupBanner: " + e.getMessage());
        }
    }

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
            mHandler.post(() -> {
                if (mBannerView != null) {
                    mBannerView.setVisibility(View.VISIBLE);
                    mBannerView.bringToFront();
                    mBannerView.setElevation(10f);
                }
                try {
                    android.webkit.WebView wv = getBridge().getWebView();
                    if (wv != null) {
                        int px = (int)(50 * getResources().getDisplayMetrics().density);
                        wv.setPadding(0, 0, 0, px);
                    }
                } catch (Exception e) { Log.e(TAG, "showBanner padding: " + e.getMessage()); }
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            mHandler.post(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.GONE);
                try {
                    android.webkit.WebView wv = getBridge().getWebView();
                    if (wv != null) wv.setPadding(0, 0, 0, 0);
                } catch (Exception e) { Log.e(TAG, "hideBanner padding: " + e.getMessage()); }
            });
        }
    }
}
