const fs = require('fs');
let code = fs.readFileSync('src/components/PostCard.tsx', 'utf8');
code = code.replace(
  'import { Heart, MessageCircle, Share2, User, Check, Trash2, Plus, X, Eye, Clock, Users, Music, Play, MoreVertical, Flag, UserX } from \'lucide-react\';',
  'import { Heart, MessageCircle, Share2, User, Check, Trash2, Plus, X, Eye, Clock, Users, Music, Play, MoreVertical, Flag, UserX, Pin, PinOff } from \'lucide-react\';'
);
fs.writeFileSync('src/components/PostCard.tsx', code);
