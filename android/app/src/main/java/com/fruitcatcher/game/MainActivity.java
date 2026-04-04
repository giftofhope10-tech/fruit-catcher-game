package com.fruitcatcher.game;

import android.os.Bundle;
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
    private static final String PLACEMENT_VIDEO = "video";
    private static final String PLACEMENT_BANNER = "banner";

    private BannerView mBannerView;
    private volatile boolean mAdsReady = false;
    private volatile boolean mVideoLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            getBridge().getWebView().addJavascriptInterface(new JsBridge(), "NativeUnityAds");
            initUnityAds();
        } catch (Exception e) {
            Log.e(TAG, "Failed to set up ads bridge: " + e.getMessage());
        }
    }

    private void initUnityAds() {
        try {
            UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
                @Override
                public void onInitializationComplete() {
                    mAdsReady = true;
                    Log.d(TAG, "Unity Ads initialized");
                    loadVideoAd();
                    runOnUiThread(() -> {
                        try {
                            getBridge().getWebView().evaluateJavascript(
                                "if(typeof window.onNativeAdsReady==='function') window.onNativeAdsReady();", null);
                            setupBanner();
                        } catch (Exception e) {
                            Log.e(TAG, "Error after ads init: " + e.getMessage());
                        }
                    });
                }

                @Override
                public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                    Log.w(TAG, "Unity Ads init failed: " + message);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Unity Ads initialize threw: " + e.getMessage());
        }
    }

    private void loadVideoAd() {
        try {
            UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
                @Override
                public void onUnityAdsAdLoaded(String placementId) {
                    mVideoLoaded = true;
                    Log.d(TAG, "Video ad loaded");
                }

                @Override
                public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                    mVideoLoaded = false;
                    Log.w(TAG, "Video ad failed: " + message);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "loadVideoAd threw: " + e.getMessage());
        }
    }

    private void setupBanner() {
        try {
            mBannerView = new BannerView(this, PLACEMENT_BANNER, new UnityBannerSize(320, 50));
            mBannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView b) {
                    Log.d(TAG, "Banner loaded");
                }
                @Override public void onBannerShown(BannerView b) {}
                @Override public void onBannerClick(BannerView b) {}
                @Override public void onBannerLeftApplication(BannerView b) {}
                @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {
                    Log.w(TAG, "Banner failed: " + (e != null ? e.errorMessage : "unknown"));
                }
            });
            mBannerView.load();

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
            );

            View decorView = getWindow().getDecorView();
            if (decorView instanceof FrameLayout) {
                ((FrameLayout) decorView).addView(mBannerView, params);
            } else {
                Log.w(TAG, "DecorView is not a FrameLayout, skipping banner");
            }
        } catch (Exception e) {
            Log.e(TAG, "setupBanner threw: " + e.getMessage());
        }
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
            if (!mAdsReady) return;
            try {
                runOnUiThread(() -> {
                    try {
                        UnityAds.show(MainActivity.this, PLACEMENT_VIDEO,
                            new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                                @Override
                                public void onUnityAdsShowFailure(String p, UnityAds.UnityAdsShowError e, String m) {
                                    Log.w(TAG, "Show failed: " + m);
                                }
                                @Override public void onUnityAdsShowStart(String p) {}
                                @Override public void onUnityAdsShowClick(String p) {}
                                @Override
                                public void onUnityAdsShowComplete(String p, UnityAds.UnityAdsShowCompletionState s) {
                                    mVideoLoaded = false;
                                    loadVideoAd();
                                }
                            });
                    } catch (Exception e) {
                        Log.e(TAG, "show threw: " + e.getMessage());
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "showVideo threw: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void showBanner() {
            runOnUiThread(() -> {
                try {
                    if (mBannerView != null) mBannerView.setVisibility(View.VISIBLE);
                } catch (Exception e) {
                    Log.e(TAG, "showBanner threw: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(() -> {
                try {
                    if (mBannerView != null) mBannerView.setVisibility(View.GONE);
                } catch (Exception e) {
                    Log.e(TAG, "hideBanner threw: " + e.getMessage());
                }
            });
        }
    }
}
