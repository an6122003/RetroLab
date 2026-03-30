import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';

type ConfigTab = 'youtube' | 'ads';

// ── Well-known ad slot definitions ──
const AD_SLOT_DEFS: { id: string; label: string; page: string; size: string }[] = [
  // Homepage
  { id: 'home-after-ticker',      label: 'After Ticker',        page: 'Trang chủ',       size: 'leaderboard' },
  { id: 'home-sidebar',           label: 'Sidebar',             page: 'Trang chủ',       size: 'sidebar' },
  { id: 'home-before-video',      label: 'Before Video',        page: 'Trang chủ',       size: 'leaderboard' },
  { id: 'home-before-newsletter', label: 'Before Newsletter',   page: 'Trang chủ',       size: 'banner' },
  // Article
  { id: 'article-after-content',  label: 'After Article',       page: 'Bài viết',        size: 'leaderboard' },
  // Tin tức
  { id: 'tin-tuc-top',            label: 'Top Leaderboard',     page: 'Tin tức',          size: 'leaderboard' },
  { id: 'tin-tuc-mid',            label: 'Mid Leaderboard',     page: 'Tin tức',          size: 'leaderboard' },
  { id: 'tin-tuc-sidebar',        label: 'Sidebar',             page: 'Tin tức',          size: 'sidebar' },
  // AI
  { id: 'ai-top',                 label: 'Top Leaderboard',     page: 'AI',               size: 'leaderboard' },
  { id: 'ai-mid',                 label: 'Mid Leaderboard',     page: 'AI',               size: 'leaderboard' },
  { id: 'ai-sidebar',             label: 'Sidebar',             page: 'AI',               size: 'sidebar' },
  // Công Nghệ
  { id: 'cong-nghe-top',          label: 'Top Leaderboard',     page: 'Công Nghệ',       size: 'leaderboard' },
  { id: 'cong-nghe-mid',          label: 'Mid Leaderboard',     page: 'Công Nghệ',       size: 'leaderboard' },
  { id: 'cong-nghe-sidebar',      label: 'Sidebar',             page: 'Công Nghệ',       size: 'sidebar' },
  // IT
  { id: 'it-top',                 label: 'Top Leaderboard',     page: 'IT',               size: 'leaderboard' },
  { id: 'it-mid',                 label: 'Mid Leaderboard',     page: 'IT',               size: 'leaderboard' },
  { id: 'it-sidebar',             label: 'Sidebar',             page: 'IT',               size: 'sidebar' },
  // Game & Giả Lập
  { id: 'game-gia-lap-top',       label: 'Top Leaderboard',     page: 'Game & Giả Lập',  size: 'leaderboard' },
  { id: 'game-gia-lap-mid',       label: 'Mid Leaderboard',     page: 'Game & Giả Lập',  size: 'leaderboard' },
  { id: 'game-gia-lap-sidebar',   label: 'Sidebar',             page: 'Game & Giả Lập',  size: 'sidebar' },
];

interface AdSlot {
  enabled: boolean;
  type: 'affiliate' | 'network' | 'placeholder';
  size: string;
  imageUrl?: string;
  clickUrl?: string;
  alt?: string;
  code?: string;
}

interface AdsConfig {
  slots: Record<string, AdSlot>;
  globalHeadScripts?: string | null;
}

