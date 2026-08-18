# ── Aggressive R8 optimization (raises Play's optimization/obfuscation rates) ─
-allowaccessmodification
-repackageclasses ''
-optimizationpasses 5
-mergeinterfacesaggressively

# ── Crash reporting ──────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ── App: only the WebView bridge surface must survive obfuscation ────────────
-keepclassmembers class com.fruitcatcher.game.** {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Capacitor plugin reflection ──────────────────────────────────────────────
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Unity Ads SDK ────────────────────────────────────────────────────────────
# The Unity Ads AAR ships its own consumer ProGuard rules, which keep exactly
# the reflective entry points the SDK needs. Blanket "-keep class ... { *; }"
# rules on top of them disabled obfuscation/optimization for the whole SDK
# (the main cause of the low optimization/obfuscation rates reported by Play).
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }
-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite {
    ** *_;
}

# ── Google Play services / In-App Review ─────────────────────────────────────
# Both libraries ship consumer rules; only the AdvertisingIdClient result type
# is touched reflectively by older Unity builds.
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient$Info { *; }

# ── Native methods ───────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Known harmless warnings ──────────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn com.google.android.play.core.**
-dontwarn com.unity3d.**
