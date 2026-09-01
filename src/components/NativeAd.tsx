import React, { useState } from 'react';
import { Sparkles, ExternalLink, ShieldCheck, Heart, Share2, ArrowRight } from 'lucide-react';
import { AdSlot } from './AdSlot';
import { shareContent } from '../lib/utils';

interface NativeAdProps {
  adUnitId?: string;
  estimatedHeight?: number;
}

const SPONSORS = [
  {
    id: 'sponsor_1',
    brandName: 'Apex Motorsport Exhausts',
    tagline: 'Titanium & Valved Performance Exhaust Systems',
    description: 'Precision engineered exhaust systems designed for maximum airflow, aggressive exhaust note, and dyno-proven horsepower gains.',
    badge: 'Official Sponsor',
    ctaText: 'Explore Performance Parts',
    category: 'Performance Exhausts',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=120&h=120&q=80',
    action: () => window.dispatchEvent(new CustomEvent('navigate-marketplace')),
  },
  {
    id: 'sponsor_2',
    brandName: 'GhostWorks Dyno & Tuning',
    tagline: 'Custom ECU Calibration & Dyno Diagnostics',
    description: 'Certified master tuners offering custom Stage 1 to Stage 3 ECU maps, boost management, and high-performance dyno testing.',
    badge: 'Verified Mechanic',
    ctaText: 'Book Dyno Service',
    category: 'ECU & Dyno Tuning',
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=120&h=120&q=80',
    action: () => window.dispatchEvent(new CustomEvent('navigate-service-board')),
  },
  {
    id: 'sponsor_3',
    brandName: 'BoostLab Precision Turbos',
    tagline: 'Billet Wheel Turbochargers & Intercoolers',
    description: 'Dual ceramic ball bearing turbochargers with CNC billet compressor wheels. Faster spool, lower temperatures, extreme boost capability.',
    badge: 'Featured Partner',
    ctaText: 'Browse Boost Upgrades',
    category: 'Forced Induction',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=120&h=120&q=80',
    action: () => window.dispatchEvent(new CustomEvent('navigate-marketplace')),
  },
  {
    id: 'sponsor_4',
    brandName: 'RevPro Coilovers & Aero',
    tagline: 'Track-Ready Adjustable Dampers & Splitters',
    description: '32-way dampening adjustable coilovers matched with dry carbon fiber aerodynamic splitters and wings for ultimate track grip.',
    badge: 'Verified Partner',
    ctaText: 'View Suspension Kits',
    category: 'Suspension & Aero',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=120&h=120&q=80',
    action: () => window.dispatchEvent(new CustomEvent('navigate-service-board')),
  }
];

export const NativeAd: React.FC<NativeAdProps> = () => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(148);
  const [sponsorIndex] = useState(() => Math.floor(Math.random() * SPONSORS.length));

  const sponsor = SPONSORS[sponsorIndex] || SPONSORS[0];

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => (liked ? prev - 1 : prev + 1));
  };

  const handleShare = () => {
    shareContent({
      title: `Check out ${sponsor.brandName} on RevitUp!`,
      text: `Discover premium automotive parts and tuning on RevitUp.`,
      url: window.location.origin
    });
  };

  return (
    <article className="h-full w-full relative bg-black snap-start snap-always flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
      {/* Background Graphic / Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={sponsor.imageUrl}
          alt={sponsor.brandName}
          className="w-full h-full object-cover brightness-[0.65] scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
      </div>

      {/* Main Content Box */}
      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center justify-center text-center">
        {/* Top Sponsored Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-black font-black text-[10px] tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] mb-4">
          <Sparkles size={12} className="fill-black" />
          <span>SPONSORED SPOTLIGHT</span>
        </div>

        {/* Sponsor Card */}
        <div className="w-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-left">
            <img
              src={sponsor.logoUrl}
              alt={sponsor.brandName}
              className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-black text-base truncate">{sponsor.brandName}</h3>
                <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
              </div>
              <span className="text-amber-400/90 text-[10px] font-black uppercase tracking-wider block">
                {sponsor.badge} • {sponsor.category}
              </span>
            </div>
          </div>

          <p className="text-zinc-300 text-xs sm:text-sm text-left leading-relaxed font-medium">
            {sponsor.description}
          </p>

          {/* Optional Embedded AdSense Slot */}
          <div className="overflow-hidden rounded-xl bg-black/40 border border-white/5 py-1">
            <AdSlot />
          </div>

          {/* CTA Button */}
          <button
            onClick={sponsor.action}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>{sponsor.ctaText}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Floating Action Buttons (Right Sidebar) */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-4">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 text-white group"
        >
          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${liked ? 'bg-red-500 text-white' : 'bg-black/60 text-white border border-white/10 group-hover:bg-zinc-800'}`}>
            <Heart size={20} className={liked ? 'fill-white' : ''} />
          </div>
          <span className="text-[10px] font-bold">{likeCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 text-white group"
        >
          <div className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 group-hover:bg-zinc-800 transition-all">
            <Share2 size={20} />
          </div>
          <span className="text-[10px] font-bold">Share</span>
        </button>

        <button
          onClick={sponsor.action}
          className="flex flex-col items-center gap-1 text-amber-400 group"
          title="Open Partner Hub"
        >
          <div className="p-3 bg-amber-500/20 backdrop-blur-md rounded-full text-amber-400 border border-amber-500/40 group-hover:bg-amber-500 group-hover:text-black transition-all">
            <ExternalLink size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider">Visit</span>
        </button>
      </div>
    </article>
  );
};

