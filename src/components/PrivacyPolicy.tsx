import React from 'react';
import { ChevronLeft, Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
  hideHeader?: boolean;
}

export function PrivacyPolicy({ onBack, hideHeader = false }: PrivacyPolicyProps) {
  return (
    <div className={`w-full flex flex-col ${hideHeader ? '' : 'bg-black text-white min-h-full'}`}>
      {!hideHeader && (
        <div className="p-6 border-b border-zinc-900 flex items-center gap-4 sticky top-0 bg-black/95 backdrop-blur z-10">
          <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Privacy Policy</h1>
        </div>
      )}

      <div className={`flex-1 space-y-8 ${hideHeader ? 'p-0 max-h-[60vh] overflow-y-auto scrollbar-hide' : 'p-6 pb-24 overflow-y-auto'}`}>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Last Updated: July 17, 2026
        </p>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-white">
            <Shield size={20} className="text-zinc-500" />
            <h2 className="font-bold text-lg">Privacy Policy for RevitUp</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            Your privacy is important to us. This privacy policy describes how RevitUp (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) handles user authentication and data.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            1. Authentication and Personal Information
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-white font-semibold leading-relaxed">
              RevitUp uses secure Email/Password authentication for user registration and account management.
            </p>
            <ul className="space-y-2 list-disc pl-5 text-sm text-zinc-400">
              <li>
                <span className="text-white font-semibold">What is accessed:</span> We use your provided email address solely to create, log in, and manage your secure user account.
              </li>
              <li>
                <span className="text-white font-semibold">No direct collection:</span> We do not directly collect, request, store, or sell your email address or any personal contact details for marketing or promotional purposes.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            2. User-Created Content (Garage &amp; Build Data)
          </h3>
          <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
            <p>We store the information you actively input to personalize your app experience:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Your garage vehicle specifications (Make, Model, Year).</li>
              <li>Build modifications, dynamic tuner metrics, and any photos you upload.</li>
              <li>Community interactions (likes, comments, and posts on the feed).</li>
            </ul>
            <p className="pt-2">
              This data is stored securely using cloud database services and is only used to enable core app features.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            3. Ad Consent and Tracking
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If you provide explicit consent in the app settings, we may use Google Ad Manager or analytics providers to display relevant automotive content and measure performance. You can revoke this consent at any time through the in-app Settings menu.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            4. Your Rights (GDPR / CCPA)
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You have full ownership of your data. At any time within the app&apos;s Settings menu, you can:
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-xs font-bold text-white mb-1">Request Access</p>
              <p className="text-[10px] text-zinc-500">
                Access and download a copy of all your custom build details.
              </p>
            </div>
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-xs font-bold text-white mb-1">Request Erasure</p>
              <p className="text-[10px] text-zinc-500">
                Instantly and permanently delete your account, which automatically purges all your garage data, posts, and profile associations from our servers.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            5. Contact Us
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If you have any questions or concerns regarding your privacy, please contact the developer at:
          </p>
          <p className="text-sm text-white font-bold tracking-tight">
            tonyang11552883@gmail.com
          </p>
        </section>

        <div className="pt-8 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-600 font-medium uppercase text-center tracking-widest">
            Last Updated: July 17, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
