import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp();
  } catch (err) {
    console.error("Firebase Admin initialization error:", err);
  }
}

let firestoreDb: any = null;
try {
  firestoreDb = getFirestore("ai-studio-94b91240-6a0e-4947-9a3e-944940cdc81d");
} catch {
  try {
    firestoreDb = getFirestore();
  } catch (err) {
    console.warn("Firestore Admin initialization skipped:", err);
  }
}

// Load Firebase configuration for REST API queries
let appFirebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appFirebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json:", e);
}

function parseFirestoreFields(fields: any): any {
  if (!fields) return {};
  const result: any = {};
  for (const [k, v] of Object.entries<any>(fields)) {
    if (v.stringValue !== undefined) result[k] = v.stringValue;
    else if (v.integerValue !== undefined) result[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) result[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) result[k] = v.timestampValue;
    else if (v.arrayValue !== undefined) {
      result[k] = (v.arrayValue.values || []).map((item: any) => {
        if (item.stringValue !== undefined) return item.stringValue;
        if (item.mapValue !== undefined) return parseFirestoreFields(item.mapValue.fields);
        return item;
      });
    } else if (v.mapValue !== undefined) {
      result[k] = parseFirestoreFields(v.mapValue.fields);
    }
  }
  return result;
}

function parseFirestoreDoc(doc: any): any {
  if (!doc) return null;
  const id = doc.name ? doc.name.split('/').pop() : '';
  const parsed = parseFirestoreFields(doc.fields);
  return { id, ...parsed };
}

async function getFirestoreDocById(collection: string, docId: string): Promise<any | null> {
  if (firestoreDb) {
    try {
      const snap = await firestoreDb.collection(collection).doc(docId).get();
      if (snap.exists) return { id: snap.id, ...snap.data() };
    } catch {}
  }
  if (appFirebaseConfig && appFirebaseConfig.projectId && appFirebaseConfig.apiKey) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${appFirebaseConfig.projectId}/databases/(default)/documents/${collection}/${docId}?key=${appFirebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return parseFirestoreDoc(data);
      }
    } catch (err) {
      console.warn(`REST error fetching ${collection}/${docId}:`, err);
    }
  }
  return null;
}

