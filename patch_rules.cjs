const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
`    match /posts/{postId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn() && (
        resource.data.authorId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes', 'likesCount', 'views', 'viewCount', 'sharesCount', 'loopsCount', 'commentsCount']) ||
        isAdmin()
      );
      allow delete: if isSignedIn() && (resource.data.authorId == request.auth.uid || isAdmin());
    }`,
`    match /posts/{postId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn() && (
        resource.data.authorId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes', 'likesCount', 'views', 'viewCount', 'sharesCount', 'loopsCount', 'commentsCount', 'groupStatus']) ||
        isAdmin() ||
        (resource.data.keys().hasAll(['groupId']) && get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.adminId == request.auth.uid)
      );
      allow delete: if isSignedIn() && (
        resource.data.authorId == request.auth.uid || 
        isAdmin() ||
        (resource.data.keys().hasAll(['groupId']) && get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.adminId == request.auth.uid)
      );
    }
    match /groups/{groupId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.adminId == request.auth.uid;
      allow update: if isSignedIn() && (resource.data.adminId == request.auth.uid || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['memberCount']));
      allow delete: if isAdmin() || (isSignedIn() && resource.data.adminId == request.auth.uid);
    }
    match /groupMembers/{memberId} {
      allow read, write: if isSignedIn();
    }`
);

fs.writeFileSync('firestore.rules', rules);
