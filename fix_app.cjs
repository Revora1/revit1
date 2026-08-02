const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "const [targetPostId,\n      targetGroupId,\n    targetGroupId, setTargetPostId] = useState<string | null>(sharedPostId);\n  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);",
  "const [targetPostId, setTargetPostId] = useState<string | null>(sharedPostId);\n  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);"
);

fs.writeFileSync('src/App.tsx', code);
