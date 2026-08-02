const fs = require('fs');

let fileCode = fs.readFileSync('src/components/UploadView.tsx', 'utf8');

fileCode = fileCode.replace(
`      const postDoc = await addDoc(collection(db, 'posts'), {
        ...formData,
        mediaUrls,
        mediaType: 'image',
        authorId: user.uid,
        likesCount: 0,
        commentsCount: 0,
        songId: selectedSong ? JSON.stringify(selectedSong) : '',
        createdAt: Date.now()
      });`,
`      const postData: any = {
        ...formData,
        mediaUrls,
        mediaType: 'image',
        authorId: user.uid,
        likesCount: 0,
        commentsCount: 0,
        songId: selectedSong ? JSON.stringify(selectedSong) : '',
        createdAt: Date.now()
      };
      
      if (groupId) {
        postData.groupId = groupId;
        postData.groupStatus = 'pending';
      }
      
      const postDoc = await addDoc(collection(db, 'posts'), postData);`
);

fs.writeFileSync('src/components/UploadView.tsx', fileCode);
