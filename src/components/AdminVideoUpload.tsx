import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, Video, X, ChevronRight } from 'lucide-react';

export function AdminVideoUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hasPreRollAd: false,
    hasMidRollAd: false
  });

  if (user?.email?.toLowerCase() !== 'tonyang11552883@gmail.com') {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    
    setLoading(true);
    try {
      const storageRef = ref(storage, `admin_videos/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const videoUrl = await getDownloadURL(snapshot.ref);
      
      await addDoc(collection(db, 'admin_videos'), {
        ...formData,
        videoUrl,
        authorId: user.uid,
        createdAt: Date.now()
      });
      
      setFormData({
        title: '',
        description: '',
        hasPreRollAd: false,
        hasMidRollAd: false
      });
      removeFile();
      alert('Admin video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading admin video:', error);
      alert('Failed to upload video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 my-4">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Video size={20} className="text-amber-500" /> 
        Admin Video Upload
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload */}
        <div>
          {preview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <video src={preview} className="w-full h-full object-contain" controls />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video bg-black rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <Upload size={32} className="text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Select Video</p>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
            required
          />
          <textarea
            placeholder="Description..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none min-h-[80px]"
          />
        </div>

        {/* Ad Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData({...formData, hasPreRollAd: !formData.hasPreRollAd})}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${formData.hasPreRollAd ? 'bg-amber-500 border-amber-500 text-black' : 'bg-black border-zinc-800 text-zinc-400'}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Pre-roll Ad</span>
            <span className="text-[8px] font-bold uppercase">GAM / AdMob</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, hasMidRollAd: !formData.hasMidRollAd})}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${formData.hasMidRollAd ? 'bg-amber-500 border-amber-500 text-black' : 'bg-black border-zinc-800 text-zinc-400'}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Mid-roll Ad</span>
            <span className="text-[8px] font-bold uppercase">GAM / AdMob</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !file || !formData.title}
          className="w-full bg-white text-black py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'UPLOADING...' : 'UPLOAD ADMIN VIDEO'}
        </button>
      </form>
    </div>
  );
}
