const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const mechanicRule = `    match /mechanics/{shopId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
      allow delete: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
    }`;

if (!code.includes('match /mechanics/{shopId}')) {
  code = code.replace(
    '  }\n}',
    `${mechanicRule}\n  }\n}`
  );
  fs.writeFileSync('firestore.rules', code);
}
