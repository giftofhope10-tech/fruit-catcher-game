package com.fruitcatcher.game;

import android.os.Bundle;
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

        getBridge().getWebView().addJavascriptInterface(new JsBridge(), "NativeUnityAds");

        UnityAds.initialize(this, GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                mAdsReady = true;
                loadVideoAd();
                runOnUiThread(() -> {
                    getBridge().getWebView().evaluateJavascript(
                        "if(typeof window.onNativeAdsReady==='function') window.onNativeAdsReady();", null);
                    setupBanner();
                });
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
            }
        });
    }

    private void loadVideoAd() {
        UnityAds.load(PLACEMENT_VIDEO, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                mVideoLoaded = true;
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                mVideoLoaded = false;
            }
        });
    }

    private void setupBanner() {
        mBannerView = new BannerView(this, PLACEMENT_BANNER, UnityBannerSize.getDynamicSize(this));
        mBannerView.setListener(new BannerView.IListener() {
            @Override public void onBannerLoaded(BannerView b) {}
            @Override public void onBannerShown(BannerView b) {}
            @Override public void onBannerClick(BannerView b) {}
            @Override public void onBannerLeftApplication(BannerView b) {}
            @Override public void onBannerFailedToLoad(BannerView b, BannerErrorInfo e) {}
        });
        mBannerView.load();

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        );
        FrameLayout decorView = (FrameLayout) getWindow().getDecorView();
        decorView.addView(mBannerView, params);
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
            runOnUiThread(() -> UnityAds.show(MainActivity.this, PLACEMENT_VIDEO,
                new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                    @Override
                    public void onUnityAdsShowFailure(String p, UnityAds.UnityAdsShowError e, String m) {}
                    @Override
                    public void onUnityAdsShowStart(String p) {}
                    @Override
                    public void onUnityAdsShowClick(String p) {}
                    @Override
                    public void onUnityAdsShowComplete(String p, UnityAds.UnityAdsShowCompletionState s) {
                        mVideoLoaded = false;
                        loadVideoAd();
                    }
                }));
        }

        @JavascriptInterface
        public void showBanner() {
            runOnUiThread(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.VISIBLE);
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(() -> {
                if (mBannerView != null) mBannerView.setVisibility(View.GONE);
            });
        }
    }
}