export default function ConfigPage() {
  const [tab, setTab] = useState<ConfigTab>('youtube');

  const headerContent = (
    <>
      <div className="flex items-center gap-12">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Site Config</h1>
        <nav className="flex gap-8">
          {([
            { key: 'youtube' as ConfigTab, label: 'YouTube' },
            { key: 'ads' as ConfigTab, label: 'Ads' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-medium pb-2 transition-all border-b-2 ${
                tab === t.key
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );

  const sidebar = (
    <div className="p-5">
      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-4">Settings</p>
      <nav className="space-y-1">
        {([
          { id: 'youtube' as ConfigTab, icon: 'smart_display', label: 'YouTube Channels' },
          { id: 'ads' as ConfigTab, icon: 'ad_units', label: 'Ads Management' },
        ]).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              tab === item.id
                ? 'bg-surface-container-lowest text-primary font-semibold border border-outline-variant/15'
                : 'text-on-surface-variant hover:bg-surface-container-lowest/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <AppShell header={headerContent} sidebar={sidebar}>
      <div className="p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {tab === 'youtube' && <YoutubeTab />}
          {tab === 'ads' && <AdsTab />}
        </div>
      </div>
    </AppShell>
  );
}


/* ════════════════════════════════════════════════════════════════
   ─── Ads Management Tab ───
   ════════════════════════════════════════════════════════════════ */
function AdsTab() {
  const [config, setConfig] = useState<AdsConfig>({ slots: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [filterPage, setFilterPage] = useState<string>('all');

  const getToken = async () => {
    const { supabase } = await import('../lib/supabase');
    return (await supabase.auth.getSession()).data.session?.access_token;
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/ads/');
      if (res.ok) setConfig(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, []);

  const saveSlot = async (slotId: string, slot: AdSlot) => {
    setSaving(true);
    try {
      const token = await getToken();
      await fetch(`/api/ads/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(slot),
      });
      setConfig(prev => ({ ...prev, slots: { ...prev.slots, [slotId]: slot } }));
      setEditSlot(null);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const saveGlobalScripts = async (code: string) => {
    setSaving(true);
    try {
      const token = await getToken();
      await fetch('/api/ads/global-scripts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code }),
      });
      setConfig(prev => ({ ...prev, globalHeadScripts: code }));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const pages = ['all', ...Array.from(new Set(AD_SLOT_DEFS.map(s => s.page)))];
  const filteredSlots = filterPage === 'all'
    ? AD_SLOT_DEFS
    : AD_SLOT_DEFS.filter(s => s.page === filterPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface">Ads Management</h2>
        <p className="text-on-surface-variant mt-2 text-lg">Configure ad slots across the website. Set affiliate banners, ad network codes, or hide slots.</p>
      </div>

      {/* ── Global Ad Scripts ── */}
      <GlobalScriptsSection
        value={config.globalHeadScripts || ''}
        onSave={saveGlobalScripts}
        saving={saving}
      />

      {/* ── Page Filter Pills ── */}
      <div className="flex gap-2 flex-wrap">
        {pages.map(p => (
          <button
            key={p}
            onClick={() => setFilterPage(p)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterPage === p
                ? 'bg-primary text-on-primary shadow-md'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {p === 'all' ? 'All Pages' : p}
          </button>
        ))}
      </div>

      {/* ── Slot Cards ── */}
      <div className="space-y-4">
        {filteredSlots.map(def => {
          const slot = config.slots[def.id] || { enabled: true, type: 'placeholder' as const, size: def.size };
          const isEditing = editSlot === def.id;

          return (
            <div key={def.id} className={`bg-surface-container-low border rounded-2xl overflow-hidden transition-all ${
              slot.enabled ? 'border-outline-variant/15' : 'border-outline-variant/10 opacity-60'
            }`}>
              {/* Slot Header */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    def.page === 'Homepage' ? 'bg-blue-500/10 text-blue-600' :
                    def.page === 'Article' ? 'bg-purple-500/10 text-purple-600' :
                    'bg-amber-500/10 text-amber-600'
                  }`}>{def.page}</span>
                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">{def.label}</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono">{def.id} · {def.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TypeBadge type={slot.type} />
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={() => saveSlot(def.id, { ...slot, enabled: !slot.enabled })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                  <button
                    onClick={() => setEditSlot(isEditing ? null : def.id)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">{isEditing ? 'close' : 'edit'}</span>
                  </button>
                </div>
              </div>

              {/* Slot Editor (expanded) */}
              {isEditing && (
                <SlotEditor
                  slot={slot}
                  defaultSize={def.size}
                  onSave={(s) => saveSlot(def.id, s)}
                  saving={saving}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── Type badge ─── */
function TypeBadge({ type }: { type: string }) {
  const styles = {
    affiliate: 'bg-emerald-500/10 text-emerald-600',
    network: 'bg-cyan-500/10 text-cyan-600',
    placeholder: 'bg-gray-500/10 text-gray-500',
  };
  const icons = { affiliate: 'link', network: 'code', placeholder: 'ad_units' };
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[type as keyof typeof styles] || styles.placeholder}`}>
      <span className="material-symbols-outlined text-[12px]">{icons[type as keyof typeof icons] || 'ad_units'}</span>
      {type}
    </span>
  );
}


/* ─── Slot Editor ─── */
function SlotEditor({ slot, defaultSize, onSave, saving }: {
  slot: AdSlot;
  defaultSize: string;
  onSave: (s: AdSlot) => void;
  saving: boolean;
}) {
  const [type, setType] = useState(slot.type);
  const [imageUrl, setImageUrl] = useState(slot.imageUrl || '');
  const [clickUrl, setClickUrl] = useState(slot.clickUrl || '');
  const [alt, setAlt] = useState(slot.alt || '');
  const [code, setCode] = useState(slot.code || '');

  const handleSave = () => {
    onSave({
      enabled: slot.enabled,
      type,
      size: defaultSize,
      ...(type === 'affiliate' ? { imageUrl, clickUrl, alt } : {}),
      ...(type === 'network' ? { code } : {}),
    });
  };

  return (
    <div className="px-6 pb-6 pt-2 border-t border-outline-variant/10 space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">Ad Type</label>
        <div className="flex gap-2">
          {(['placeholder', 'affiliate', 'network'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                type === t
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t === 'placeholder' ? '📋 Placeholder' : t === 'affiliate' ? '🔗 Affiliate' : '💻 Ad Network'}
            </button>
          ))}
        </div>
      </div>

      {/* Affiliate fields */}
      {type === 'affiliate' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Banner Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Click URL (Affiliate Link)</label>
            <input
              type="text"
              value={clickUrl}
              onChange={e => setClickUrl(e.target.value)}
              placeholder="https://shope.ee/your-affiliate-link"
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Alt Text</label>
            <input
              type="text"
              value={alt}
              onChange={e => setAlt(e.target.value)}
              placeholder="Shopee Flash Sale"
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {imageUrl && (
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Preview</p>
              <img src={imageUrl} alt={alt} className="max-h-24 rounded border border-outline-variant/15" />
            </div>
          )}
        </div>
      )}

      {/* Network fields */}
      {type === 'network' && (
        <div>
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Ad Code (HTML/JS)</label>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={'<ins class="adsbygoogle" ...></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'}
            rows={5}
            className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none resize-y"
          />
        </div>
      )}

      {/* Placeholder notice */}
      {type === 'placeholder' && (
        <div className="bg-surface-container rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">info</span>
          <p className="text-sm text-on-surface-variant">Shows the default "Advertise with us" banner. No configuration needed.</p>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {saving ? 'Saving...' : 'Save Slot'}
        </button>
      </div>
    </div>
  );
}


/* ─── Global Scripts Section ─── */
function GlobalScriptsSection({ value, onSave, saving }: { value: string; onSave: (v: string) => void; saving: boolean }) {
  const [code, setCode] = useState(value);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-cyan-600">code</span>
          <div className="text-left">
            <h3 className="font-semibold text-on-surface text-sm">Global Ad Scripts</h3>
            <p className="text-[10px] text-on-surface-variant">Google AdSense loader, ad network initialization scripts, etc.</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {expanded && (
        <div className="px-6 pb-6 space-y-3">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={'<!-- Paste your ad network initialization scripts here -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXX" crossorigin="anonymous"></script>'}
            rows={6}
            className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={() => onSave(code)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-sm hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-50 text-sm"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {saving ? 'Saving...' : 'Save Scripts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   ─── YouTube Config Tab ───
   ════════════════════════════════════════════════════════════════ */
function YoutubeTab() {
  const [channels, setChannels] = useState<{ id: string; url: string; name: string; avatarUrl: string }[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/youtube/');
      if (res.ok) setChannels(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchChannels(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { supabase } = await import('../lib/supabase');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/youtube/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add channel');
      }
      setUrl('');
      await fetchChannels();
    } catch (e: any) {
      setError(e.message || 'Failed to add channel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove channel?')) return;
    try {
      const { supabase } = await import('../lib/supabase');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await fetch(`/api/youtube/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchChannels();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface">YouTube Channels</h2>
        <p className="text-on-surface-variant mt-2 text-lg">Manage YouTube channels displayed on the website&apos;s video section.</p>
      </div>

      {/* Add Channel */}
      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Add Channel
        </h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="https://youtube.com/@ChannelName"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            {loading ? 'Adding...' : 'Add Channel'}
          </button>
        </form>
        {error && <p className="text-error text-sm mt-3">{error}</p>}
      </div>

      {/* Channel List */}
      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container border-b border-outline-variant/15">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Channel</th>
              <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Channel ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] text-outline/30 mb-2 block">smart_display</span>
                  No channels added yet
                </td>
              </tr>
            ) : (
              channels.map(c => (
                <tr key={c.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl && <img src={c.avatarUrl} className="w-10 h-10 rounded-full border border-outline-variant/15" alt="" />}
                      <div>
                        <span className="font-semibold text-on-surface">{c.name}</span>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate max-w-[200px]">{c.url}</a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant font-mono">{c.id}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
