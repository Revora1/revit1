import React from 'react';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';

interface SupportViewProps {
  onBack: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-8 sticky top-0 bg-black/90 pb-4 pt-2 z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 mr-2 hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-2xl font-black italic tracking-tighter uppercase">Support</h1>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-red-500">Contact Us</h2>
          <p className="text-zinc-300 mb-6 leading-relaxed">
            Need help with RevItUp? Have feedback or feature requests? We're here to help. Reach out to our support team using the contact information below.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <Mail className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Email Support</h3>
                <a href="mailto:tonyang11552883@gmail.com" className="text-blue-400 hover:underline break-all">
                  tonyang11552883@gmail.com
                </a>
                <p className="text-xs text-zinc-500 mt-1">We aim to respond to all inquiries within 24-48 hours.</p>
              </div>
            </div>
            
            {/* Apple sometimes requires a physical address and phone number on the support page for some regions/categories, 
                but email is often sufficient for standard apps. Leaving placeholders just in case they need to add them. */}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-red-500">FAQ & Guidelines</h2>
          <div className="space-y-3">
            <details className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group">
              <summary className="p-4 font-bold cursor-pointer hover:bg-zinc-800/50 list-none flex justify-between items-center">
                How do I report inappropriate content?
                <span className="text-red-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-zinc-400 text-sm">
                You can report any post or user by clicking the three-dots menu (•••) on a post or profile and selecting "Report". Our moderation team reviews all reports within 24 hours.
              </div>
            </details>

            <details className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group">
              <summary className="p-4 font-bold cursor-pointer hover:bg-zinc-800/50 list-none flex justify-between items-center">
                How do I block another user?
                <span className="text-red-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-zinc-400 text-sm">
                To block a user, navigate to their profile, tap the three-dots menu (•••) in the top right, and select "Block User". You will no longer see their content, and they won't be able to interact with yours.
              </div>
            </details>
            
            <details className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group">
              <summary className="p-4 font-bold cursor-pointer hover:bg-zinc-800/50 list-none flex justify-between items-center">
                How do I delete my account?
                <span className="text-red-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-zinc-400 text-sm">
                You can request account deletion by navigating to Settings &gt; Privacy &gt; Delete Account. Alternatively, email us at tonyang11552883@gmail.com with your username to request data deletion.
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
};