async function getFirestoreUserByUsername(username: string): Promise<any | null> {
  const clean = username.toLowerCase().trim();
  const candidates = [clean];
  if (clean === 'tony') {
    candidates.push('tonyang11552883', 'tonyang1155');
  }

  if (firestoreDb) {
    for (const c of candidates) {
      try {
        const snap = await firestoreDb.collection('users').where('usernameLower', '==', c).limit(1).get();
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } catch {}
    }
  }

  if (appFirebaseConfig && appFirebaseConfig.projectId && appFirebaseConfig.apiKey) {
    for (const c of candidates) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${appFirebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${appFirebaseConfig.apiKey}`;
        const body = {
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'usernameLower' },
                op: 'EQUAL',
                value: { stringValue: c }
              }
            },
            limit: 1
          }
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const list = await res.json();
          for (const item of list) {
            if (item.document) {
              return parseFirestoreDoc(item.document);
            }
          }
        }
      } catch (err) {
        console.warn('REST error querying user:', err);
      }
    }
  }
  return null;
}


// REST API and Proxy routes first

app.use(express.json());

// Apple App Site Association (AASA) for iOS Universal Links
const appleAppSiteAssociation = {
  applinks: {
    apps: [],
    details: [
      {
        appID: "ZLHX8SG89D.today.revitup.app",
        paths: ["*"],
        components: [
          { "/": "/*" }
        ]
      }
    ]
  },
  webcredentials: {
    apps: ["ZLHX8SG89D.today.revitup.app"]
  },
  appclips: {
    apps: []
  }
};

app.get(['/.well-known/apple-app-site-association', '/apple-app-site-association'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(appleAppSiteAssociation, null, 2));
});

// Android Digital Asset Links for Android App Links
const androidAssetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.revitup.network",
      sha256_cert_fingerprints: [
        "14:6D:E9:7D:63:F1:C0:CA:63:93:17:F6:1F:B1:01:ED:A8:12:D5:78:E5:22:98:83:FE:1F:59:75:5D:80:FF:16",
        "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
      ]
    }
  }
];

app.get(['/.well-known/assetlinks.json', '/assetlinks.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(androidAssetLinks, null, 2));
});


app.post('/api/send-push', async (req, res) => {
  try {
    const { token, title, body } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    const message = {
      notification: {
        title: title || 'New Notification',
        body: body || 'You have a new notification.'
      },
      token: token,
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    const response = await getMessaging().send(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error("Error sending push notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

app.get('/privacy-policy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html lang="en"><head>
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
      font-size: 11px;      color: #3f3f46;
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
      <p>RevitUp uses secure <strong class="highlight">Email/Password</strong> authentication for user registration and account management.</p>
      <ul>
        <li><strong class="highlight">What is accessed:</strong> We use your provided email address solely to create, log in, and manage your secure user account.</li>
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
          <div class="card-title">Request Data Deletion</div>
          <div class="card-desc">Request to delete specific user data without deleting your entire account.</div>
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

app.get('/delete-account', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion - RevitUp</title>
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
    p {
      font-size: 14px;
      color: #a1a1aa;
      margin: 0 0 16px 0;
    }
    ul, ol {
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
    .steps {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 24px;
      margin-top: 24px;
      margin-bottom: 32px;
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
    <h1>Account Deletion Request</h1>
    
    <p style="font-size: 15px; color: #ffffff; line-height: 1.7;">If you no longer wish to use RevitUp, you can request to delete your account and all associated data.</p>

    <div class="steps">
      <h2>How to delete your account in the app:</h2>
      <p>The fastest way to permanently delete your account is directly within the app.</p>
      <ol>
        <li>Open the <strong class="highlight">RevitUp</strong> app on your device and log in.</li>
        <li>Go to your <strong class="highlight">Profile</strong> tab.</li>
        <li>Tap the <strong class="highlight">Settings</strong> icon (the gear in the top right corner).</li>
        <li>Scroll down and tap on <strong class="highlight" style="color: #ef4444;">Delete Account</strong>.</li>
        <li>Confirm your choice when prompted.</li>
      </ol>
    </div>

    <section>
      <h2>Alternative: Request deletion via email</h2>
      <p>If you have uninstalled the app or cannot log in, you can request account deletion by emailing our support team:</p>
      <p>Please send an email to <strong class="highlight" style="color: #ffffff;">tonyang11552883@gmail.com</strong> from the email address associated with your RevitUp account with the subject line <strong class="highlight">"Account Deletion Request"</strong>.</p>
    </section>

    <section>
      <h2>What happens to your data?</h2>
      <p>When you delete your account (or request deletion), the following data is permanently deleted:</p>
      <ul>
        <li>Your personal profile information (username, display name, bio, profile picture)</li>
        <li>Your login credentials and authentication data</li>
        <li>All posts, photos, and media you have uploaded</li>
        <li>Your virtual garage data and build timelines</li>
        <li>Your comments, likes, and interactions</li>
        <li>Your chat messages and inbox data</li>
      </ul>
      <p><strong class="highlight">Data Retention:</strong> Account deletion is immediate and irreversible. We do not retain any of your personal data after the deletion process is complete. You may also request deletion of specific data without deleting your entire account.</p>
    </section>

    <div class="footer">
      App Name: RevitUp<br>
      Developer: Tony Ang
    </div>
  </div>
</body>
</html>`);
});

