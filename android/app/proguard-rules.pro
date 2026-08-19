# ── R8 full mode (AGP 9) — targeted keep rules ────────────────────────────
# Unity Ads 4.19.0 ships its own consumer ProGuard rules that handle the
# SDK's internal reflection. We only add rules for the app's own classes,
# the Capacitor bridge, and the JavaScript interface surface.

-optimizationpasses 5

# ── Crash reporting ──────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ── App: WebView bridge surface must survive obfuscation ─────────────────
-keepclassmembers class com.fruitcatcher.game.** {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.fruitcatcher.game.MainActivity { *; }
-keep class com.fruitcatcher.game.MainActivity$* { *; }
-keep class com.fruitcatcher.game.NativeAdsBridge { *; }
-keepclassmembers class com.fruitcatcher.game.** {
    public *;
}

# ── Capacitor: keep ALL runtime-loaded classes ──────────────────────────
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

# ── Unity Ads: safety net for any classes the consumer rules miss ────────
# The SDK's bundled consumer rules handle the bulk of its reflection needs.
# These rules are a safety net so R8 full mode never strips a class that
# Unity Ads resolves at runtime.
-keep class com.unity3d.** { *; }
-keep interface com.unity3d.** { *; }
-dontwarn com.unity3d.**

# ── Protobuf (Unity Ads dependency) ───────────────────────────────────────
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }
-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite {
    ** *_;
}
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# ── Native methods ───────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Kotlin metadata (Unity Ads 4.19 uses Kotlin 2.1.x) ────────────────────
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings { <fields>; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ── WebView / JavaScript bridge ─────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class android.webkit.WebView {
    public *;
}
-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}

# ── Known harmless warnings ──────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn java.**
-dontwarn javax.**
-dontwarn sun.**
