import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Shield, Lock, Eye, Trash2, Download } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col">
      <div className="p-6 border-b border-zinc-900 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black italic tracking-tighter uppercase">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-white">
            <Shield size={20} className="text-zinc-500" />
            <h2 className="font-bold text-lg">Your Privacy at RevitUp</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            We value your trust. This policy explains how we collect, use, and protect your vehicle and build data.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">1. Data Collection</h3>
          <div className="space-y-3">
            <p className="text-sm text-white font-bold leading-relaxed">
              We collect information you provide directly to us:
            </p>
            <ul className="space-y-2 list-disc pl-5 text-sm text-zinc-400">
              <li>Account details (Username, Email)</li>
              <li>Vehicle specifications (Make, Model, Year)</li>
              <li>Build modifications and photos</li>
              <li>Engagement data (Likes, Comments)</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">2. Tracking & Cookies</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If you provide consent, we use Google Ad Manager and Analytics to show relevant automotive parts and measure app performance. You can revoke this at any time in settings.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">3. Your Rights (GDPR)</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-xs font-bold text-white mb-1">Right to Access</p>
              <p className="text-[10px] text-zinc-500">Download a copy of all your garage data.</p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-xs font-bold text-white mb-1">Right to Erasure</p>
              <p className="text-[10px] text-zinc-500">Permanently delete your account and all associated data.</p>
            </div>
          </div>
        </section>

        <div className="pt-8 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-600 font-medium uppercase text-center tracking-widest">
            Last Updated: May 16, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
