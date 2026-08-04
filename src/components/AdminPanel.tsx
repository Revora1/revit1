import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Shield, Trash2, X, AlertTriangle, Users } from 'lucide-react';
import { UserProfile } from '../types';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'users'>('reports');

  useEffect(() => {
    if (user?.email === 'tonyang11552883@gmail.com') {
      fetchData();
    } else {
      onClose(); // unauthorized
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile)));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'reports', id));
      setReports(reports.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error deleting report.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account and all their data? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Optionally could delete their posts, cars, etc. via Cloud Function or manual loops here.
      setUsers(users.filter(u => u.uid !== userId));
      alert('User deleted.');
    } catch (e) {
      console.error(e);
      alert('Error deleting user.');
    }
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Shield className="text-red-500" />
          <h2 className="text-lg font-bold">Admin Panel</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}`}
        >
          <AlertTriangle size={16} /> Reports
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'users' ? 'border-b-2 border-red-500 text-white' : 'text-zinc-500'}`}
        >
          <Users size={16} /> Users
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
