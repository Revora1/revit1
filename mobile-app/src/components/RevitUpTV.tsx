import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { RevitUpVideo } from '../types';
import { 
  Tv, 
  Camera, 
  Smartphone, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RefreshCw, 
  Sparkles, 
  ArrowLeft, 
  Video,
  Monitor,
  Flame
} from 'lucide-react';

interface RevitUpTVProps {
  onClose?: () => void;
  onOpenAdmin?: () => void;
}

export function RevitUpTV({ onClose, onOpenAdmin }: RevitUpTVProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<RevitUpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'landscape' | 'portrait' | 'featured'>('all');
  const [globalLayout, setGlobalLayout] = useState<'auto' | 'landscape' | 'portrait'>('auto');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as RevitUpVideo)));
    } catch (err) {
      console.error('Error fetching RevitUp TV videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(v => {
    if (activeTab === 'featured') return v.featured === true;
    if (activeTab === 'landscape') return v.orientation === 'landscape' || !v.orientation;
    if (activeTab === 'portrait') return v.orientation === 'portrait';
    return true;
  });

  const isAdmin = user?.email?.toLowerCase() === 'tonyang11552883@gmail.com';

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-red-600/20 text-red-500 border border-red-500/30">
                  <Tv size={16} />
                </span>
                <h1 className="text-lg sm:text-xl font-black italic tracking-wider text-white">
                  REVITUP <span className="text-red-500">TV</span>
                </h1>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                Cinema Widescreen Camera Footage & Mobile Reels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Layout Switcher */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setGlobalLayout('auto')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition ${
                  globalLayout === 'auto' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Auto-detect based on recording device"
              >
                Auto
              </button>
              <button
                onClick={() => setGlobalLayout('landscape')}
                className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition ${
                  globalLayout === 'landscape' ? 'bg-cyan-500 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Force Landscape (16:9 Camera view)"
              >
                <Monitor size={12} />
                <span className="hidden sm:inline">16:9 Camera</span>
              </button>
              <button
                onClick={() => setGlobalLayout('portrait')}
                className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition ${
                  globalLayout === 'portrait' ? 'bg-purple-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Force Portrait (9:16 Phone view)"
              >
                <Smartphone size={12} />
                <span className="hidden sm:inline">9:16 Phone</span>
              </button>
            </div>

            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white rounded-lg hover:border-zinc-500 transition"
              >
                <Video size={14} className="text-red-400" />
                <span>Upload Video</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-zinc-900/40 border-b border-zinc-800/60 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'all' 
                ? 'bg-zinc-100 text-black shadow' 
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            All Videos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('landscape')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'landscape' 
                ? 'bg-cyan-500 text-black shadow' 
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Camera size={13} />
            <span>Landscape (Camera Footage)</span>
          </button>
          <button
            onClick={() => setActiveTab('portrait')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'portrait' 
                ? 'bg-purple-500 text-white shadow' 
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Smartphone size={13} />
            <span>Portrait (Phone Clips)</span>
          </button>
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'featured' 
                ? 'bg-amber-500 text-black shadow' 
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Flame size={13} />
            <span>Featured</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-400 text-sm">Tuning into RevitUp TV streams...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-20 text-center bg-zinc-950 border border-zinc-850 rounded-2xl p-8 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <Tv size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No videos found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
              {activeTab === 'landscape' 
                ? 'No landscape camera videos uploaded yet. Upload DSLR / GoPro camera footage in Admin panel!'
                : activeTab === 'portrait'
                ? 'No portrait mobile clips uploaded yet.'
                : 'No community videos uploaded yet.'}
            </p>
            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition"
              >
                Upload First Video
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVideos.map((video) => (
              <WebVideoCard 
                key={video.id}
                video={video}
                globalLayout={globalLayout}
                isActive={activeVideoId === video.id}
                onPlay={() => setActiveVideoId(video.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WebVideoCard({
  video,
  globalLayout,
  isActive,
  onPlay
}: {
  video: RevitUpVideo;
  globalLayout: 'auto' | 'landscape' | 'portrait';
  isActive: boolean;
  onPlay: () => void;
}) {
  const [localOrientation, setLocalOrientation] = useState<'landscape' | 'portrait'>(
    video.orientation === 'portrait' ? 'portrait' : 'landscape'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const effectiveOrientation = globalLayout === 'auto' ? localOrientation : globalLayout;
  const isPortrait = effectiveOrientation === 'portrait';

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      onPlay();
      videoRef.current.play().catch(console.warn);
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const requestFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Header bar on card */}
      <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider flex items-center gap-1.5 ${
            isPortrait 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            {isPortrait ? <Smartphone size={10} /> : <Camera size={10} />}
            <span>{isPortrait ? '9:16 PORTRAIT (PHONE)' : '16:9 LANDSCAPE (CAMERA)'}</span>
          </span>

          {video.cameraModel && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {video.cameraModel}
            </span>
          )}
        </div>

        {/* Local aspect ratio toggle */}
        <button
          onClick={() => setLocalOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
          className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 px-2 py-1 rounded transition"
          title="Toggle between Camera 16:9 Landscape and Phone 9:16 Portrait box"
        >
          <RefreshCw size={10} />
          <span>{isPortrait ? '16:9 View' : '9:16 View'}</span>
        </button>
      </div>

      {/* Video Viewport */}
      <div 
        className={`relative w-full bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isPortrait ? 'aspect-[9/14] sm:aspect-[9/16] max-h-[560px]' : 'aspect-video max-h-[420px]'
        }`}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl || 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800'}
          className="w-full h-full object-contain"
          playsInline
          loop
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Center Play Button Overlay if paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl pl-1 hover:scale-105 active:scale-95 transition"
            aria-label="Play video"
          >
            <Play size={26} fill="black" />
          </button>
        )}

        {/* Controls Overlay Bottom Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-300 font-mono">
              {isPortrait ? '1080x1920' : '4K / 1080p'}
            </span>
            <button
              onClick={requestFullscreen}
              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
              title="Fullscreen Cinema Mode"
            >
              <Maximize size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Video Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-base text-white line-clamp-1">{video.title}</h3>
          {video.description && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{video.description}</p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <span>
            {video.createdAt?.toDate ? video.createdAt.toDate().toLocaleDateString() : 'Community Stream'}
          </span>
          <span className="text-zinc-400 font-semibold">
            RevitUp TV HD
          </span>
        </div>
      </div>
    </div>
  );
}
