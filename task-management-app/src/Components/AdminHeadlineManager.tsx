import React, { useState, useEffect } from 'react';
import { Settings, Send, Trash2, Loader2, Calendar, Star, Bell, Megaphone } from 'lucide-react';
import { headlineService } from '../Services/Headline.service';
import type { Headline } from '../Services/Headline.service';
import toast from 'react-hot-toast';

const AdminHeadlineManager: React.FC = () => {
  const [text, setText] = useState('');
  const [type, setType] = useState<Headline['type']>('update');
  const [expiresAt, setExpiresAt] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeHeadline, setActiveHeadline] = useState<Headline | null>(null);

  const fetchActive = async () => {
    const res = await headlineService.getActiveHeadline();
    if (res.success) {
      setActiveHeadline(res.data);
      if (res.data) {
        setText(res.data.text);
        setType(res.data.type);
        setExpiresAt(res.data.expiresAt ? new Date(res.data.expiresAt).toISOString().slice(0, 16) : '');
        setBgColor(res.data.bgColor || '');
        setTextColor(res.data.textColor || '');
      }
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setIsLoading(true);
    const res = await headlineService.createHeadline({ 
      text: text.trim(), 
      type, 
      expiresAt: expiresAt || undefined,
      bgColor: bgColor || undefined,
      textColor: textColor || undefined
    });
    setIsLoading(false);
    
    if (res.success) {
      toast.success('Headline updated successfully!');
      fetchActive();
    } else {
      toast.error(res.message || 'Failed to update headline');
    }
  };

  const handleDeactivate = async () => {
    setIsLoading(true);
    const res = await headlineService.deactivateHeadline();
    setIsLoading(false);
    
    if (res.success) {
      toast.success('Headline removed');
      setText('');
      setExpiresAt('');
      setBgColor('');
      setTextColor('');
      setActiveHeadline(null);
    } else {
      toast.error(res.message || 'Failed to remove headline');
    }
  };
  
  const getPreviewIcon = () => {
    switch (type) {
      case 'holiday': return <Calendar className="h-4 w-4" />;
      case 'festival': return <Star className="h-4 w-4" />;
      case 'meeting': return <Bell className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const getPreviewBgStyle = () => {
    if (bgColor) return { backgroundColor: bgColor };
    switch (type) {
      case 'holiday': return { backgroundImage: 'linear-gradient(to right, #16a34a, #047857)' };
      case 'festival': return { backgroundImage: 'linear-gradient(to right, #9333ea, #4338ca)' };
      case 'meeting': return { backgroundImage: 'linear-gradient(to right, #2563eb, #4338ca)' };
      case 'update': return { backgroundImage: 'linear-gradient(to right, #f97316, #dc2626)' };
      default: return { backgroundImage: 'linear-gradient(to right, #2563eb, #4338ca)' };
    }
  };

  const getPreviewTextStyle = () => {
    if (textColor) return { color: textColor };
    return { color: 'white' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manage Announcement Headline</h2>
          <p className="text-sm text-gray-500">Update the scrolling headline visible to all users</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview Section */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Live Preview</label>
          <div 
            className="relative overflow-hidden rounded-xl shadow-md py-3 border border-white/20 transition-all duration-300"
            style={getPreviewBgStyle()}
          >
            {/* Inline Style for Preview Marquee */}
            <style>{`
              @keyframes preview-marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .animate-preview-marquee {
                animation: preview-marquee 20s linear infinite;
              }
            `}</style>
            
            <div className="flex items-center gap-3">
              <div 
                className="flex-shrink-0 bg-white/20 p-1.5 ml-4 rounded-lg backdrop-blur-sm z-10"
                style={getPreviewTextStyle()}
              >
                {getPreviewIcon()}
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div className="whitespace-nowrap inline-flex animate-preview-marquee items-center">
                  <span 
                    className="flex items-center gap-8 pr-8 font-bold text-sm tracking-wide"
                    style={getPreviewTextStyle()}
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <span>{text || 'Headline text will appear here...'}</span>
                        <span className="opacity-40 select-none">•</span>
                      </React.Fragment>
                    ))}
                  </span>
                  <span 
                    className="flex items-center gap-8 pr-8 font-bold text-sm tracking-wide"
                    style={getPreviewTextStyle()}
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <span>{text || 'Headline text will appear here...'}</span>
                        <span className="opacity-40 select-none">•</span>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Headline Message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border-gray-200 border p-4 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[100px]"
            placeholder="Type holiday, festival, or meeting update here..."
            required
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['update', 'holiday', 'festival', 'meeting', 'other'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                type === t 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expiration (Optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border-gray-200 border p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor || '#2563eb'}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-full rounded-lg border-gray-200 border p-1 cursor-pointer"
                />
                {bgColor && (
                  <button 
                    type="button" 
                    onClick={() => setBgColor('')}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor || '#ffffff'}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-full rounded-lg border-gray-200 border p-1 cursor-pointer"
                />
                {textColor && (
                  <button 
                    type="button" 
                    onClick={() => setTextColor('')}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {activeHeadline ? 'Update Headline' : 'Post Headline'}
          </button>
          
          {activeHeadline && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isLoading}
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all flex-shrink-0"
              title="Remove headline"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminHeadlineManager;