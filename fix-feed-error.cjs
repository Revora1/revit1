const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');

code = code.replace(
  /const \[loading, setLoading\] = useState\(true\);/,
  "const [loading, setLoading] = useState(true);\n  const [queryError, setQueryError] = useState<string | null>(null);"
);

code = code.replace(
  /handleFirestoreError\(error, OperationType\.LIST, 'posts'\);\n      setLoading\(false\);/,
  "setQueryError(error instanceof Error ? error.message : String(error));\n      setLoading(false);"
);

code = code.replace(
  /if \(posts\.length === 0\) \{/,
  "if (queryError) { return <div className=\"h-full flex flex-col items-center justify-center bg-black text-red-500 p-4 text-center\"><p className=\"font-bold mb-2\">Query Error:</p><p>{queryError}</p></div>; }\n  if (posts.length === 0) {"
);

fs.writeFileSync('src/components/Feed.tsx', code);
