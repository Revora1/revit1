const fs = require('fs');

let typesCode = fs.readFileSync('src/types.ts', 'utf8');

typesCode += `
export interface Group {
  id: string;
  name: string;
  nameLower: string;
  description: string;
  adminId: string;
  coverImage?: string;
  memberCount: number;
  createdAt: number;
}

export interface GroupMember {
  id?: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  createdAt: number;
}
`;

typesCode = typesCode.replace('createdAt: number;\n}', `createdAt: number;\n  groupId?: string;\n  groupStatus?: 'pending' | 'approved';\n}`);

fs.writeFileSync('src/types.ts', typesCode);
