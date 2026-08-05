const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const targetHandle = `  const handleDownloadEntries = async (milestoneIndex?: number) => {`;
const replacementHandle = `  const handleDrawWinner = async (idx: number) => {
    if (giveawayTickets.length === 0) return alert('No tickets found');
    const winner = giveawayTickets[Math.floor(Math.random() * giveawayTickets.length)];
    const updatedMilestones = [...milestonesConfig];
    updatedMilestones[idx].winnerUsername = winner.username;
    updatedMilestones[idx].winnerId = winner.userId;
    updatedMilestones[idx].status = 'drawn';
    setMilestonesConfig(updatedMilestones);
    try {
      await setDoc(doc(db, 'giveaways', 'config'), { milestones: updatedMilestones }, { merge: true });
      alert(\`Winner drawn: \${winner.username}\`);
    } catch (e) {
      console.error(e);
      alert('Error saving winner');
    }
  };

  const handleDownloadEntries = async (milestoneIndex?: number) => {`;

code = code.replace(targetHandle, replacementHandle);

const targetRender = `                    <div className="pt-2">
                      <button
                        onClick={() => handleDownloadEntries(idx)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={14} /> Download Entries for Milestone {idx + 1}
                      </button>
                    </div>
                  </div>
                ))}
              </div>`;

const replacementRender = `                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => handleDownloadEntries(idx)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={14} /> Download Entries for Milestone {idx + 1}
                      </button>
                      
                      <button
                        onClick={() => handleDrawWinner(idx)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        Draw Winner
                      </button>
                      
                      {m.winnerUsername && (
                        <div className="text-center text-xs text-amber-500 font-bold mt-1">
                          Winner: {m.winnerUsername}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>`;

code = code.replace(targetRender, replacementRender);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
