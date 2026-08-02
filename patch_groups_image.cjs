const fs = require('fs');

let fileCode = fs.readFileSync('src/components/GroupsView.tsx', 'utf8');

fileCode = fileCode.replace(
  "import { uploadImage } from '../lib/utils';",
  "import { storage } from '../lib/firebase';\nimport { ref, uploadBytes, getDownloadURL } from 'firebase/storage';"
);

fileCode = fileCode.replace(
  "const url = await uploadImage(groupImageFile, `groups/${user.uid}_${Date.now()}`);",
  `
        const storageRef = ref(storage, \`groups/\${user.uid}_\${Date.now()}\`);
        const snapshot = await uploadBytes(storageRef, groupImageFile);
        const url = await getDownloadURL(snapshot.ref);
  `
);

fs.writeFileSync('src/components/GroupsView.tsx', fileCode);
