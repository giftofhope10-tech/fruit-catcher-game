# Keep line number info for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── CRITICAL: Preserve ALL annotations at runtime ────────────────────────────
# Without this, @JavascriptInterface is stripped by ProGuard.
# Android API 17+ silently blocks JS→Java calls on methods missing this annotation.
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# ── Keep entire app package ───────────────────────────────────────────────────
-keep class com.fruitcatcher.game.** { *; }

# ── Capacitor ─────────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# ── WebView JavaScript interface (belt-and-suspenders) ───────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}

# ── AndroidX ──────────────────────────────────────────────────────────────────
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# ── Unity Ads SDK ─────────────────────────────────────────────────────────────
-keep class com.unity3d.ads.** { *; }
-keep class com.unity3d.services.** { *; }
-keepclassmembers class com.unity3d.ads.** { *; }
-keepclassmembers class com.unity3d.services.** { *; }

# ── Google Play Services (Advertising ID) ─────────────────────────────────────
-keep class com.google.android.gms.ads.identifier.** { *; }

# ── Native methods ────────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Suppress known harmless warnings ─────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
