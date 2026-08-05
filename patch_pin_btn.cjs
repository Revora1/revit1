const fs = require('fs');
let code = fs.readFileSync('src/components/PostCard.tsx', 'utf8');

const targetBtn = `        {user?.uid === post.authorId && (
          <button 
            onClick={() => {
              if (showDeleteConfirm) {
                handleDelete();
              } else {
                setShowDeleteConfirm(true);
                setTimeout(() => setShowDeleteConfirm(false), 3000);
              }
            }}
            className={\`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-red-500/20 text-white shadow-lg flex-shrink-0 \${showDeleteConfirm ? 'bg-red-600' : 'bg-black/25 text-red-500 border border-white/10'}\`}
          >
            {showDeleteConfirm ? <X size={20} /> : <Trash2 size={20} />}
          </button>
        )}`;

const replacementBtn = `        {user?.uid === post.authorId && (
          <button 
            onClick={() => {
              if (showDeleteConfirm) {
                handleDelete();
              } else {
                setShowDeleteConfirm(true);
                setTimeout(() => setShowDeleteConfirm(false), 3000);
              }
            }}
            className={\`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-red-500/20 text-white shadow-lg flex-shrink-0 \${showDeleteConfirm ? 'bg-red-600' : 'bg-black/25 text-red-500 border border-white/10'}\`}
          >
            {showDeleteConfirm ? <X size={20} /> : <Trash2 size={20} />}
          </button>
        )}

        {user?.email?.toLowerCase() === 'tonyang11552883@gmail.com' && (
          <button 
            onClick={handlePin}
            className={\`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-95 transition-all group-hover:bg-amber-500/20 text-white shadow-lg flex-shrink-0 \${post.isPinned ? 'bg-amber-600' : 'bg-black/25 text-amber-500 border border-white/10'}\`}
          >
            {post.isPinned ? <PinOff size={20} className="text-white" /> : <Pin size={20} />}
          </button>
        )}`;

code = code.replace(targetBtn, replacementBtn);
fs.writeFileSync('src/components/PostCard.tsx', code);
