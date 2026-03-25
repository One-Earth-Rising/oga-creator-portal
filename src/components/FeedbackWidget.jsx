import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  MessageSquarePlus, X, Bug, Lightbulb, Palette, FileText,
  Camera, Send, Check, AlertCircle, Loader2
} from 'lucide-react';

// ─── Category Config ────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: '#EF4444', emoji: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: '#F59E0B', emoji: '💡' },
  { value: 'ux', label: 'UX Feedback', icon: Palette, color: '#8B5CF6', emoji: '🎨' },
  { value: 'other', label: 'Other', icon: FileText, color: '#6B7280', emoji: '📝' },
];

// ─── Screenshot Helper ──────────────────────────────────────────────
async function uploadScreenshot(file) {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user?.email || !file) return null;

  try {
    const safeEmail = user.email.replace('@', '-at-').replace(/\./g, '-');
    const timestamp = Date.now();
    const ext = file.name?.split('.').pop() || 'png';
    const path = `${safeEmail}/${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from('feedback-screenshots')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('feedback-screenshots')
      .getPublicUrl(data.path);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('Screenshot upload error:', err);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════
// FEEDBACK WIDGET — Floating button + modal
// ═════════════════════════════════════════════════════════════════════

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form
  const resetForm = () => {
    setCategory('');
    setMessage('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setError(null);
    setSubmitted(false);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Delay reset so close animation isn't jarring
    setTimeout(resetForm, 300);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot must be under 10MB');
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError(null);
  };

  // Handle paste from clipboard
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setScreenshot(file);
          setScreenshotPreview(URL.createObjectURL(file));
        }
        break;
      }
    }
  };

  // Submit feedback
  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!message.trim()) {
      setError('Please describe the issue or suggestion');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload screenshot if present
      let screenshotUrl = null;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      }

      // Get current page context
      const pageContext = window.location.pathname + window.location.hash;

      // Get browser info
      const deviceInfo = `${navigator.userAgent.substring(0, 120)} | ${window.innerWidth}x${window.innerHeight}`;

      // Insert into feedback table
      const { error: insertError } = await supabase.from('feedback').insert({
        user_email: (await supabase.auth.getUser()).data?.user?.email,
        category,
        message: message.trim(),
        source: 'creator_portal',
        page_context: pageContext,
        screenshot_url: screenshotUrl,
        device_info: deviceInfo,
        extra_metadata: {
          portal: 'creator',
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError(`Failed to submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ─── Floating Button ─────────────────────────────────── */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#39FF14] text-black
          shadow-lg shadow-[#39FF14]/30 hover:shadow-[#39FF14]/50 hover:scale-110
          transition-all duration-200 flex items-center justify-center group"
        title="Send Feedback"
      >
        <MessageSquarePlus size={20} className="group-hover:rotate-12 transition-transform" />
      </button>

      {/* ─── Modal Overlay ───────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="bg-[#121212] border border-[#2C2C2C] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg
              max-h-[85vh] overflow-y-auto shadow-2xl animate-in"
            onClick={(e) => e.stopPropagation()}
            onPaste={handlePaste}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center">
                  <MessageSquarePlus size={16} className="text-[#39FF14]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider">Send Feedback</h3>
                  <p className="text-[10px] text-gray-500">Creator Portal</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* ─── Success State ──────────────────────────────── */}
            {submitted ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-[#39FF14]" />
                </div>
                <h4 className="text-white font-bold text-lg uppercase tracking-wider">Thank You!</h4>
                <p className="text-gray-400 text-sm mt-2">
                  Your feedback has been submitted and a ticket has been created.
                </p>
              </div>
            ) : (
              /* ─── Form ─────────────────────────────────────── */
              <div className="px-6 py-5 space-y-5">
                {/* Category Selector */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => { setCategory(cat.value); setError(null); }}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left
                            ${isSelected
                              ? 'border-[#39FF14] bg-[#39FF14]/5'
                              : 'border-[#2C2C2C] bg-[#0A0A0A] hover:border-gray-600'
                            }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            <Icon size={16} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wide
                            ${isSelected ? 'text-[#39FF14]' : 'text-gray-400'}`}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-2">
                    Description
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setError(null); }}
                    placeholder={
                      category === 'bug' ? 'Describe the bug: what happened, what you expected, steps to reproduce...' :
                      category === 'feature' ? 'Describe the feature you\'d like to see...' :
                      category === 'ux' ? 'What felt confusing, slow, or could be improved?' :
                      'Share your thoughts...'
                    }
                    rows={4}
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2C] rounded-lg px-4 py-3 text-sm text-white
                      placeholder-gray-600 resize-none focus:outline-none focus:border-[#39FF14]/40 transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">
                    Tip: Paste a screenshot from clipboard (Ctrl/Cmd+V)
                  </p>
                </div>

                {/* Screenshot */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-2">
                    Screenshot (optional)
                  </label>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full max-h-40 object-contain rounded-lg border border-[#2C2C2C] bg-[#0A0A0A]"
                      />
                      <button
                        onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0A0A0A]/80 border border-[#2C2C2C]
                          flex items-center justify-center text-gray-400 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#2C2C2C]
                        rounded-lg text-gray-600 hover:border-[#39FF14]/30 hover:text-gray-400 transition-colors"
                    >
                      <Camera size={16} />
                      <span className="text-xs">Attach screenshot or paste from clipboard</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !category || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg
                    bg-[#39FF14] text-black font-bold text-sm uppercase tracking-wider
                    hover:bg-[#39FF14]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {submitting ? 'Submitting...' : 'Send Feedback'}
                </button>

                {/* Page context indicator */}
                <p className="text-[9px] text-gray-700 text-center">
                  Page: {window.location.pathname} · Source: creator_portal
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline animation keyframe */}
      <style>{`
        .animate-in {
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
