package com.revitup.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Parcelable
import android.provider.MediaStore
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    // Configuration
    companion object {
        // Points to the production shared app URL. Change this if you deploy to a custom domain!
        const val TARGET_URL = "https://ais-pre-udnaiwlqyc446igragqfqt-814177349165.europe-west2.run.app"
        const val FILE_CHOOSER_REQUEST_CODE = 1001
    }

    // Camera and Upload callbacks
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null
    private var cameraPhotoPath: String? = null
    private var doubleBackToExitPressedOnce = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Bind layout views
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        // Initialize and configure WebView settings
        setupWebView()

        // Load targeted URL
        if (savedInstanceState == null) {
            webView.loadUrl(TARGET_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings

        // Enable core capabilities for modern full-featured SPAs
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        // Custom User Agent suffix to optionally let your server know traffic is from the Android app
        settings.userAgentString = settings.userAgentString + " RevItUpAndroidApp/1.0"

        // Ensure proper cookie synchronization and local persistence
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // Enable hardware acceleration for smooth transition animations
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Prevent external web pages from launching in the default web browser (keeps user in-app)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Allow our domain or subpages to load in WebView; open others in standard external browser
                if (url.startsWith(TARGET_URL) || url.contains("firebaseapp.com") || url.contains("googleapis.com")) {
                    return false
                }
                
                // Open external links (e.g. social shares) in standard browser
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "No application can handle this link", Toast.LENGTH_SHORT).show()
                }
                return true
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                // If the app is offline or has an issue, show a helpful message but continue to retry in the background
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@MainActivity, "Network error. Operating in offline mode.", Toast.LENGTH_LONG).show()
                }
            }
        }

        // Custom chrome client to handle file selection triggers and native image captures
        webView.webChromeClient = object : WebChromeClient() {
            // Track load progress to update our sleek horizontal bar
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                } else {
                    progressBar.visibility = View.VISIBLE
                }
            }

            // Grant Geolocation permissions inside the WebView if requested
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            // Key function: intercept file selection clicks to launch Camera and Gallery selectors
            override fun onShowFileChooser(
                mWebView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Cancel any previous hanging callbacks
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                checkPermissionsAndLaunchChooser()
                return true
            }
        }
    }

    // Request permissions launcher for camera and storage access
    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        if (cameraGranted) {
            launchChooser()
        } else {
            // Launch chooser anyway with only Gallery option, informing the user
            Toast.makeText(this, "Camera permission denied. Gallery only mode.", Toast.LENGTH_SHORT).show()
            launchChooser(galleryOnly = true)
        }
    }

    private fun checkPermissionsAndLaunchChooser() {
        val hasCameraPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        
        if (hasCameraPermission) {
            launchChooser()
        } else {
            // Request on-demand Camera permission to support live photo uploads
            requestPermissionsLauncher.launch(arrayOf(Manifest.permission.CAMERA))
        }
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val imageFileName = "JPEG_" + timeStamp + "_"
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(imageFileName, ".jpg", storageDir).apply {
            cameraPhotoPath = absolutePath
        }
    }

    private fun launchChooser(galleryOnly: Boolean = false) {
        var cameraIntent: Intent? = null
        
        if (!galleryOnly) {
            val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            if (captureIntent.resolveActivity(packageManager) != null) {
                try {
                    val photoFile = createImageFile()
                    val photoURI = FileProvider.getUriForFile(
                        this,
                        "com.revitup.app.fileprovider",
                        photoFile
                    )
                    cameraPhotoUri = photoURI
                    captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
                    cameraIntent = captureIntent
                } catch (e: IOException) {
                    Toast.makeText(this, "Could not create image file for camera", Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Standard gallery select intent
        val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "image/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true) // Enable picking multiple files if supported
        }

        val chooserIntent = Intent(Intent.createChooser(galleryIntent, "Select Car Builds / Images")).apply {
            if (cameraIntent != null) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf<Parcelable>(cameraIntent))
            }
        }

        @Suppress("DEPRECATION")
        startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE)
    }

    @Deprecated("Deprecated in Java but required for simple backwards compatible ActivityResult callback with legacy WebChromeClient")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback == null) return

            var results: Array<Uri>? = null

            if (resultCode == Activity.RESULT_OK) {
                // If there's no data response but we have a photo path, the user captured a live photo!
                if (data == null || data.data == null && data.clipData == null) {
                    if (cameraPhotoUri != null) {
                        results = arrayOf(cameraPhotoUri!!)
                    }
                } else {
                    // Handle single and multiple selected images from file browser
                    val dataString = data.dataString
                    val clipData = data.clipData

                    if (clipData != null) {
                        results = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                    } else if (dataString != null) {
                        results = arrayOf(Uri.parse(dataString))
                    }
                }
            }

            // Deliver the results back to the WebView's HTML input element
            fileUploadCallback?.onReceiveValue(results)
            fileUploadCallback = null
        }
    }

    // Keep session state alive by saving state on pause/stop
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    // Professional Back Button handling: navigating back in WebView history instead of closing the app!
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        
        // If they are on the root view, double tap back to exit to prevent accidental app closure
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (doubleBackToExitPressedOnce) {
                finish()
                return true
            }
            this.doubleBackToExitPressedOnce = true
            Toast.makeText(this, "Press BACK again to exit RevItUp", Toast.LENGTH_SHORT).show()
            webView.postDelayed({ doubleBackToExitPressedOnce = false }, 2000)
            return true
        }

        return super.onKeyDown(keyCode, event)
    }
}
