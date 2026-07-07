# RevItUp — Google Play Store Android Wrapper 🏁

Welcome! This folder contains a **fully-isolated, native Android Studio project** engineered to package your **RevItUp** car enthusiast social web application into an official `.apk` (Android Package) or `.aab` (Android App Bundle) ready for publishing on the **Google Play Store**.

By placing this in its own dedicated directory (`/android-wrapper`), your main React/Vite development workflow, production website hosting, and container deploy configurations are **100% untouched and unchanged**.

---

## 🛠️ Architecture & Core Features

Unlike generic web-views which break or freeze when users try to interact with device hardware, this wrapper is pre-configured with industry-grade native bridges:

1. **Fully-Bridge-Optimized File Uploads**: HTML `<input type="file" />` tags work seamlessly. When clicked, they trigger a native chooser dialog.
2. **Integrated Camera Capture**: Users can choose to take a brand-new build picture or engine shot directly with their device's hardware camera or pick a picture from their gallery.
3. **Cookie & Storage Persistence**: Your user sessions and log-ins are persistent. Restarts and sleep cycles won't force the user to re-authenticate.
4. **Fluid Native Back Button Handling**: Tapping the physical or virtual Back button navigates through the WebView's history instead of closing the app. If on the root page, double-tapping back gracefully prompts to close the app.
5. **No-Lag Hardware Acceleration**: Leverages the phone's GPU for responsive animations, buttery-smooth scrolls, and fluid transitions.
6. **Matching App Brand Design**: Fully customized status and navigation bars in deep slate (`#09090b`) with a glowing red tachometer (`#ef4444`) launcher icon and top progress loader.

---

## 🚀 Step-by-Step Guide to Build & Publish

### Prerequisite
* Download and install [Android Studio (Koala/Ladybug or newer)](https://developer.android.com/studio).

---

### Step 1: Import the Project into Android Studio
1. Open **Android Studio**.
2. Click **Open** (or **File > Open**).
3. Navigate to your local project directory and select the `android-wrapper` folder.
4. Android Studio will automatically read `settings.gradle` and begin syncing the Gradle packages. Please wait 1–2 minutes for the sync to complete.

---

### Step 2: Configure Your Production URL (Optional)
By default, the wrapper is hardcoded to load your shared production web app URL:
`https://ais-pre-udnaiwlqyc446igragqfqt-814177349165.europe-west2.run.app`

If you ever map a **custom domain** (e.g., `https://revitup.app` or `https://revitup-carclub.com`):
1. Open the file: `app/src/main/java/com/revitup/app/MainActivity.kt`.
2. Locate the companion object config at the top:
   ```kotlin
   const val TARGET_URL = "https://your-custom-domain.com"
   ```
3. Update the URL, save, and rebuild!

---

### Step 3: Run and Test Locally
1. Connect a physical Android phone via USB with **USB Debugging enabled** in developer options, or set up an **Android Virtual Device (Emulator)** in Android Studio's Device Manager.
2. Select your device from the toolbar drop-down.
3. Click the green **Run (Play)** button (`Shift + F10`).
4. The app will install on your emulator or physical phone instantly. Verify log-ins, camera attachment uploads on builds, and responsive styling.

---

### Step 4: Generate Your Google Play Store App Bundle (AAB)
To upload to the Google Play Store, you must compile a **Signed Release Android App Bundle (.aab)**:

1. In Android Studio, go to **Build > Generate Signed Bundle / APK...**
2. Select **Android App Bundle** and click **Next**.
3. **Key Store Path**:
   * If you don't have one, click **Create new...** to create a secure upload keystore.
   * Enter your passwords, name, and details. Keep this `.jks` file extremely safe (backed up), as Google Play relies on this certificate to authorize future updates!
4. Select **Release** build variant.
5. Set the **Destination Folder** where your signed bundle should be saved.
6. Click **Finish**. Android Studio will build and output your production-optimized bundle file (typically named `app-release.aab`).

---

### Step 5: Publish on Google Play Console
1. Register for a developer account on the [Google Play Console](https://play.google.com/console).
2. Click **Create app**, fill in your app details (Name: `RevItUp`, Default Language, Free/Paid status).
3. Set up your Store Listing:
   * **Short description**: "A social media platform for car enthusiasts to share builds."
   * **Full description**: "Connect with car builders, log your performance modifications, and explore tuner garages."
   * **App Icon**: Upload a 512x512px transparent PNG of your logo.
   * **Feature Graphic**: Upload a 1024x500px banner.
   * **Screenshots**: Provide high-res screenshots of your app loaded in the emulator or phone.
4. Go to **Release > Production**.
5. Create a new release, and drag-and-drop your `app-release.aab` file!
6. Complete the Content Rating and Privacy Policy questionnaires (you can link to your website's privacy page).
7. Review and submit your release for Google Review!

---

## 🔒 Firebase Security Note
Because your app utilizes the web client SDK, it securely acts as an encrypted client browser wrapper.
* **No Android SHA-1 Configuration Needed**: You do **not** need to configure native Android Firebase configurations (`google-services.json`), because the underlying web-app's config works seamlessly inside our isolated, secure WebView container.
* Web-view local storage is secure and isolated by the Android OS sandbox, meaning no other apps can peek at user cookies or log-in tokens!

*Race on! 🏎️*
