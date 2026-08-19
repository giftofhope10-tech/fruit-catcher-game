# ── R8 full mode (AGP 9) — comprehensive keep rules ───────────────────────
# Keeps all Capacitor + Unity Ads classes intact so the app launches
# without crashing AND ads work, while R8 still shrinks/optimizes the
# app's own code and strips truly unused third-party code.

-optimizationpasses 5

# ── Crash reporting ──────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ── App: WebView bridge surface must survive obfuscation ────────────────────
-keepclassmembers class com.fruitcatcher.game.** {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.fruitcatcher.game.MainActivity { *; }
-keep class com.fruitcatcher.game.MainActivity$* { *; }
-keep class com.fruitcatcher.game.NativeAdsBridge { *; }
-keepclassmembers class com.fruitcatcher.game.** {
    public *;
}

# ── Capacitor: keep ALL runtime-loaded classes ──────────────────────────────
# Capacitor loads plugins reflectively via Class.forName and PluginRegistry.
# R8 full mode removes anything not statically referenced, so we keep the
# entire com.getcapacitor package.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @android.webkit.JavascriptInterface <methods>;
    public *;
}
-keepclassmembers class com.getcapacitor.** {
    public *;
    protected *;
}
-dontwarn com.getcapacitor.**

# ── Unity Ads: keep ALL classes (not just public API) ───────────────────────
# Unity Ads 4.x uses heavy reflection internally. Keeping only public API
# classes caused ads to silently fail to load. Keeping the full package
# ensures initialization, ad loading, and showing all work correctly.
-keep class com.unity3d.** { *; }
-keep interface com.unity3d.** { *; }
-keepclassmembers class com.unity3d.** {
    public *;
    protected *;
    private *;
}
-dontwarn com.unity3d.**

# ── Google Play services / Advertising ID / In-App Review ────────────────────
-keep class com.google.android.gms.** { *; }
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
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# ── Native methods ───────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Kotlin runtime metadata (Unity Ads 4.x resolves at runtime) ──────────────
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings { <fields>; }
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ── AndroidX (Unity Ads + Capacitor depend on these at runtime) ──────────────
-keep class androidx.activity.** { *; }
-keep class androidx.appcompat.** { *; }
-keep class androidx.core.** { *; }
-keep class androidx.fragment.** { *; }
-keep class androidx.lifecycle.** { *; }
-keep class androidx.webkit.** { *; }
-dontwarn androidx.**

# ── WebView / JavaScript bridge ─────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class android.webkit.WebView {
    public *;
}
-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}

# ── Known harmless warnings ──────────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn java.**
-dontwarn javax.**
-dontwarn sun.**