const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

code = code.replace(
  "const shareUrl = \\`\\${window.location.origin}/?ref=\\${user.uid}\\`;",
  "const shareUrl = `${window.location.origin}/?ref=${user.uid}`;"
);

code = code.replace(
  "className={\\`relative \\${isCurrent ? 'opacity-100' : isPassed ? 'opacity-50' : 'opacity-30'}\\`}",
  "className={`relative ${isCurrent ? 'opacity-100' : isPassed ? 'opacity-50' : 'opacity-30'}`}"
);

code = code.replace(
  "style={{ width: \\`\\${progress}%\\` }}",
  "style={{ width: `${progress}%` }}"
);

code = code.replace(
  "className={\\`h-full rounded-full transition-all duration-1000 \\${isPassed ? 'bg-green-500' : 'bg-amber-500'}\\`}",
  "className={`h-full rounded-full transition-all duration-1000 ${isPassed ? 'bg-green-500' : 'bg-amber-500'}`}"
);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
