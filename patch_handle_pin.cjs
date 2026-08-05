const fs = require('fs');
let code = fs.readFileSync('src/components/PostCard.tsx', 'utf8');

const targetHandleDelete = `  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, \`posts/\${post.id}\`);
    }
  };`;

const replacementHandlePin = `  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, \`posts/\${post.id}\`);
    }
  };

  const handlePin = async () => {
    if (user?.email?.toLowerCase() !== 'tonyang11552883@gmail.com') return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        isPinned: !post.isPinned
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`posts/\${post.id}\`);
    }
  };`;

code = code.replace(targetHandleDelete, replacementHandlePin);
fs.writeFileSync('src/components/PostCard.tsx', code);
