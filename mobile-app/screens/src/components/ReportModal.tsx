import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'message' | 'story';
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or symbols' },
  { value: 'inappropriate', label: 'Inappropriate or adult content' },
  { value: 'violence', label: 'Violence or graphic content' },
  { value: 'other', label: 'Other / Inappropriate' },
];

export function ReportModal({ isOpen, onClose, targetId, targetType }: ReportModalProps) {
  const { reportContent } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reportContent(targetId, targetType, selectedReason, details);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedReason('');
        setDetails('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="relative w-full max-w-md overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-zinc-950">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-base font-semibold text-zinc-100">Report {targetType}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full mb-4">
                  <Check className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-zinc-100 mb-1">Thank You</h4>
                <p className="text-sm text-zinc-400 max-w-xs">
                  Your report has been submitted successfully. We will review it within 24 hours.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-xs text-zinc-400 leading-relaxed">
                  Help us keep our community safe and high-quality. Select the reason that best describes the issue with this {targetType}.
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Reason Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Why are you reporting this?
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => setSelectedReason(reason.value)}
                        className={`flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium transition-all border rounded-xl ${
                          selectedReason === reason.value
                            ? 'bg-red-500/5 text-red-400 border-red-500/40'
                            : 'bg-zinc-900/40 text-zinc-300 border-zinc-900 hover:bg-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <span>{reason.label}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedReason === reason.value ? 'border-red-500 bg-red-500' : 'border-zinc-700'
                        }`}>
                          {selectedReason === reason.value && <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                    placeholder="Provide context or specific details about the issue..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 bg-zinc-900/50 border border-zinc-850 rounded-xl focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none"
                  />
                  <div className="text-[10px] text-right text-zinc-500">
                    {details.length}/500 characters
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 py-3 text-sm font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-850 transition-colors rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedReason}
                    className="flex-1 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors rounded-xl font-semibold"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
