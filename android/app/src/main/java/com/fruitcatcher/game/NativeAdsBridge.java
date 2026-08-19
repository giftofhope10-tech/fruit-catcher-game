package com.fruitcatcher.game;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;

import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsLoadOptions;
import com.unity3d.ads.UnityAdsShowOptions;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

public final class NativeAdsBridge {
    private static final String TAG = "FruitCatcherAds";
    private static final String GAME_ID = "6082243";
    private static final boolean TEST_MODE = false;
    private static final String VIDEO_PLACEMENT = "Interstitial_Android";
    private static final String BANNER_PLACEMENT = "Banner_Android";

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private BannerView bannerView;
    private volatile boolean adsReady;
    private volatile boolean videoReady;
    private volatile boolean bannerReady;
    private volatile boolean bannerVisible;
    private volatile boolean disabled;
    private boolean initializationStarted;

    public NativeAdsBridge(Activity activity) {
        this.activity = activity;
    }

    private void initialize() {
        synchronized (this) {
            if (disabled || initializationStarted) return;
            initializationStarted = true;
        }

        mainHandler.post(() -> {
            if (disabled) return;
            try {
                if (UnityAds.isInitialized()) {
                    onAdsReady();
                    return;
                }

                UnityAds.initialize(activity, GAME_ID, TEST_MODE,
                        new IUnityAdsInitializationListener() {
                            @Override
                            public void onInitializationComplete() {
                                onAdsReady();
                            }

                            @Override
                            public void onInitializationFailed(
                                    UnityAds.UnityAdsInitializationError error,
                                    String message) {
                                Log.w(TAG, "Unity Ads init failed: " + message);
                            }
                        });
            } catch (Throwable t) {
                disabled = true;
                Log.w(TAG, "Unity Ads unavailable", t);
            }
        });
    }

    private void onAdsReady() {
        adsReady = true;
        loadVideo();
    }

    private void loadVideo() {
        if (disabled || !adsReady) return;
        try {
            UnityAds.load(VIDEO_PLACEMENT, new UnityAdsLoadOptions(),
                    new IUnityAdsLoadListener() {
                        @Override
                        public void onUnityAdsAdLoaded(String placementId) {
                            videoReady = true;
                        }

                        @Override
                        public void onUnityAdsFailedToLoad(
                                String placementId,
                                UnityAds.UnityAdsLoadError error,
                                String message) {
                            videoReady = false;
                        }
                    });
        } catch (Throwable t) {
            Log.w(TAG, "Video ad unavailable", t);
        }
    }

    @JavascriptInterface
    public boolean isInitialized() {
        initialize();
        return adsReady && !disabled;
    }

    @JavascriptInterface
    public boolean isVideoReady() {
        initialize();
        return videoReady && !disabled;
    }

    @JavascriptInterface
    public void showVideo() {
        if (!isVideoReady()) return;
        mainHandler.post(() -> {
            try {
                videoReady = false;
                UnityAds.show(activity, VIDEO_PLACEMENT,
                        new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                            @Override public void onUnityAdsShowStart(String id) {}
                            @Override public void onUnityAdsShowClick(String id) {}

                            @Override
                            public void onUnityAdsShowFailure(
                                    String id, UnityAds.UnityAdsShowError error,
                                    String message) {
                                loadVideo();
                            }

                            @Override
                            public void onUnityAdsShowComplete(
                                    String id,
                                    UnityAds.UnityAdsShowCompletionState state) {
                                loadVideo();
                            }
                        });
            } catch (Throwable t) {
                Log.w(TAG, "Video ad failed", t);
            }
        });
    }

    @JavascriptInterface
    public void showBanner() {
        initialize();
        bannerVisible = true;
        mainHandler.post(() -> {
            if (disabled || !adsReady) return;
            if (bannerView == null) {
                setupBanner();
            } else if (bannerReady) {
                bannerView.setVisibility(View.VISIBLE);
            }
        });
    }

    @JavascriptInterface
    public void hideBanner() {
        bannerVisible = false;
        mainHandler.post(() -> {
            if (bannerView != null) bannerView.setVisibility(View.GONE);
        });
    }

    private void setupBanner() {
        if (disabled || bannerView != null) return;
        try {
            bannerView = new BannerView(activity, BANNER_PLACEMENT,
                    new UnityBannerSize(320, 50));
            bannerView.setListener(new BannerView.IListener() {
                @Override
                public void onBannerLoaded(BannerView view) {
                    bannerReady = true;
                    mainHandler.post(() -> {
                        if (bannerView == null) return;
                        if (bannerView.getParent() == null) {
                            View content = activity.getWindow().getDecorView()
                                    .findViewById(android.R.id.content);
                            if (content instanceof ViewGroup) {
                                FrameLayout.LayoutParams params =
                                        new FrameLayout.LayoutParams(
                                                FrameLayout.LayoutParams.MATCH_PARENT,
                                                FrameLayout.LayoutParams.WRAP_CONTENT,
                                                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                                ((ViewGroup) content).addView(bannerView, params);
                            }
                        }
                        bannerView.setVisibility(
                                bannerVisible ? View.VISIBLE : View.GONE);
                    });
                }

                @Override public void onBannerShown(BannerView view) {}
                @Override public void onBannerClick(BannerView view) {}
                @Override public void onBannerLeftApplication(BannerView view) {}

                @Override
                public void onBannerFailedToLoad(
                        BannerView view, BannerErrorInfo errorInfo) {
                    bannerReady = false;
                    Log.w(TAG, "Banner unavailable");
                }
            });
            bannerView.load();
        } catch (Throwable t) {
            bannerView = null;
            Log.w(TAG, "Banner ad unavailable", t);
        }
    }
}