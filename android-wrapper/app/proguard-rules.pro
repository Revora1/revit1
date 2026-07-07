# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /Users/android/sdk/tools/proguard/proguard-android.txt
# You can edit the include path and change the file name in build.gradle.

# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep WebView and JavaScript interfaces intact
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep OkHttp / Retrofit / JSON parsing classes if added in future
-keepattributes Signature, InnerClasses, EnclosingMethod

# Keep custom WebChromeClient and WebViewClient classes
-keep public class * extends android.webkit.WebViewClient
-keep public class * extends android.webkit.WebChromeClient
