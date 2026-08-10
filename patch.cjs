const fs = require('fs');
const content = fs.readFileSync('src/components/Feed.tsx', 'utf8');

const target = `            if (admobService.isNative()) {
              // On native devices, we display a banner ad using the admobService instead of an inline feed ad.
              return null;
            }
            return (
              <div key={item.id} className="w-full h-full snap-start snap-always bg-black flex items-center justify-center p-4">
                <AdSlot className="w-full max-w-sm" />
              </div>
            );`;

const replacement = `            // Cycle through different premium sponsors based on index
            const creatives = [
              {
                sponsor: 'Brembo Brakes',
                handle: 'bremboracing',
                avatar: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'CARBON-CERAMIC ROTORS',
                description: 'Engineered for absolute thermal stability. Stop from 100-0 MPH in world-record distance.',
                image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
                cta: 'UPGRADE CALIPERS',
                rating: '4.9',
                installs: '8.4M'
              },
              {
                sponsor: 'Michelin Tires',
                handle: 'michelinmotorsport',
                avatar: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'PILOT SPORT CUP 2 R',
                description: 'Extreme dry grip designed for hypercars. Shave seconds off your personal best lap times.',
                image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800',
                cta: 'FIND YOUR SIZE',
                rating: '4.8',
                installs: '14.2M'
              },
              {
                sponsor: 'Mobil 1 Racing',
                handle: 'mobil1motorsport',
                avatar: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=120&h=120',
                headline: 'SYNTHETIC 0W-40 FLUIDS',
                description: 'Advanced fluid friction protection under high boost. Keep your built motor safe.',
                image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
                cta: 'BOOST LUBRICITY',
                rating: '4.9',
                installs: '22.1M'
              }
            ];

            const adIndex = Math.floor(index / 2) % creatives.length;
            const creative = creatives[adIndex];

            // If we are on native, show the custom placeholder. Otherwise, show AdSense slot on Web.
            if (!admobService.isNative()) {
              return (
                <div key={item.id} className="w-full h-full snap-start snap-always bg-black flex items-center justify-center p-4">
                  <AdSlot className="w-full max-w-sm" />
                </div>
              );
            }

            return (
              <AdMobNativeFeedCard key={item.id} creative={creative} />
            );`;

const newContent = content.replace(target, replacement);

const appended = `
interface AdMobNativeFeedCardProps {
  creative: {
    sponsor: string;
    handle: string;
    avatar: string;
    headline: string;
    description: string;
    image: string;
    cta: string;
    rating: string;
    installs: string;
  };
}

export function AdMobNativeFeedCard({ creative }: AdMobNativeFeedCardProps) {
  const [clicked, setClicked] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCtaClick = () => {
    if (clicked || installing) return;
    setInstalling(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setInstalling(false);
          setClicked(true);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  return (
    <div className="h-full w-full snap-start snap-always relative bg-black font-sans overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={creative.image} 
          className="w-full h-full object-cover scale-102 transition-transform duration-700 brightness-90 contrast-[1.05]" 
          alt="" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full pt-[calc(env(safe-area-inset-top,24px)+52px)] pb-[calc(env(safe-area-inset-bottom,24px)+80px)] px-4">
        <div className="flex items-center justify-between w-full mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-zinc-900 flex-shrink-0 shadow-lg">
              <img src={creative.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-black uppercase tracking-tight shadow-black drop-shadow-md">{creative.sponsor}</span>
                <span className="bg-yellow-500 text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-lg">
                  <Sparkles size={8} className="fill-current" /> SPONSORED
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-wider drop-shadow-md">@{creative.handle} • Verified Partner</p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col justify-end mt-auto space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-black/45 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                {creative.installs} Tuners Upgraded
              </span>
              <div className="flex items-center gap-1 bg-black/45 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full text-[10px] font-black text-yellow-500">
                <Star size={10} fill="currentColor" /> {creative.rating}
              </div>
            </div>
            <h3 className="text-3xl font-black italic text-white tracking-tighter uppercase leading-none drop-shadow-lg">
              {creative.headline}
            </h3>
            <p className="text-sm text-zinc-200 font-medium leading-relaxed drop-shadow-md max-w-[90%]">
              {creative.description}
            </p>
          </div>

          <div className="w-full space-y-3 pb-4">
            <button 
              onClick={handleCtaClick}
              disabled={installing || clicked}
              className="w-full relative overflow-hidden h-14 bg-white text-black font-black uppercase italic tracking-widest text-sm rounded-2xl flex items-center justify-center transition-all active:scale-98 shadow-[0_12px_32px_rgba(255,255,255,0.15)] hover:bg-zinc-100"
            >
          {installing && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all duration-150"
              style={{ width: \`\${progress}%\` }}
            />
          )}

          <div className="relative z-10 flex items-center gap-2">
            {installing ? (
              <span>STAGING BUILD... {progress}%</span>
            ) : clicked ? (
              <span className="text-green-600 flex items-center gap-1.5 uppercase font-black">
                <Check size={14} className="stroke-[3]" /> INSTALLED SUCCESSFULLY
              </span>
            ) : (
              <span className="flex items-center gap-1.5 uppercase font-black">
                {creative.cta}
              </span>
            )}
          </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/Feed.tsx', newContent + appended);
console.log('done');
