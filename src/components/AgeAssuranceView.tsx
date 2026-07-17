import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronRight } from 'lucide-react';

export function AgeAssuranceView() {
  const { user } = useAuth();
  const [birthdate, setBirthdate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdate) {
      setError('Please enter a valid birthdate.');
      return;
    }
    
    // Validate age
    const dob = new Date(birthdate);
    if (isNaN(dob.getTime())) {
      setError('Invalid date.');
      return;
    }

    setLoading(true);
    try {
      const profileRef = doc(db, 'users', user!.uid);
      await setDoc(profileRef, { birthdate }, { merge: true });
      // The onSnapshot in AuthContext will automatically update the profile state
    } catch (err: any) {
      console.error(err);
      setError(`Failed to update profile: ${err.message || err}`);
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-zinc-900 rounded-full blur-[100px] -z-10 opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 w-full max-w-sm"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter italic">AGE VERIFICATION</h1>
          <p className="text-zinc-400 font-medium text-sm">Please provide your date of birth to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1 text-left">
            <label className="text-xs text-zinc-400 font-bold ml-1 uppercase">Date of Birth</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500"
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'SAVING...' : 'CONTINUE'}
            <ChevronRight size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