app.get('/child-safety-standards', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Child Safety Standards - RevitUp</title>
  <style>
    body { background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding-bottom: 80px; }
    h1 { font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; text-transform: uppercase; border-bottom: 1px solid #18181b; padding-bottom: 16px; margin-bottom: 32px; }
    h2 { font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; }
    p { font-size: 14px; color: #a1a1aa; margin: 0 0 16px 0; }
    ul, ol { margin: 0 0 16px 0; padding-left: 20px; color: #a1a1aa; font-size: 14px; }
    li { margin-bottom: 8px; }
    .highlight { color: #ffffff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Child Safety Standards</h1>
    <p>At RevitUp, we have a zero-tolerance policy for child sexual abuse material (CSAM) and any form of child sexual abuse and exploitation (CSAE).</p>
    <section>
      <h2>Reporting and Prevention</h2>
      <p>Users can report any concerning content directly through the app. We actively monitor and take immediate action against any accounts violating these standards.</p>
      <ul>
        <li>Immediate removal of any CSAM or CSAE content.</li>
        <li>Permanent ban of users involved in such activities.</li>
        <li>Reporting to the National Center for Missing & Exploited Children (NCMEC) and relevant law enforcement authorities globally.</li>
      </ul>
    </section>
    <section>
      <h2>Contact Us</h2>
      <p>If you have questions or concerns regarding our child safety practices, contact our designated point of contact at:</p>
      <p class="highlight" style="font-size: 16px; color: #ffffff;">tonyang1155@hotmail.co.uk</p>
    </section>
  </div>
</body>
</html>`);
});

async function generateDynamicHtml(reqUrl: string, rawHtml: string): Promise<string> {
  try {
    const parsedUrl = new URL(reqUrl, 'https://revitup.today');
    const pathName = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    let postId = searchParams.get('p') || searchParams.get('postId');
    let username = searchParams.get('ref') || searchParams.get('u') || searchParams.get('username');
    let carId = searchParams.get('car') || searchParams.get('carId') || searchParams.get('c');

    // Path-based deep links: /p/:id, /post/:id, /u/:username, /user/:username, /car/:id, /build/:id
    const postMatch = pathName.match(/^\/(?:p|post)\/([a-zA-Z0-9_-]+)/i);
    if (postMatch) postId = postMatch[1];

    const userMatch = pathName.match(/^\/(?:u|user|profile)\/([a-zA-Z0-9_-]+)/i);
    if (userMatch) username = userMatch[1];

    const carMatch = pathName.match(/^\/(?:c|car|build)\/([a-zA-Z0-9_-]+)/i);
    if (carMatch) carId = carMatch[1];

    let title = 'RevItUp - Social Garage & Automotive Build Community';
    let description = 'Join RevItUp: The dedicated social garage and automotive build platform for car enthusiasts. Share project builds, dyno sheets, 0-60 & quarter-mile times, modifications, and connect with tuners worldwide.';
    let image = 'https://revitup.today/icon-512.png';
    let ogType = 'website';
    let canonicalUrl = `https://revitup.today${pathName}${parsedUrl.search}`;
    let keywords = 'car builds, virtual garage, dyno tuning, car modifications, project cars, drag times, automotive marketplace, RevItUp';
    
    let jsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'RevItUp',
      url: 'https://revitup.today',
      description: 'Social garage and vehicle build platform for automotive enthusiasts and tuners.',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://revitup.today/?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    };

    let noscriptContent = `
      <div style="background:#000;color:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;">
        <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.05em;text-transform:uppercase;color:#fff;margin-bottom:12px;">RevItUp Social Garage</h1>
        <p style="font-size:16px;color:#a1a1aa;line-height:1.6;margin-bottom:24px;">The automotive community platform for car enthusiasts to log project builds, dyno runs, track times, and performance modifications.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:32px;">
          <div style="background:#18181b;padding:16px;border-radius:12px;border:1px solid #27272a;">
            <h2 style="font-size:16px;color:#fff;margin:0 0 8px 0;">Virtual Garage</h2>
            <p style="font-size:13px;color:#a1a1aa;margin:0;">Track vehicle modifications, part costs, and horsepower progression.</p>
          </div>
          <div style="background:#18181b;padding:16px;border-radius:12px;border:1px solid #27272a;">
            <h2 style="font-size:16px;color:#fff;margin:0 0 8px 0;">Dyno Leaderboard</h2>
            <p style="font-size:13px;color:#a1a1aa;margin:0;">Verified dyno sheets, wheel horsepower numbers, and quarter-mile times.</p>
          </div>
          <div style="background:#18181b;padding:16px;border-radius:12px;border:1px solid #27272a;">
            <h2 style="font-size:16px;color:#fff;margin:0 0 8px 0;">Automotive Marketplace</h2>
            <p style="font-size:13px;color:#a1a1aa;margin:0;">Buy and sell performance parts, turbos, coilovers, and custom wheels.</p>
          </div>
        </div>
        <p style="font-size:12px;color:#71717a;">© 2026 RevItUp. All rights reserved. <a href="/privacy-policy" style="color:#a1a1aa;">Privacy Policy</a> | <a href="/delete-account" style="color:#a1a1aa;">Account Deletion</a></p>
      </div>
    `;

    if (postId) {
      try {
        const post = await getFirestoreDocById('posts', postId);
        if (post) {
          const author = post.authorUsername || 'Tuner';
          const cleanCaption = post.caption ? String(post.caption).replace(/(\r\n|\n|\r)/gm, ' ').trim() : 'Project Build Update';
          const previewText = cleanCaption.length > 80 ? cleanCaption.slice(0, 77) + '...' : cleanCaption;
          
          title = `${previewText} | @${author} on RevItUp`;
          description = `${cleanCaption} - Discover vehicle modifications, dyno numbers, and project build updates by @${author} on RevItUp.`;
          image = post.thumbnailUrl || (post.mediaUrls && post.mediaUrls[0]) || post.mediaUrl || image;
          ogType = 'article';
          keywords = `car build, ${author}, project car, dyno tuning, automotive modification, RevItUp`;

          jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'SocialMediaPosting',
            headline: title,
            articleBody: cleanCaption,
            image: [image],
            datePublished: post.createdAt ? new Date(typeof post.createdAt === 'number' ? post.createdAt : Date.now()).toISOString() : new Date().toISOString(),
            author: {
              '@type': 'Person',
              name: author,
              url: `https://revitup.today/?ref=${author}`
            },
            publisher: {
              '@type': 'Organization',
              name: 'RevItUp',
              logo: { '@type': 'ImageObject', url: 'https://revitup.today/icon-512.png' }
            }
          };

          noscriptContent = `
            <div style="background:#000;color:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:700px;margin:0 auto;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <span style="font-size:14px;color:#e4e4e7;font-weight:bold;">Post by @${author}</span>
              </div>
              ${image ? `<img src="${image}" alt="${previewText}" style="width:100%;border-radius:12px;margin-bottom:16px;max-height:500px;object-fit:cover;" />` : ''}
              <h1 style="font-size:22px;color:#fff;margin-bottom:12px;line-height:1.4;">${cleanCaption}</h1>
              <p style="font-size:14px;color:#a1a1aa;margin-bottom:24px;">Likes: ${post.likesCount || 0} • Comments: ${post.commentsCount || 0} • Shares: ${post.sharesCount || 0}</p>
              <p style="font-size:13px;color:#71717a;"><a href="https://revitup.today/?p=${postId}" style="color:#ef4444;font-weight:bold;text-decoration:none;">Open full interactive build on RevItUp →</a></p>
            </div>
          `;
        }
      } catch (err) {
        console.warn("Error fetching post for SEO:", err);
      }
    } else if (username) {
      try {
        const user = await getFirestoreUserByUsername(username);
        if (user) {
          const rawName = user.displayName || user.username || username;
          const cleanDisplayName = (rawName === 'tonyang11552883' || rawName === 'tonyang1155') ? 'Tony' : rawName;
          const cleanUsername = (user.username === 'tonyang11552883' || user.username === 'tonyang1155') ? 'tony' : (user.username || username);
          const bio = user.bio ? String(user.bio).replace(/(\r\n|\n|\r)/gm, ' ').trim() : `@${cleanUsername} on RevItUp: Automotive builds, virtual garage, dyno numbers & car community.`;
          
          title = `${cleanDisplayName} on RevItUp`;
          description = bio;
          image = user.profilePic || user.photoURL || image;
          ogType = 'profile';
          keywords = `${cleanUsername}, ${cleanDisplayName}, virtual garage, tuner profile, project car builds, RevItUp`;

          jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: cleanDisplayName,
              alternateName: cleanUsername,
              description: bio,
              image: image,
              url: `https://revitup.today/?ref=${cleanUsername}`
            }
          };

          noscriptContent = `
            <div style="background:#000;color:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:700px;margin:0 auto;">
              <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                ${image ? `<img src="${image}" alt="${cleanDisplayName}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #27272a;" />` : ''}
                <div>
                  <h1 style="font-size:24px;font-weight:bold;color:#fff;margin:0 0 4px 0;">${cleanDisplayName}</h1>
                  <p style="font-size:14px;color:#a1a1aa;margin:0;">@${cleanUsername}</p>
                </div>
              </div>
              <p style="font-size:15px;color:#e4e4e7;line-height:1.6;margin-bottom:24px;">${bio}</p>
              <div style="background:#18181b;padding:16px;border-radius:12px;border:1px solid #27272a;margin-bottom:24px;">
                <h2 style="font-size:16px;color:#fff;margin:0 0 8px 0;">Virtual Garage Specs</h2>
                <p style="font-size:13px;color:#a1a1aa;margin:0;">Vehicles logged: ${(user.garage && user.garage.length) || 0} • Followers: ${user.followersCount || 0}</p>
              </div>
              <p style="font-size:13px;color:#71717a;"><a href="https://revitup.today/?ref=${cleanUsername}" style="color:#ef4444;font-weight:bold;text-decoration:none;">View complete garage & build timeline on RevItUp →</a></p>
            </div>
          `;
        }
      } catch (err) {
        console.warn("Error fetching user for SEO:", err);
      }
    } else if (carId) {
      try {
        const car = await getFirestoreDocById('cars', carId);
        if (car) {
          const carName = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() || 'Custom Project Car';
          const stage = car.stage || 'Custom Build';
          const powerInfo = car.power ? `(${car.power} HP)` : '';
          title = `${carName} ${powerInfo} [${stage}] - Garage Build | RevItUp`;
          
          const modsSummary = car.mods ? `Modifications: ${car.mods.slice(0, 120)}` : 'Full build specs, modifications, and performance log on RevItUp.';
          description = `${carName} ${stage}. ${modsSummary}`;
          image = car.coverImage || image;
          ogType = 'article';
          keywords = `${car.make}, ${car.model}, car build, ${stage}, dyno horsepower, project car, RevItUp`;

          jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Vehicle',
            name: carName,
            manufacturer: car.make || 'Custom',
            model: car.model || 'Build',
            vehicleModelDate: car.year ? String(car.year) : undefined,
            image: image,
            description: description,
            url: `https://revitup.today/?car=${carId}`
          };

          noscriptContent = `
            <div style="background:#000;color:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:700px;margin:0 auto;">
              ${image ? `<img src="${image}" alt="${carName}" style="width:100%;border-radius:12px;margin-bottom:16px;max-height:450px;object-fit:cover;" />` : ''}
              <h1 style="font-size:26px;font-weight:900;color:#fff;margin-bottom:8px;">${carName}</h1>
              <p style="font-size:15px;color:#ef4444;font-weight:bold;margin-bottom:16px;">${stage} ${powerInfo ? `• ${powerInfo}` : ''} ${car.engine ? `• Engine: ${car.engine}` : ''}</p>
              ${car.mods ? `
                <div style="background:#18181b;padding:16px;border-radius:12px;border:1px solid #27272a;margin-bottom:20px;">
                  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#a1a1aa;margin:0 0 8px 0;">Modifications & Upgrades</h2>
                  <p style="font-size:14px;color:#e4e4e7;line-height:1.6;margin:0;">${car.mods}</p>
                </div>
              ` : ''}
              <p style="font-size:13px;color:#71717a;"><a href="https://revitup.today/?car=${carId}" style="color:#ef4444;font-weight:bold;text-decoration:none;">Explore dyno pulls & build timeline on RevItUp →</a></p>
            </div>
          `;
        }
      } catch (err) {
        console.warn("Error fetching car for SEO:", err);
      }
    }

    const safeTitle = title.replace(/"/g, '&quot;');
    const safeDesc = description.replace(/"/g, '&quot;');
    const safeKeywords = keywords.replace(/"/g, '&quot;');
    const safeImage = image.replace(/"/g, '&quot;');
    const safeUrl = canonicalUrl.replace(/"/g, '&quot;');

    let transformed = rawHtml;

    transformed = transformed.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
    transformed = transformed.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
    transformed = transformed.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/i, `<meta name="keywords" content="${safeKeywords}" />`);
    transformed = transformed.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);

    transformed = transformed.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
    transformed = transformed.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
    transformed = transformed.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i, `<meta property="og:image" content="${safeImage}" />`);
    transformed = transformed.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
    transformed = transformed.replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/i, `<meta property="og:type" content="${ogType}" />`);

    transformed = transformed.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
    transformed = transformed.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
    transformed = transformed.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${safeImage}" />`);

    const jsonLdString = JSON.stringify(jsonLd, null, 2);
    transformed = transformed.replace(
      /<script\s+type="application\/ld\+json"\s+id="revitup-seo-jsonld">[\s\S]*?<\/script>/i,
      `<script type="application/ld+json" id="revitup-seo-jsonld">\n${jsonLdString}\n    </script>`
    );

    transformed = transformed.replace(
      /<div id="root"([^>]*)><\/div>/i,
      `<div id="root"$1><noscript>${noscriptContent}</noscript></div>`
    );

    return transformed;
  } catch (error) {
    console.error("Error in generateDynamicHtml:", error);
    return rawHtml;
  }
}

async function startServer() {
  // Vite middleware for development
  let useVite = false;
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      useVite = true;
    } catch (err) {
      console.warn("Vite not found, falling back to static serving.");
    }
  }
  
  if (!useVite) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
      }
      try {
        const distIndex = path.join(distPath, 'index.html');
        const template = fs.existsSync(distIndex)
          ? fs.readFileSync(distIndex, 'utf-8')
          : fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        
        const html = await generateDynamicHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        console.error("Error generating SEO index HTML:", e);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
