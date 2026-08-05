const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /<div className="flex-1 overflow-y-auto p-4 space-y-4">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\);[\s\S]*?}/;
const newJSX = `<div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-zinc-500 mt-10">Loading...</p>
        ) : activeTab === 'reports' ? (
          reports.length === 0 ? <p className="text-center text-zinc-500 mt-10">No reports found.</p> :
          reports.map(r => (
            <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-red-500">Target Type: {r.targetType}</p>
                  <p className="text-xs text-zinc-500">Target ID: {r.targetId}</p>
                </div>
                <button onClick={() => handleDeleteReport(r.id)} className="text-zinc-500 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm">Reason: {r.reason}</p>
              <p className="text-xs text-zinc-500 mt-2">Reporter: {r.reporterId}</p>
            </div>
          ))
        ) : activeTab === 'users' ? (
          users.length === 0 ? <p className="text-center text-zinc-500 mt-10">No users found.</p> :
          users.map(u => (
            <div key={u.uid} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-bold">{u.username}</p>
                <p className="text-xs text-zinc-500">UID: {u.uid}</p>
              </div>
              <button onClick={() => handleDeleteUser(u.uid)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : activeTab === 'giveaways' ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <h3 className="font-bold text-lg mb-2">Active Milestone Giveaway</h3>
              <p className="text-sm text-zinc-400 mb-4">Total Entries: {giveawayTickets.length}</p>
              <button
                onClick={handleDownloadEntries}
                className="w-full bg-white text-black py-2 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Entries CSV
              </button>
            </div>
            {giveawayTickets.map(t => (
              <div key={t.userId} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center text-sm">
                <span>{t.username || t.userId}</span>
                <span className="text-amber-500 font-bold text-xs">{t.referralBonusCount || 0} bonuses</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}`;

code = code.replace(regex, newJSX);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
