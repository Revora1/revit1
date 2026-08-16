import React, { useState } from 'react';
import { 
  ChevronLeft, 
  BookOpen, 
  User, 
  Car, 
  Wrench, 
  Trophy, 
  MessageSquare, 
  Wifi, 
  ShieldCheck,
  ChevronRight,
  Flame,
  HelpCircle,
  Eye,
  Settings
} from 'lucide-react';

interface UserGuideProps {
  onBack?: () => void;
  hideHeader?: boolean;
}

type TabType = 'getting_started' | 'garage_builds' | 'dyno_tuning' | 'social_chat' | 'offline';

export function UserGuide({ onBack, hideHeader = false }: UserGuideProps) {
  const [activeTab, setActiveTab] = useState<TabType>('getting_started');

  const tabs = [
    { id: 'getting_started', label: 'Get Started', icon: User },
    { id: 'garage_builds', label: 'Virtual Garage', icon: Car },
    { id: 'dyno_tuning', label: 'Dyno & Tuning', icon: Flame },
    { id: 'social_chat', label: 'Community', icon: MessageSquare },
    { id: 'offline', label: 'Offline Mode', icon: Wifi },
  ];

  return (
    <div className={`w-full flex flex-col ${hideHeader ? '' : 'bg-black text-white min-h-screen'}`}>
      {!hideHeader && (
        <div className="p-6 border-b border-zinc-900 flex items-center gap-4 sticky top-0 bg-black/95 backdrop-blur z-10">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors" id="guide-back-button">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
              <BookOpen className="text-zinc-400" size={20} />
              RevItUp User Guide
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tester &amp; User Manual</p>
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col ${hideHeader ? 'p-0' : 'p-6 pb-24'} max-w-4xl mx-auto w-full space-y-6`}>
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-3xl border border-zinc-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-green-500" />
            Tested &amp; Verified App
          </div>
          <h2 className="text-2xl font-black italic tracking-tight uppercase">Welcome to the RevItUp Community</h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            RevItUp is a mobile-first digital social garage and performance logger for car builders, mechanics, and tuners. Add your vehicles, document modification timelines, share builds, and benchmark horsepower and 0-60 times.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-zinc-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold tracking-tight whitespace-nowrap transition-all shrink-0 ${
                  isActive 
                    ? 'bg-white text-black' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/40'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Pane */}
        <div className="flex-1 space-y-8 min-h-[400px]">
          {activeTab === 'getting_started' && (
            <div className="space-y-6 animate-fade-in">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <User className="text-zinc-400" size={20} />
                  <h3 className="font-bold text-lg">Account Creation &amp; Profile Setup</h3>
                </div>
                <div className="space-y-3 text-sm text-zinc-400 leading-relaxed font-medium">
                  <p>
                    Getting started on RevItUp takes just seconds. Register using your email address or authenticate with standard methods.
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>
                      <span className="text-white font-semibold">Usernames &amp; Bio:</span> Choose a unique handle (e.g. <span className="text-zinc-300 font-mono">@boost_junkie</span>) and write an automotive bio describing your project goals or favorite tuning styles.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Age Assurance (Safe Environment):</span> To keep our enthusiast community safe for all age groups, you are prompted to confirm your age.
                    </li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/60">
                <div className="flex items-center gap-3 text-white">
                  <ShieldCheck className="text-green-500" size={20} />
                  <h4 className="font-bold text-sm">Under-16 Safe Browsing Mode</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  If the Age Assurance check indicates you are under 16 years of age, RevItUp automatically toggles to a safe browser mode. Your profile will be safe, social feeds are tailored for safety, and direct chats are protected. You can search the public garage registry to view custom car builds for inspiration!
                </p>
              </section>
            </div>
          )}

          {activeTab === 'garage_builds' && (
            <div className="space-y-6 animate-fade-in">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <Car className="text-zinc-400" size={20} />
                  <h3 className="font-bold text-lg">Managing Your Virtual Garage</h3>
                </div>
                <div className="space-y-3 text-sm text-zinc-400 leading-relaxed font-medium">
                  <p>
                    Your Virtual Garage is the showcase center of your profile. It shows what you are currently building, driving, or tuning.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                        <Car size={14} className="text-zinc-400" /> Adding Vehicles
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Tap "Add Car" from your profile or garage screen. Input the Year, Make, Model, and Trim level, then optionally add an eye-catching photo.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                        <Wrench size={14} className="text-zinc-400" /> Build Log &amp; Modifications
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Keep track of exactly what mods have been installed! Enter engine parts, suspension upgrades, visual details, and aero kits.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <Wrench className="text-zinc-400" size={20} />
                  <h3 className="font-bold text-lg">Documenting Your Build Timeline</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  A timeline post is the perfect way to log a car modification update. Want to show the difference a new exhaust makes? Just create a new Post, tag your specific garage vehicle, and upload photos/videos of the transformation. Followers can comment and watch your build progress.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'dyno_tuning' && (
            <div className="space-y-6 animate-fade-in">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <Flame className="text-yellow-500 animate-pulse" size={20} />
                  <h3 className="font-bold text-lg">Logging Dyno Runs &amp; Tuning Metrics</h3>
                </div>
                <div className="space-y-3 text-sm text-zinc-400 leading-relaxed font-medium">
                  <p>
                    RevItUp features a powerful, interactive Dyno Board where tuners can log actual benchmark figures and prove their claims.
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>
                      <span className="text-white font-semibold">Horsepower &amp; Torque:</span> Log your maximum horsepower (HP) and torque (lb-ft) at the wheels or crank.
                    </li>
                    <li>
                      <span className="text-white font-semibold">0-60 MPH &amp; 1/4 Mile Drag Times:</span> Log precise acceleration performance metrics to compare against other community builds.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Dyno Sheets &amp; Slips:</span> Upload photographic evidence of your dyno graph or drag slip to verify your stats and earn a verified tuner standing.
                    </li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <Trophy className="text-yellow-500" size={20} />
                  <h3 className="font-bold text-lg">The Tuning Leaderboard</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  Think your build is the fastest? View the Dyno Board and filter by horsepower, engine setup, or weight-to-power ratio. Keep improving your tuning parameters and log a verified performance slip to climb the rankings to become a "Top Tuner".
                </p>
              </section>
            </div>
          )}

          {activeTab === 'social_chat' && (
            <div className="space-y-6 animate-fade-in">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <MessageSquare className="text-zinc-400" size={20} />
                  <h3 className="font-bold text-lg">Community Interaction &amp; Direct Messaging</h3>
                </div>
                <div className="space-y-3 text-sm text-zinc-400 leading-relaxed font-medium">
                  <p>
                    Socializing is the heartbeat of RevItUp. Chat with creators, collaborate on projects, and follow builds.
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>
                      <span className="text-white font-semibold">Interactive Feed:</span> Double tap to like builds, read and write comment threads, and share high-quality photos/videos.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Direct Message Chats:</span> Tap "Message" on any user's profile to open a real-time, low-latency private chat. Send project suggestions or arrange local car meets!
                    </li>
                    <li>
                      <span className="text-white font-semibold">Privacy, Blocking &amp; Reporting:</span> We support full moderation. Block users instantly if needed or report content that violates guidelines.
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'offline' && (
            <div className="space-y-6 animate-fade-in">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-white border-b border-zinc-900 pb-2">
                  <Wifi className="text-green-500 animate-pulse" size={20} />
                  <h3 className="font-bold text-lg">Progressive Offline App Shell</h3>
                </div>
                <div className="space-y-3 text-sm text-zinc-400 leading-relaxed font-medium">
                  <p>
                    Whether you are at a local racetrack, in an underground mechanic garage, or a remote car meet with no cellular network signal, RevItUp stays active.
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>
                      <span className="text-white font-semibold">Offline Caching:</span> The RevItUp Service Worker caches key app assets, style sheets, build scripts, icons, and fonts.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Saved Content:</span> Browsed posts, user garage registries, and basic layouts remain cached. If you disconnect, the app falls back seamlessly to offline local memory instead of displaying a connection error page.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Stale-While-Revalidate:</span> Static assets load instantly from the local cache first, while updating over the network in the background to ensure you always get the latest content as soon as service is restored.
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer/Contact Support section */}
        <div className="pt-8 border-t border-zinc-900 text-center space-y-4">
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
            Need further support? Contact us at:
          </p>
          <p className="text-sm text-zinc-300 font-mono tracking-tight select-all">
            tonyang11552883@gmail.com
          </p>
          <div className="text-[9px] text-zinc-700">
            RevItUp App &copy; {new Date().getFullYear()} - All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
