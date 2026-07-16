import express from "express";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = 3000;

// REST API and Proxy routes first
app.get('/privacy-policy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - RevitUp</title>
  <style>
    body {
      background-color: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 80px;
    }
    h1 {
      font-size: 28px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: -0.05em;
      text-transform: uppercase;
      border-bottom: 1px solid #18181b;
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3 {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #71717a;
      margin-top: 32px;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #a1a1aa;
      margin: 0 0 16px 0;
    }
    ul {
      margin: 0 0 16px 0;
      padding-left: 20px;
      color: #a1a1aa;
      font-size: 14px;
    }
    li {
      margin-bottom: 8px;
    }
    .highlight {
      color: #ffffff;
      font-weight: bold;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .card {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 16px;
    }
    .card-title {
      font-size: 14px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .card-desc {
      font-size: 11px;
      color: #71717a;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #3f3f46;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #18181b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    
    <p style="color: #ffffff; font-size: 12px; margin-bottom: 24px;"><strong>Last Updated: July 12, 2026</strong></p>
    
    <section>
      <p style="font-size: 15px; color: #ffffff; line-height: 1.7;">Your privacy is important to us. This privacy policy describes how RevitUp ("we", "our", or "us") handles user authentication and data.</p>
    </section>

    <section>
      <h3>1. Authentication and Personal Information</h3>
      <p>RevitUp uses <strong class="highlight">Google Sign-In</strong> for user registration and secure authentication.</p>
      <ul>
        <li><strong class="highlight">What is accessed:</strong> We access your public Google profile information (such as your name, email address, and profile picture) solely to create and manage your secure user account.</li>
        <li><strong class="highlight">No direct collection:</strong> We do not directly collect, request, store, or sell your email address or any personal contact details for marketing or promotional purposes.</li>
      </ul>
    </section>

    <section>
      <h3>2. User-Created Content (Garage & Build Data)</h3>
      <p>We store the information you actively input to personalize your app experience:</p>
      <ul>
        <li>Your garage vehicle specifications (Make, Model, Year).</li>
        <li>Build modifications, dynamic tuner metrics, and any photos you upload.</li>
        <li>Community interactions (likes, comments, and posts on the feed).</li>
      </ul>
      <p>This data is stored securely using cloud database services and is only used to enable core app features.</p>
    </section>

    <section>
      <h3>3. Ad Consent and Tracking</h3>
      <p>If you provide explicit consent in the app settings, we may use Google Ad Manager or analytics providers to display relevant automotive content and measure performance. You can revoke this consent at any time through the in-app Settings menu.</p>
    </section>

    <section>
      <h3>4. Your Rights (GDPR / CCPA)</h3>
      <p>You have full ownership of your data. At any time within the app's Settings menu, you can:</p>
      <div class="grid">
        <div class="card">
          <div class="card-title">Request Access</div>
          <div class="card-desc">Access and download a copy of all your custom build details.</div>
        </div>
        <div class="card">
          <div class="card-title">Request Erasure</div>
          <div class="card-desc">Instantly and permanently delete your account, which automatically purges all your garage data, posts, and profile associations from our servers.</div>
        </div>
      </div>
    </section>

    <section>
      <h3>5. Contact Us</h3>
      <p>If you have any questions or concerns regarding your privacy, please contact the developer at:</p>
      <p class="highlight" style="font-size: 16px; color: #ffffff;">tonyang11552883@gmail.com</p>
    </section>

    <div class="footer">
      Last Updated: July 12, 2026
    </div>
  </div>
</body>
</html>`);
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
