# ── R8 optimization — targeted keeps to maximize shrink/optimize/obfuscate ──
# Previous blanket "-keep class X.** { *; }" rules prevented R8 from
# optimizing entire SDKs, causing Play Console's low rate warnings.
# This version keeps only reflective entry points and trusts consumer
# ProGuard rules shipped inside library AARs (Unity Ads, Play Services).
-optimizationpasses 5

# ── Crash reporting ──────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ── App: WebView bridge surface must survive obfuscation ────────────────────
-keepclassmembers class com.fruitcatcher.game.** {
    @android.webkit.JavascriptInterface <methods>;
}

# The activity is referenced from the manifest; JsBridge and NativeAdsBridge
# are reached only through addJavascriptInterface() / Class.forName.
-keep class com.fruitcatcher.game.MainActivity { *; }
-keep class com.fruitcatcher.game.MainActivity$JsBridge { *; }
-keep class com.fruitcatcher.game.NativeAdsBridge { *; }
-keepclassmembers class com.fruitcatcher.game.MainActivity$JsBridge {
    public *;
}

# ── Capacitor: keep runtime-loaded classes ─────────────────────────────────
# Capacitor does not ship consumer ProGuard rules, and R8 full mode will
# otherwise remove/instantiate classes that BridgeActivity and Bridge load
# reflectively at runtime. Keeping the com.getcapacitor package is the
# documented workaround; the size cost is modest because R8 can still
# optimize the app's own code and unused third-party SDKs.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn com.getcapacitor.**

# ── Unity Ads: trust consumer ProGuard rules shipped in the AAR ──────────────
# Only keep the public API classes the app calls directly via NativeAdsBridge.
# R8 can now shrink and optimize Unity's internal implementation.
-keep public class com.unity3d.ads.UnityAds { public *; }
-keep public interface com.unity3d.ads.IUnityAds*Listener { *; }
-keep public class com.unity3d.ads.UnityAdsLoadOptions { *; }
-keep public class com.unity3d.ads.UnityAdsShowOptions { *; }
-keep public class com.unity3d.ads.LoadOptions { *; }
-keep public class com.unity3d.ads.ShowOptions { *; }
-keep class com.unity3d.services.banners.** { *; }
-dontwarn com.unity3d.**

# ── Google Play services / Advertising ID / In-App Review ────────────────────
-keep class com.google.android.gms.ads.identifier.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.android.gms.**

# ── Play Core (in-app review) ────────────────────────────────────────────────
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# ── Protobuf (Unity Ads dependency) ──────────────────────────────────────────
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }
-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite {
    ** *_;
}

# ── Native methods ───────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Kotlin runtime metadata (Unity Ads 4.x resolves at runtime) ──────────────
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings { <fields>; }

# ── Known harmless warnings ──────────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn kotlin.**
-dontwarn kotlinx.**
