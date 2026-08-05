const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const oldHandle = `  const handleDownloadEntries = async () => {
    // Generate CSV
    const csvHeader = 'username,userId,referrals\\n';
    const csvContent = giveawayTickets.map(t => \`\${t.username || 'Unknown'},\${t.userId},\${t.referralBonusCount || 0}\`).join('\\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'giveaway_entries.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

const newHandle = `  const handleDownloadEntries = async (milestoneIndex?: number) => {
    // Generate CSV
    const csvHeader = 'username,userId,referrals\\n';
    const csvContent = giveawayTickets.map(t => \`\${t.username || 'Unknown'},\${t.userId},\${t.referralBonusCount || 0}\`).join('\\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = typeof milestoneIndex === 'number' ? \`giveaway_entries_milestone_\${milestoneIndex + 1}.csv\` : 'giveaway_entries.csv';
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

code = code.replace(oldHandle, newHandle);

const oldRender = `                           <span className="text-sm text-zinc-300">Upload Image</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMilestoneImageUpload(idx, e)} />
                         </label>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
            {giveawayTickets.map(t => (`;

const newRender = `                           <span className="text-sm text-zinc-300">Upload Image</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMilestoneImageUpload(idx, e)} />
                         </label>
                       </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => handleDownloadEntries(idx)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={14} /> Download Entries for Milestone {idx + 1}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <h3 className="font-bold text-lg mb-2">Active Milestone Giveaway</h3>
              <p className="text-sm text-zinc-400 mb-2">Total Entries: {giveawayTickets.length}</p>
            </div>
            {giveawayTickets.map(t => (`;

code = code.replace(oldRender, newRender);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
