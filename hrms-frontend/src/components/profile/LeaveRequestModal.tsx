import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { X } from 'lucide-react';
import type { LeaveRequestPayload } from '@/types/hr';

interface LeaveRequestModalProps {
  onClose: () => void;
  onSubmit: (data: LeaveRequestPayload) => Promise<void>;
}

export default function LeaveRequestModal({ onClose, onSubmit }: LeaveRequestModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LeaveRequestPayload>({
    type: 'VACATION',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit leave request', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl w-full max-w-md shadow-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--surface-hover)]">
          <h3 className="text-lg font-bold">Request Leave</h3>
          <button onClick={onClose} className="p-2 app-muted hover:text-[var(--foreground)] transition-colors rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 app-muted">Leave Type</label>
            <select
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="VACATION">Vacation</option>
              <option value="SICK">Sick Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
              <option value="MATERNITY">Maternity/Paternity</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 app-muted">Start Date</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 app-muted">End Date</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 app-muted">Reason</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please describe the reason for your leave..."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
