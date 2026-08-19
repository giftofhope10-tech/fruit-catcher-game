---
name: Android build verification
description: Constraints affecting native APK diagnosis in this workspace
---

Native APK diagnosis is not fully reproducible in this workspace when Capacitor dependencies are absent and the package firewall blocks the required transitive `tar` archive; source checks and the browser preview are still available, but an Android device/logcat is needed for runtime confirmation.

**Why:** The Android project could not configure without `node_modules/@capacitor/*`, and no device was attached to `adb`.

**How to apply:** Treat a source-level native fix as verified only for syntax and web regression until a release APK is rebuilt and installed on a physical/emulated Android device.