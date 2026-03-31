import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  GripVertical, Swords, QrCode, MapPin, Gamepad2, ArrowLeftRight,
  HandHelping, LayoutGrid, Wrench, Trophy, Star, Gift, Clock,
  Eye, EyeOff, AlertCircle, Check, X, MoveUp, MoveDown, Sparkles, Copy,
  Image, Link, Megaphone, BookOpen, HelpCircle, Table, BarChart3,
  Zap, Users, Info, ShoppingBag, Store, ScanLine, LockOpen, Camera, Pen,
  FileDown
} from 'lucide-react';

// ─── Task Type Registry ─────────────────────────────────────────────
const TASK_TYPES = {
  acquire_character: {
    label: 'Acquire Character',
    icon: Swords,
    description: 'Own this OGA character',
    color: '#39FF14',
    needsCharacter: true,
  },
  irl_autograph: {
    label: 'IRL Autograph',
    icon: Star,
    description: 'Get autographed by an approved signer',
    color: '#FFD700',
    needsValue: true,
    valuePlaceholder: 'Signer name or event',
  },
  irl_location_verify: {
    label: 'IRL Location Verify',
    icon: MapPin,
    description: 'Get scanned at an event location',
    color: '#00BFFF',
    needsValue: true,
    valuePlaceholder: 'Event name',
  },
  play_in_game: {
    label: 'Play in Game',
    icon: Gamepad2,
    description: 'Use character in a specific game',
    color: '#FF6B6B',
    needsGame: true,
  },
  trade: {
    label: 'Trade',
    icon: ArrowLeftRight,
    description: 'Complete trades involving this character',
    color: '#C084FC',
    needsCount: true,
  },
  lend: {
    label: 'Lend',
    icon: HandHelping,
    description: 'Lend this character to friends',
    color: '#F97316',
    needsCount: true,
  },
  collect_set: {
    label: 'Collect Set',
    icon: LayoutGrid,
    description: 'Own all characters in the IP collection',
    color: '#EC4899',
  },
  custom: {
    label: 'Custom',
    icon: Wrench,
    description: 'Free-form task with manual trigger',
    color: '#94A3B8',
    needsValue: true,
    valuePlaceholder: 'Completion criteria',
  },
};

// ─── Pass Type Options ──────────────────────────────────────────────
const PASS_TYPES = [
  { value: 'brand_campaign', label: 'Brand Campaign' },
  { value: 'character_pass', label: 'Character Pass' },
  { value: 'event_pass', label: 'Event Pass' },
  { value: 'seasonal', label: 'Seasonal' },
];

// ─── CTA Type Options ───────────────────────────────────────────────
const CTA_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'enter_code', label: 'Enter Code' },
  { value: 'scan_qr', label: 'Scan QR Code' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'external_link', label: 'External Link' },
];

// ─── Icon Options (Material icon names → lucide preview) ────────────
const ICON_OPTIONS = [
  { value: 'qr_code', label: 'QR Code', preview: QrCode },
  { value: 'handshake', label: 'Handshake', preview: HandHelping },
  { value: 'swap_horiz', label: 'Trade', preview: ArrowLeftRight },
  { value: 'sports_esports', label: 'Gaming', preview: Gamepad2 },
  { value: 'location_on', label: 'Location', preview: MapPin },
  { value: 'star', label: 'Star / Autograph', preview: Star },
  { value: 'grid_view', label: 'Collection', preview: LayoutGrid },
  { value: 'shopping_bag', label: 'Shopping', preview: ShoppingBag },
  { value: 'storefront', label: 'Store', preview: Store },
  { value: 'qr_code_scanner', label: 'Scanner', preview: ScanLine },
  { value: 'lock_open', label: 'Unlock', preview: LockOpen },
  { value: 'emoji_events', label: 'Trophy', preview: Trophy },
  { value: 'group', label: 'Community', preview: Users },
  { value: 'bolt', label: 'Lightning', preview: Zap },
  { value: 'help_outline', label: 'Help', preview: HelpCircle },
  { value: 'info', label: 'Info', preview: Info },
  { value: 'draw', label: 'Draw / Sign', preview: Pen },
  { value: 'camera_alt', label: 'Camera', preview: Camera },
];

// ─── Helper: Generate temp ID for new items ─────────────────────────
const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Toast Component ────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl border transition-all
      ${type === 'success' ? 'bg-[#0a1f0a] border-[#39FF14]/30 text-[#39FF14]' : ''}
      ${type === 'error' ? 'bg-[#1f0a0a] border-red-500/30 text-red-400' : ''}
      ${type === 'info' ? 'bg-[#0a0a1f] border-blue-500/30 text-blue-400' : ''}
    `}>
      {type === 'success' && <Check size={16} />}
      {type === 'error' && <AlertCircle size={16} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true, count, badge, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="oga-card mb-4 group/section">
      <div className="flex items-center">
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col gap-0.5 pl-3 opacity-0 group-hover/section:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
              disabled={isFirst}
              className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
            >
              <MoveUp size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
              disabled={isLast}
              className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
            >
              <MoveDown size={12} />
            </button>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={18} className="text-[#39FF14]" />}
            <span className="text-white font-bold text-sm uppercase tracking-wider">{title}</span>
            {count !== undefined && (
              <span className="text-xs bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded-full font-medium">
                {count}
              </span>
            )}
            {badge && (
              <span className="text-xs bg-[#39FF14]/20 text-[#39FF14] px-2 py-0.5 rounded font-bold uppercase">
                {badge}
              </span>
            )}
          </div>
          {open ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>
      </div>
      {open && <div className="px-5 pb-5 border-t border-[#2C2C2C]">{children}</div>}
    </div>
  );
}

// ─── Input Components ───────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="oga-label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`oga-input ${className}`}
    />
  );
}

function NumberInput({ value, onChange, min = 0, max, className = '' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      min={min}
      max={max}
      className={`oga-input w-28 ${className}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="oga-input resize-none"
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="oga-select">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#39FF14]' : 'bg-[#2C2C2C]'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-md
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
}

// ─── Image Uploader ─────────────────────────────────────────────────
function ImageUploader({ value, onChange, bucket = 'characters', pathPrefix = 'portal-pass', label, returnFullUrl = true }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/${bucket}/${path}`;
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const resultPath = returnFullUrl
        ? `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/${bucket}/${data.path}`
        : data.path;

      onChange(resultPath);
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const previewUrl = resolveUrl(value);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer
          ${dragOver ? 'border-[#39FF14] bg-[#39FF14]/5' : 'border-[#2C2C2C] hover:border-[#39FF14]/40'}
          ${previewUrl ? 'p-2' : 'p-6'}`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-6 h-6 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Uploading...</span>
          </div>
        ) : previewUrl ? (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg border border-[#2C2C2C] bg-[#121212] overflow-hidden flex-shrink-0">
              <img
                src={previewUrl}
                alt={label || 'Preview'}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = ''; e.target.alt = '!'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Drop new image to replace</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-gray-600 hover:text-red-400 p-1 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#2C2C2C] flex items-center justify-center">
              <Plus size={18} className="text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Drop image here or click to browse</p>
              <p className="text-[10px] text-gray-600 mt-0.5">PNG, JPG, WebP · Max 5MB</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Task Type Palette ──────────────────────────────────────────────
function TaskTypePalette({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#121212] border border-[#2C2C2C] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg uppercase tracking-wider">Add Task</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(TASK_TYPES).map(([key, type]) => {
            const Icon = type.icon;
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#2C2C2C] bg-[#0A0A0A]
                  hover:border-[#39FF14]/50 hover:bg-[#39FF14]/5 transition-all group text-center"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                  style={{ backgroundColor: `${type.color}15`, color: type.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wide">{type.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{type.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────
function TaskCard({ task, index, total, characters, games, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(task._isNew || false);
  const type = TASK_TYPES[task.task_type] || TASK_TYPES.custom;
  const Icon = type.icon;

  const update = (field, value) => onChange({ ...task, [field]: value });

  return (
    <div className="border border-[#2C2C2C] rounded-lg bg-[#0A0A0A] overflow-hidden group">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <MoveUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <MoveDown size={14} />
          </button>
        </div>

        {/* Order badge */}
        <span className="text-xs text-gray-600 font-mono w-5 text-center">{index + 1}</span>

        {/* Type icon + badge */}
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${type.color}15`, color: type.color }}
        >
          <Icon size={14} />
        </div>

        {/* Title */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-white truncate hover:text-[#39FF14] transition-colors"
        >
          {task.title || 'Untitled Task'}
        </button>

        {/* XP badge */}
        <span className="text-xs font-bold text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded whitespace-nowrap">
          {task.xp_reward} XP
        </span>

        {/* Level req badge */}
        {task.level_requirement > 0 && (
          <span className="text-xs text-gray-400 bg-[#2C2C2C] px-2 py-0.5 rounded whitespace-nowrap">
            Lv.{task.level_requirement}
          </span>
        )}

        {/* Expand/collapse */}
        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#2C2C2C] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title">
              <TextInput value={task.title} onChange={(v) => update('title', v)} placeholder="Task title" />
            </Field>
            <Field label="Task Type">
              <Select
                value={task.task_type}
                onChange={(v) => update('task_type', v)}
                options={Object.entries(TASK_TYPES).map(([k, t]) => ({ value: k, label: t.label }))}
              />
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={task.description} onChange={(v) => update('description', v)} placeholder="Describe what the player needs to do" rows={2} />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="XP Reward">
              <NumberInput value={task.xp_reward} onChange={(v) => update('xp_reward', v)} min={0} />
            </Field>
            <Field label="Level Required">
              <NumberInput value={task.level_requirement} onChange={(v) => update('level_requirement', v)} min={0} />
            </Field>
            <Field label="Required Count">
              <NumberInput value={task.required_count} onChange={(v) => update('required_count', v)} min={1} />
            </Field>
            <Field label="Order Index">
              <NumberInput value={task.order_index} onChange={(v) => update('order_index', v)} min={0} />
            </Field>
          </div>

          {/* Conditional fields based on task type */}
          {type.needsCharacter && (
            <Field label="Target Character">
              <Select
                value={task.target_character_id}
                onChange={(v) => update('target_character_id', v)}
                placeholder="Select character..."
                options={characters.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
          )}

          {type.needsGame && (
            <Field label="Target Game">
              <Select
                value={task.target_game_id}
                onChange={(v) => update('target_game_id', v || null)}
                placeholder="Select game..."
                options={games.map((g) => ({ value: g.id, label: g.name }))}
              />
            </Field>
          )}

          {type.needsValue && (
            <Field label="Target Value" hint="Custom criteria or reference value">
              <TextInput
                value={task.target_value}
                onChange={(v) => update('target_value', v)}
                placeholder={type.valuePlaceholder || 'Enter value'}
              />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reward Card ────────────────────────────────────────────────────
function RewardCard({ reward, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(reward._isNew || false);

  const update = (field, value) => onChange({ ...reward, [field]: value });

  return (
    <div className="border border-[#2C2C2C] rounded-lg bg-[#0A0A0A] overflow-hidden group">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded flex items-center justify-center bg-[#FFD700]/10 text-[#FFD700] flex-shrink-0">
          <Gift size={14} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-white truncate hover:text-[#39FF14] transition-colors"
        >
          {reward.name || 'Untitled Reward'}
        </button>

        <span className="text-xs text-gray-400 bg-[#2C2C2C] px-2 py-0.5 rounded whitespace-nowrap">
          Lv.{reward.level_required}
        </span>

        {reward.is_unlocked && (
          <span className="text-xs text-[#39FF14] font-bold">UNLOCKED</span>
        )}

        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#2C2C2C] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Reward Name">
              <TextInput value={reward.name} onChange={(v) => update('name', v)} placeholder="e.g., Golden Headband" />
            </Field>
            <Field label="Level Required">
              <NumberInput value={reward.level_required} onChange={(v) => update('level_required', v)} min={1} />
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={reward.description} onChange={(v) => update('description', v)} placeholder="Reward description" rows={2} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Reward Image">
              <ImageUploader
                value={reward.image}
                onChange={(v) => update('image', v)}
                pathPrefix="pass-rewards"
                returnFullUrl={false}
                label={reward.name || 'Reward'}
              />
            </Field>
            <Field label="Sort Order">
              <NumberInput value={reward.sort_order} onChange={(v) => update('sort_order', v)} min={0} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Promo Block Card (JSONB editor for promo_sections) ─────────────
function PromoBlockCard({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(block._isNew || false);

  const update = (field, value) => {
    const updated = { ...block, [field]: value };
    delete updated._isNew;
    onChange(updated);
  };

  const updateButton = (btnIndex, field, value) => {
    const buttons = [...(block.buttons || [])];
    buttons[btnIndex] = { ...buttons[btnIndex], [field]: value };
    update('buttons', buttons);
  };

  const addButton = () => {
    const buttons = [...(block.buttons || []), { label: '', url: '', style: 'primary' }];
    update('buttons', buttons);
  };

  const removeButton = (btnIndex) => {
    const buttons = (block.buttons || []).filter((_, i) => i !== btnIndex);
    update('buttons', buttons);
  };

  return (
    <div className="border border-[#2C2C2C] rounded-lg bg-[#0A0A0A] overflow-hidden group">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-600 hover:text-[#C084FC] disabled:opacity-20 disabled:cursor-not-allowed"><MoveUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-600 hover:text-[#C084FC] disabled:opacity-20 disabled:cursor-not-allowed"><MoveDown size={14} /></button>
        </div>
        <div className="w-7 h-7 rounded flex items-center justify-center bg-[#C084FC]/10 text-[#C084FC] flex-shrink-0">
          <Megaphone size={14} />
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-white truncate hover:text-[#39FF14] transition-colors"
        >
          {block.title || `Promo Block ${index + 1}`}
        </button>
        {block.badge && (
          <span className="text-xs text-[#C084FC] bg-[#C084FC]/10 px-2 py-0.5 rounded font-bold uppercase">
            {block.badge}
          </span>
        )}
        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#2C2C2C] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title">
              <TextInput value={block.title} onChange={(v) => update('title', v)} placeholder="e.g., Find FBS Near You" />
            </Field>
            <Field label="Badge" hint="Short label shown above title">
              <TextInput value={block.badge} onChange={(v) => update('badge', v)} placeholder="e.g., STORE LOCATOR" />
            </Field>
          </div>
          <Field label="Highlight" hint="Bold callout line">
            <TextInput value={block.highlight} onChange={(v) => update('highlight', v)} placeholder="e.g., Available at Walmart, Target, and more" />
          </Field>
          <Field label="Body">
            <TextArea value={block.body} onChange={(v) => update('body', v)} placeholder="Descriptive body text" rows={3} />
          </Field>

          {/* Buttons sub-editor */}
          <div className="border-t border-[#2C2C2C] pt-3 mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">Buttons</p>
            <div className="space-y-2">
              {(block.buttons || []).map((btn, bi) => (
                <div key={bi} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={btn.label || ''}
                    onChange={(e) => updateButton(bi, 'label', e.target.value)}
                    placeholder="Label"
                    className="oga-input flex-1"
                  />
                  <input
                    type="text"
                    value={btn.url || ''}
                    onChange={(e) => updateButton(bi, 'url', e.target.value)}
                    placeholder="https://..."
                    className="oga-input flex-1"
                  />
                  <select
                    value={btn.style || 'primary'}
                    onChange={(e) => updateButton(bi, 'style', e.target.value)}
                    className="oga-select w-28"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                  </select>
                  <button onClick={() => removeButton(bi)} className="text-gray-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addButton}
                className="text-xs text-gray-500 hover:text-[#39FF14] flex items-center gap-1"
              >
                <Plus size={12} /> Add Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Explainer Block Card (JSONB editor for task_explainers) ────────
function ExplainerBlockCard({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown, onSaveAsTemplate }) {
  const [expanded, setExpanded] = useState(block._isNew || false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const update = (field, value) => {
    const updated = { ...block, [field]: value };
    delete updated._isNew;
    onChange(updated);
  };

  const selectedIcon = ICON_OPTIONS.find(o => o.value === block.icon);

  const handleSaveTemplate = async () => {
    if (!block.title) return;
    setSavingTemplate(true);
    try {
      await onSaveAsTemplate(block);
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="border border-[#2C2C2C] rounded-lg bg-[#0A0A0A] overflow-hidden group">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-600 hover:text-[#00BFFF] disabled:opacity-20 disabled:cursor-not-allowed"><MoveUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-600 hover:text-[#00BFFF] disabled:opacity-20 disabled:cursor-not-allowed"><MoveDown size={14} /></button>
        </div>
        <div className="w-7 h-7 rounded flex items-center justify-center bg-[#00BFFF]/10 text-[#00BFFF] flex-shrink-0">
          {selectedIcon ? <selectedIcon.preview size={14} /> : <HelpCircle size={14} />}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-white truncate hover:text-[#39FF14] transition-colors"
        >
          {block.title || `Explainer ${index + 1}`}
        </button>
        {block.task_type && TASK_TYPES[block.task_type] && (
          <span
            className="text-xs px-2 py-0.5 rounded font-bold uppercase"
            style={{ backgroundColor: `${TASK_TYPES[block.task_type].color}15`, color: TASK_TYPES[block.task_type].color }}
          >
            {TASK_TYPES[block.task_type].label}
          </span>
        )}
        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#2C2C2C] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="oga-label">Related Task Type</label>
              <Select
                value={block.task_type}
                onChange={(v) => update('task_type', v)}
                placeholder="Any / General"
                options={Object.entries(TASK_TYPES).map(([k, t]) => ({ value: k, label: t.label }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="oga-label">Icon</label>
              <div className="flex items-center gap-2">
                <select
                  value={block.icon || ''}
                  onChange={(e) => update('icon', e.target.value)}
                  className="oga-select flex-1"
                >
                  <option value="">Select icon...</option>
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {selectedIcon && (
                  <div className="w-9 h-9 rounded-lg bg-[#00BFFF]/10 flex items-center justify-center flex-shrink-0 border border-[#2C2C2C]">
                    <selectedIcon.preview size={16} className="text-[#00BFFF]" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-600">Stores Material icon name for Flutter rendering</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="oga-label">Title</label>
            <TextInput value={block.title} onChange={(v) => update('title', v)} placeholder="e.g., What is QR Scanning?" />
          </div>
          <div className="space-y-1.5">
            <label className="oga-label">Body</label>
            <TextArea value={block.body} onChange={(v) => update('body', v)} placeholder="Explain the feature to players..." rows={4} />
          </div>

          {/* Save as Template */}
          <div className="border-t border-[#2C2C2C] pt-3 mt-2">
            <button
              onClick={handleSaveTemplate}
              disabled={!block.title || savingTemplate}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#00BFFF] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {savingTemplate ? (
                <div className="w-3 h-3 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown size={12} />
              )}
              {savingTemplate ? 'Saving...' : 'Save as Reusable Template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Template Picker Modal ──────────────────────────────────────────
function TemplatePicker({ templates, onSelect, onClose, onDelete }) {
  if (!templates || templates.length === 0) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[#121212] border border-[#2C2C2C] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Explainer Templates</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No templates saved yet.</p>
            <p className="text-xs text-gray-600 mt-1">Use "Save as Reusable Template" on any explainer to create one.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#121212] border border-[#2C2C2C] rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Use Template</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {templates.map((t) => {
            const iconOpt = ICON_OPTIONS.find(o => o.value === t.icon);
            const PreviewIcon = iconOpt?.preview || HelpCircle;
            const taskType = t.task_type ? TASK_TYPES[t.task_type] : null;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#2C2C2C] bg-[#0A0A0A] hover:border-[#00BFFF]/40 transition-colors group">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-[#00BFFF]/10 text-[#00BFFF] flex-shrink-0">
                  <PreviewIcon size={16} />
                </div>
                <button
                  onClick={() => onSelect(t)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm font-semibold text-white">{t.title}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                    {taskType && <span style={{ color: taskType.color }}>{taskType.label}</span>}
                    {t.body && <span className="truncate max-w-[200px]">{t.body.substring(0, 60)}...</span>}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Milestone Preview ──────────────────────────────────────────
function MilestonePreview({ tasks, rewards, totalLevels, xpPerLevel }) {
  const [viewMode, setViewMode] = useState('table');
  const hasData = tasks.length > 0 || rewards.length > 0;
  const hasXpCurve = totalLevels > 0 && xpPerLevel > 0;

  if (!hasXpCurve) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Eye size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Configure the XP curve in Pass Settings to see the milestone preview.</p>
      </div>
    );
  }

  const totalXP = totalLevels * xpPerLevel;
  const taskXP = tasks.reduce((s, t) => s + (t.xp_reward || 0), 0);

  // Build combined items list
  const items = [];
  tasks.forEach((t) => {
    items.push({
      type: 'task',
      label: t.title || 'Untitled Task',
      taskType: t.task_type,
      color: TASK_TYPES[t.task_type]?.color || '#94A3B8',
      icon: TASK_TYPES[t.task_type]?.icon || Wrench,
      level: t.level_requirement || 0,
      xp: t.xp_reward || 0,
    });
  });
  rewards.forEach((r) => {
    items.push({
      type: 'reward',
      label: r.name || 'Untitled Reward',
      color: '#FFD700',
      icon: Gift,
      level: r.level_required || 0,
      xp: null,
    });
  });
  items.sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));

  if (!hasData) {
    return (
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Total Levels: <strong className="text-white">{totalLevels}</strong></span>
          <span>XP/Level: <strong className="text-white">{xpPerLevel}</strong></span>
          <span>Total XP: <strong className="text-[#39FF14]">{totalXP.toLocaleString()}</strong></span>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">Add tasks and rewards to populate the milestone preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header: stats + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span>Levels: <strong className="text-white">{totalLevels}</strong></span>
          <span>XP/Lv: <strong className="text-white">{xpPerLevel}</strong></span>
          <span>Total XP: <strong className="text-[#39FF14]">{totalXP.toLocaleString()}</strong></span>
          <span>Task Pool: <strong className="text-[#39FF14]">{taskXP.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-1 bg-[#0A0A0A] rounded-lg p-0.5 border border-[#2C2C2C]">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              viewMode === 'table' ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Table size={12} /> Table
          </button>
          <button
            onClick={() => setViewMode('track')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              viewMode === 'track' ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <BarChart3 size={12} /> Track
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        /* ── TABLE VIEW ──────────────────────────────────── */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2C2C2C]">
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-bold py-2 px-2 w-8">#</th>
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-bold py-2 px-2 w-10">Type</th>
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-bold py-2 px-2">Name</th>
                <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider font-bold py-2 px-2 w-16">Level</th>
                <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider font-bold py-2 px-2 w-20">XP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <tr key={i} className="border-b border-[#2C2C2C]/50 hover:bg-[#39FF14]/3 transition-colors">
                    <td className="py-2 px-2 text-xs text-gray-600 font-mono">{i + 1}</td>
                    <td className="py-2 px-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}15`, color: item.color }}
                      >
                        <Icon size={12} />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-white text-xs font-semibold">{item.label}</span>
                      {item.type === 'reward' && (
                        <span className="ml-2 text-[9px] text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded font-bold uppercase">Reward</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-xs text-gray-400">Lv.{item.level}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {item.xp !== null ? (
                        <span className="text-xs font-bold text-[#39FF14]">{item.xp}</span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── TRACK VIEW (existing visual) ───────────────── */
        <div className="relative">
          <div className="h-2 bg-[#2C2C2C] rounded-full relative overflow-visible">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#39FF14]/20 to-[#39FF14]/5" />
          </div>
          <div className="relative h-20 mt-1">
            {items.map((m, i) => {
              const levelPos = totalLevels > 0 ? Math.min((m.level || 0) / totalLevels, 1) : 0;
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${Math.max(2, Math.min(levelPos * 100, 96))}%`, transform: 'translateX(-50%)' }}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 -mt-[10px]"
                    style={{
                      backgroundColor: m.color,
                      borderColor: m.type === 'reward' ? '#FFD700' : m.color,
                      boxShadow: `0 0 6px ${m.color}40`,
                    }}
                  />
                  <div className={`mt-1 text-center max-w-[80px] ${i % 2 === 0 ? '' : 'mt-8'}`}>
                    <div className="text-[9px] font-bold truncate" style={{ color: m.color }}>{m.label}</div>
                    <div className="text-[8px] text-gray-500">Lv.{m.level}{m.xp ? ` · ${m.xp}XP` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 mt-1 px-1">
            <span>Lv.0</span>
            <span>Lv.{Math.round(totalLevels * 0.25)}</span>
            <span>Lv.{Math.round(totalLevels * 0.5)}</span>
            <span>Lv.{Math.round(totalLevels * 0.75)}</span>
            <span>Lv.{totalLevels}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE COMPONENT ────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export default function PortalPassBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // ── State ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showTaskPalette, setShowTaskPalette] = useState(false);

  // Pass data — includes Sprint 42 detail fields (10 new)
  const [pass, setPass] = useState({
    id: null,
    slug: '',
    name: '',
    type: 'brand_campaign',
    brand_name: '',
    brand_logo_url: '',
    brand_card_logo_url: '',
    season_name: '',
    description: '',
    character_id: '',
    special_reward_name: '',
    special_reward_description: '',
    special_reward_image_url: '',
    special_reward_character_id: '',
    gameplay_videos: [],
    is_active: true,
    total_levels: 50,
    xp_per_level: 100,
    expires_at: '',
    // ── Sprint 42 detail fields ───────────────────────────────
    headline: '',
    subheadline: '',
    hero_banner_url: '',
    cta_type: 'none',
    cta_label: '',
    cta_url: '',
    completion_reward_title: '',
    completion_reward_description: '',
    promo_sections: [],
    task_explainers: [],
    // ── Sprint 43C fields ─────────────────────────────────────
    cta_buttons: [],
    enable_scan_qr: false,
    enable_enter_code: false,
    section_order: ['cta', 'characters', 'objectives', 'rewards', 'promo', 'explainers', 'completion'],
  });

  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [deletedTaskIds, setDeletedTaskIds] = useState([]);
  const [deletedRewardIds, setDeletedRewardIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reference data for dropdowns
  const [characters, setCharacters] = useState([]);
  const [games, setGames] = useState([]);

  // Explainer templates
  const [explainerTemplates, setExplainerTemplates] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Pass characters (junction table)
  const [passCharacters, setPassCharacters] = useState([]);
  const [sectionOrder, setSectionOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('oga_pp_section_order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['settings', 'hero', 'cta', 'characters', 'tasks', 'rewards', 'special', 'promo', 'explainers', 'preview'];
  });

  useEffect(() => {
    localStorage.setItem('oga_pp_section_order', JSON.stringify(sectionOrder));
  }, [sectionOrder]);

  const adminToConsumerMap = {
    'cta': 'cta', 'characters': 'characters', 'tasks': 'objectives',
    'rewards': 'rewards', 'promo': 'promo', 'explainers': 'explainers',
    'special': 'completion',
  };

  const consumerSectionOrder = sectionOrder
    .filter(key => adminToConsumerMap[key])
    .map(key => adminToConsumerMap[key]);

  useEffect(() => {
    if (consumerSectionOrder.length > 0) {
      updatePass('section_order', consumerSectionOrder);
    }
  }, [sectionOrder]);

  // IP Brands for auto-populate
  const [brands, setBrands] = useState([]);

  // ── Load Pass Data ────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load characters + games for dropdowns
      const [charsRes, gamesRes] = await Promise.all([
        supabase.from('characters').select('id, name').order('name'),
        supabase.from('game_projects').select('id, name').order('name'),
      ]);
      setCharacters(charsRes.data || []);
      setGames(gamesRes.data || []);

      // Load IP brands for auto-populate
      try {
        const { data: brandData } = await supabase.rpc('get_ip_brands');
        setBrands(brandData || []);
      } catch (e) { console.warn('Brands load:', e); }

      // Load explainer templates
      try {
        const { data: tplData } = await supabase.rpc('get_explainer_templates');
        setExplainerTemplates(Array.isArray(tplData) ? tplData : (tplData || []));
      } catch (e) { console.warn('Templates load:', e); }

      if (!isNew) {
        // Load full pass via RPC
        const { data, error } = await supabase.rpc('get_portal_pass_full', { p_pass_id: id });
        if (error) throw error;

        if (data) {
          const passData = Array.isArray(data) ? data[0] : data;

          // Separate pass fields from nested tasks/rewards
          // RPC returns { pass: {...}, tasks: [...], rewards: [...] }
          const loadedTasks = passData.tasks;
          const loadedRewards = passData.rewards;
          const passFields = passData.pass || passData;

          // Format expires_at for datetime-local input
          if (passFields.expires_at) {
            passFields.expires_at = new Date(passFields.expires_at).toISOString().slice(0, 16);
          }

          // Parse JSONB fields that may come as strings
          if (typeof passFields.promo_sections === 'string') {
            try { passFields.promo_sections = JSON.parse(passFields.promo_sections); } catch { passFields.promo_sections = []; }
          }
          if (typeof passFields.task_explainers === 'string') {
            try { passFields.task_explainers = JSON.parse(passFields.task_explainers); } catch { passFields.task_explainers = []; }
          }

          // Ensure arrays
          passFields.promo_sections = passFields.promo_sections || [];
          passFields.task_explainers = passFields.task_explainers || [];

          // Parse cta_buttons
          if (typeof passFields.cta_buttons === 'string') {
            try { passFields.cta_buttons = JSON.parse(passFields.cta_buttons); } catch { passFields.cta_buttons = []; }
          }
          passFields.cta_buttons = passFields.cta_buttons || [];
          passFields.enable_scan_qr = passFields.enable_scan_qr ?? false;
          passFields.enable_enter_code = passFields.enable_enter_code ?? false;

          setPass(prev => ({ ...prev, ...passFields, id: passFields.id || id }));
          setTasks((loadedTasks || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
          setRewards((loadedRewards || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
          // Load pass characters from junction table
          try {
            const { data: pcData } = await supabase.rpc('get_pass_characters', { p_pass_id: id });
            setPassCharacters((pcData || []).map(pc => pc.character_id));
          } catch (e) { console.warn('Pass characters load:', e); }
        }
      }
    } catch (err) {
      console.error('Load error:', err);
      showToast('Failed to load pass data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Toast Helper ──────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Pass Field Updates ────────────────────────────────────────────
  const updatePass = (field, value) => {
    setPass(prev => ({ ...prev, [field]: value }));
  };

  // ── Task Management ───────────────────────────────────────────────
  const addTask = (taskType) => {
    const type = TASK_TYPES[taskType];
    const newTask = {
      id: tempId(),
      _isNew: true,
      _isTemp: true,
      pass_id: pass.id,
      title: type.label.toUpperCase(),
      description: '',
      task_type: taskType,
      target_character_id: '',
      target_value: '',
      xp_reward: 100,
      order_index: tasks.length,
      level_requirement: 0,
      target_game_id: null,
      required_count: 1,
    };
    setTasks(prev => [...prev, newTask]);
    setShowTaskPalette(false);
  };

  const updateTask = (index, updatedTask) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...updatedTask, _isNew: false } : t));
  };

  const deleteTask = (index) => {
    const task = tasks[index];
    if (!task._isTemp && task.id) {
      setDeletedTaskIds(prev => [...prev, task.id]);
    }
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const moveTask = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= tasks.length) return;
    setTasks(prev => {
      const updated = [...prev];
      [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
      return updated.map((t, i) => ({ ...t, order_index: i }));
    });
  };

  // ── Reward Management ─────────────────────────────────────────────
  const addReward = () => {
    const newReward = {
      id: tempId(),
      _isNew: true,
      _isTemp: true,
      pass_id: pass.id?.toString() || '',
      name: '',
      image: '',
      level_required: 10,
      is_unlocked: false,
      sort_order: rewards.length,
      description: '',
    };
    setRewards(prev => [...prev, newReward]);
  };

  const updateReward = (index, updatedReward) => {
    setRewards(prev => prev.map((r, i) => i === index ? { ...updatedReward, _isNew: false } : r));
  };

  const deleteReward = (index) => {
    const reward = rewards[index];
    if (!reward._isTemp && reward.id) {
      setDeletedRewardIds(prev => [...prev, reward.id]);
    }
    setRewards(prev => prev.filter((_, i) => i !== index));
  };

  // ── Promo Sections Management ─────────────────────────────────────
  const addPromoBlock = () => {
    updatePass('promo_sections', [
      ...pass.promo_sections,
      { _isNew: true, title: '', badge: '', highlight: '', body: '', buttons: [] },
    ]);
  };

  const updatePromoBlock = (index, updated) => {
    const blocks = [...pass.promo_sections];
    blocks[index] = updated;
    updatePass('promo_sections', blocks);
  };

  const deletePromoBlock = (index) => {
    updatePass('promo_sections', pass.promo_sections.filter((_, i) => i !== index));
  };

  const movePromoBlock = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pass.promo_sections.length) return;
    const updated = [...pass.promo_sections];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    updatePass('promo_sections', updated);
  };

  // ── Task Explainers Management ────────────────────────────────────
  const addExplainerBlock = () => {
    updatePass('task_explainers', [
      ...pass.task_explainers,
      { _isNew: true, task_type: '', title: '', body: '', icon: '' },
    ]);
  };

  const updateExplainerBlock = (index, updated) => {
    const blocks = [...pass.task_explainers];
    blocks[index] = updated;
    updatePass('task_explainers', blocks);
  };

  const deleteExplainerBlock = (index) => {
    updatePass('task_explainers', pass.task_explainers.filter((_, i) => i !== index));
  };

  const moveExplainerBlock = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pass.task_explainers.length) return;
    const updated = [...pass.task_explainers];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    updatePass('task_explainers', updated);
  };

  // ── Brand Auto-Populate ───────────────────────────────────────
  const handleBrandSelect = async (brandId) => {
    updatePass('character_id', ''); // clear single-char (legacy field)
    if (!brandId) return;

    try {
      const { data } = await supabase.rpc('get_brand_details', { p_brand_id: brandId });
      if (data) {
        setPass(prev => ({
          ...prev,
          brand_name: data.display_name || data.name || prev.brand_name,
          brand_logo_url: data.logo_url || prev.brand_logo_url,
        }));
      }
    } catch (e) { console.warn('Brand auto-populate:', e); }
  };

  // ── CTA Buttons Management ────────────────────────────────────
  const addCtaButton = () => {
    updatePass('cta_buttons', [
      ...pass.cta_buttons,
      { label: '', url: '', style: 'outline' },
    ]);
  };

  const updateCtaButton = (index, field, value) => {
    const buttons = [...pass.cta_buttons];
    buttons[index] = { ...buttons[index], [field]: value };
    updatePass('cta_buttons', buttons);
  };

  const removeCtaButton = (index) => {
    updatePass('cta_buttons', pass.cta_buttons.filter((_, i) => i !== index));
  };

  // ── Pass Characters Management ────────────────────────────────
  const moveSection = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= sectionOrder.length) return;
    setSectionOrder(prev => {
      const updated = [...prev];
      [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
      return updated;
    });
  };

  const togglePassCharacter = (charId) => {
    setPassCharacters(prev =>
      prev.includes(charId) ? prev.filter(c => c !== charId) : [...prev, charId]
    );
  };

// ── Explainer Template Functions ──────────────────────────────
  const saveAsTemplate = async (block) => {
    try {
      const { data, error } = await supabase.rpc('save_explainer_template', {
        p_title: block.title,
        p_body: block.body || null,
        p_icon: block.icon || null,
        p_task_type: block.task_type || null,
      });
      if (error) throw error;
      showToast('Template saved');
      // Reload templates
      const { data: tplData } = await supabase.rpc('get_explainer_templates');
      setExplainerTemplates(Array.isArray(tplData) ? tplData : (tplData || []));
    } catch (err) {
      showToast(`Template save failed: ${err.message}`, 'error');
    }
  };

  const useTemplate = (template) => {
    updatePass('task_explainers', [
      ...pass.task_explainers,
      { _isNew: true, task_type: template.task_type || '', title: template.title || '', body: template.body || '', icon: template.icon || '' },
    ]);
    setShowTemplatePicker(false);
    showToast('Template applied', 'info');
  };

  const deleteTemplate = async (templateId) => {
    try {
      await supabase.rpc('delete_explainer_template', { p_id: templateId });
      setExplainerTemplates(prev => prev.filter(t => t.id !== templateId));
      showToast('Template deleted');
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // ── Build the 29-param RPC payload ────────────────────────────────
  const buildPassPayload = (overrides = {}) => ({
    p_slug: pass.slug,
    p_name: pass.name,
    p_type: pass.type,
    p_brand_name: pass.brand_name || null,
    p_brand_logo_url: pass.brand_logo_url || null,
    p_brand_card_logo_url: pass.brand_card_logo_url || null,
    p_season_name: pass.season_name || null,
    p_description: pass.description || null,
    p_character_id: pass.character_id || null,
    p_special_reward_name: pass.special_reward_name || null,
    p_special_reward_description: pass.special_reward_description || null,
    p_special_reward_image_url: pass.special_reward_image_url || null,
    p_special_reward_character_id: pass.special_reward_character_id || null,
    p_gameplay_videos: JSON.stringify(pass.gameplay_videos || []),
    p_is_active: overrides.is_active !== undefined ? overrides.is_active : pass.is_active,
    p_total_levels: pass.total_levels || 50,
    p_xp_per_level: pass.xp_per_level || 100,
    p_expires_at: pass.expires_at ? new Date(pass.expires_at).toISOString() : null,
    // ── Sprint 42 detail fields (params 20–29) ────────────────
    p_headline: pass.headline || null,
    p_subheadline: pass.subheadline || null,
    p_hero_banner_url: pass.hero_banner_url || null,
    p_cta_type: pass.cta_type || 'none',
    p_cta_label: pass.cta_label || null,
    p_cta_url: pass.cta_url || null,
    p_completion_reward_title: pass.completion_reward_title || null,
    p_completion_reward_description: pass.completion_reward_description || null,
    p_promo_sections: JSON.stringify(cleanJsonbArray(pass.promo_sections)),
    p_task_explainers: JSON.stringify(cleanJsonbArray(pass.task_explainers)),
    // Sprint 43C
    p_cta_buttons: JSON.stringify(cleanJsonbArray(pass.cta_buttons)),
    p_enable_scan_qr: pass.enable_scan_qr || false,
    p_enable_enter_code: pass.enable_enter_code || false,
    ...overrides,
  });

  // Strip _isNew flags before persisting JSONB arrays
  const cleanJsonbArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      const cleaned = { ...item };
      delete cleaned._isNew;
      return cleaned;
    });
  };

  // ── Duplicate Pass ────────────────────────────────────────────────
  const handleDuplicate = async () => {
    setSaving(true);
    try {
      const newSlug = `${pass.slug}_copy_${Date.now()}`;

      const { data: passData, error: passError } = await supabase.rpc('upsert_portal_pass', {
        p_id: null,
        ...buildPassPayload({ is_active: false }),
        p_slug: newSlug,
        p_name: `${pass.name} (Copy)`,
      });
      console.log('Duplicate pass RPC:', JSON.stringify(passData), 'error:', passError);
      if (passError) throw passError;
      if (passData && passData.error) throw new Error(passData.error);

      const newId = passData.id;
      if (!newId) throw new Error('No ID returned from pass creation');

      // Duplicate all tasks
      for (const task of tasks) {
        const { data: taskData, error: taskError } = await supabase.rpc('upsert_portal_pass_task', {
          p_id: null,
          p_pass_id: newId,
          p_title: task.title,
          p_description: task.description || null,
          p_task_type: task.task_type,
          p_target_character_id: task.target_character_id || null,
          p_target_value: task.target_value || null,
          p_xp_reward: task.xp_reward || 100,
          p_order_index: task.order_index || 0,
          p_level_requirement: task.level_requirement || 0,
          p_target_game_id: task.target_game_id || null,
          p_required_count: task.required_count || 1,
        });
        console.log('Duplicate task RPC:', task.title, JSON.stringify(taskData), 'error:', taskError);
        if (taskError) throw taskError;
        if (taskData && taskData.error) throw new Error(taskData.error);
      }

      // Duplicate all rewards
      for (const reward of rewards) {
        const { error: rewardError } = await supabase.rpc('upsert_portal_pass_reward', {
          p_id: null,
          p_pass_id: newId.toString(),
          p_name: reward.name,
          p_image: reward.image || '',
          p_level_required: reward.level_required || 1,
          p_is_unlocked: false,
          p_sort_order: reward.sort_order || 0,
          p_description: reward.description || null,
        });
        if (rewardError) throw rewardError;
      }
      
// Duplicate pass characters
      if (passCharacters.length > 0) {
        await supabase.rpc('set_pass_characters', {
          p_pass_id: newId,
          p_character_ids: passCharacters,
          p_added_via: 'manual',
        });
      }

      showToast('Pass duplicated — opening copy');
      navigate(`/portal-passes/${newId}`);
    } catch (err) {
      console.error('Duplicate error:', err);
      showToast(`Duplicate failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Pass ───────────────────────────────────────────────────
  const handleDeletePass = async () => {
    setDeleting(true);
    try {
      const passIdToDelete = pass.id || id;
      console.log('Deleting pass with ID:', passIdToDelete, 'pass.id:', pass.id, 'url id:', id);
      const { data, error } = await supabase.rpc('delete_portal_pass', { p_pass_id: passIdToDelete });
      console.log('Delete RPC response:', JSON.stringify(data), 'error:', error);

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      showToast('Portal Pass deleted');
      navigate('/portal-passes');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
      setDeleting(false);
    }
  };

  // ── Save All ──────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!pass.name || !pass.slug) {
      showToast('Name and slug are required', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Save pass (29 params)
      const passIdParam = isNew ? null : (pass.id || id);

      const { data: passResult, error: passError } = await supabase.rpc('upsert_portal_pass', {
        p_id: passIdParam,
        ...buildPassPayload(),
      });
      if (passError) throw passError;
      if (passResult && passResult.error) throw new Error(passResult.error);

      const passId = passResult?.id || pass.id || id;

      // 2. Delete removed tasks
      for (const taskId of deletedTaskIds) {
        await supabase.rpc('delete_portal_pass_task', { p_task_id: taskId });
      }

      // 3. Delete removed rewards
      for (const rewardId of deletedRewardIds) {
        await supabase.rpc('delete_portal_pass_reward', { p_reward_id: rewardId });
      }

      // 4. Upsert tasks
      for (const task of tasks) {
        const { error: taskError } = await supabase.rpc('upsert_portal_pass_task', {
          p_id: task._isTemp ? null : task.id,
          p_pass_id: passId,
          p_title: task.title,
          p_description: task.description || null,
          p_task_type: task.task_type,
          p_target_character_id: task.target_character_id || null,
          p_target_value: task.target_value || null,
          p_xp_reward: task.xp_reward || 100,
          p_order_index: task.order_index || 0,
          p_level_requirement: task.level_requirement || 0,
          p_target_game_id: task.target_game_id || null,
          p_required_count: task.required_count || 1,
        });
        if (taskError) throw taskError;
      }

      // 5. Reorder tasks
      const taskIds = tasks.map(t => t._isTemp ? null : t.id).filter(Boolean);
      if (taskIds.length > 0) {
        await supabase.rpc('reorder_portal_pass_tasks', {
          p_pass_id: passId,
          p_ordered_ids: taskIds,
        });
      }

      // 6. Upsert rewards
      for (const reward of rewards) {
        const { error: rewardError } = await supabase.rpc('upsert_portal_pass_reward', {
          p_id: reward._isTemp ? null : reward.id,
          p_pass_id: passId.toString(),
          p_name: reward.name,
          p_image: reward.image || '',
          p_level_required: reward.level_required || 1,
          p_is_unlocked: reward.is_unlocked || false,
          p_sort_order: reward.sort_order || 0,
          p_description: reward.description || null,
        });
        if (rewardError) throw rewardError;
      }

      // 7. Save pass characters (junction table)
      if (passCharacters.length > 0) {
        const { error: pcError } = await supabase.rpc('set_pass_characters', {
          p_pass_id: passId,
          p_character_ids: passCharacters,
          p_added_via: 'manual',
        });
        if (pcError) console.warn('Pass characters save:', pcError);
      }

      try {
        await supabase
          .from('portal_passes')
          .update({ section_order: JSON.stringify(consumerSectionOrder) })
          .eq('id', passId);
      } catch (e) { console.warn('Section order save:', e); }

      setDeletedTaskIds([]);
      setDeletedRewardIds([]);
      showToast('Portal Pass saved successfully');


      // If new pass, redirect to the edit URL
      if (isNew) {
        navigate(`/portal-passes/${passId}`, { replace: true });
      } else {
        await loadData();
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading pass data...</span>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Task Palette Modal */}
      {showTaskPalette && (
        <TaskTypePalette onSelect={addTask} onClose={() => setShowTaskPalette(false)} />
      )}

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/portal-passes')}
            className="oga-btn-secondary !px-3 !py-2"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">
              {isNew ? 'Create Portal Pass' : 'Edit Portal Pass'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {pass.slug || 'new-pass'} · {tasks.length} tasks · {rewards.length} rewards
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={pass.is_active} onChange={(v) => updatePass('is_active', v)} label="Active" />
          {!isNew && (
            <button
              onClick={handleDuplicate}
              disabled={saving}
              className="oga-btn-secondary flex items-center gap-2"
              title="Duplicate this pass"
            >
              <Copy size={16} />
              <span className="hidden md:inline">Duplicate</span>
            </button>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className="oga-btn-primary flex items-center gap-2 !px-5"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {sectionOrder.map((key, idx) => {
        const sectionProps = {
          onMoveUp: () => moveSection(idx, -1),
          onMoveDown: () => moveSection(idx, 1),
          isFirst: idx === 0,
          isLast: idx === sectionOrder.length - 1,
        };

        switch (key) {
          case 'settings':
            return (
              <Section key={key} title="Pass Settings" icon={Sparkles} defaultOpen={isNew} {...sectionProps}>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Pass Name">
                      <TextInput value={pass.name} onChange={(v) => updatePass('name', v)} placeholder="e.g., FINAL BOSS SOUR × OGA" />
                    </Field>
                    <Field label="Slug" hint="Unique identifier, no spaces">
                      <TextInput value={pass.slug} onChange={(v) => updatePass('slug', v)} placeholder="e.g., fbs_season_1" />
                    </Field>
                    <Field label="Type">
                      <Select value={pass.type} onChange={(v) => updatePass('type', v)} options={PASS_TYPES} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Season Name">
                      <TextInput value={pass.season_name} onChange={(v) => updatePass('season_name', v)} placeholder="e.g., SEASON 1" />
                    </Field>
                    <Field label="Linked Character">
                      <Select value={pass.character_id} onChange={(v) => updatePass('character_id', v)} placeholder="None (multi-character pass)" options={characters.map(c => ({ value: c.id, label: c.name }))} />
                    </Field>
                    <Field label="Expires At">
                      <input type="datetime-local" value={pass.expires_at || ''} onChange={(e) => updatePass('expires_at', e.target.value)} className="oga-input" />
                    </Field>
                  </div>
                  <Field label="Description">
                    <TextArea value={pass.description} onChange={(v) => updatePass('description', v)} placeholder="Describe the pass to players" />
                  </Field>
                  <div className="border-t border-[#2C2C2C] pt-4 mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Brand / Co-Brand</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field label="Brand / IP">
                        <select value="" onChange={(e) => { if (e.target.value) handleBrandSelect(e.target.value); }} className="oga-select mb-2">
                          <option value="">Auto-fill from IP Brand...</option>
                          {brands.map(b => (<option key={b.id} value={b.id}>{b.display_name || b.name}</option>))}
                        </select>
                        <TextInput value={pass.brand_name} onChange={(v) => updatePass('brand_name', v)} placeholder="e.g., Final Boss Sour" />
                        <p className="text-[10px] text-gray-600 mt-1">Select a brand above to auto-fill, or type manually</p>
                      </Field>
                      <Field label="Brand Logo">
                        <ImageUploader value={pass.brand_logo_url} onChange={(v) => updatePass('brand_logo_url', v)} pathPrefix="brands" label="Brand logo" />
                      </Field>
                      <Field label="Brand Card Logo">
                        <ImageUploader value={pass.brand_card_logo_url} onChange={(v) => updatePass('brand_card_logo_url', v)} pathPrefix="brands" label="Brand card logo" />
                      </Field>
                    </div>
                  </div>
                  <div className="border-t border-[#2C2C2C] pt-4 mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">XP Curve</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Field label="Total Levels"><NumberInput value={pass.total_levels} onChange={(v) => updatePass('total_levels', v)} min={1} max={999} /></Field>
                      <Field label="XP per Level"><NumberInput value={pass.xp_per_level} onChange={(v) => updatePass('xp_per_level', v)} min={1} /></Field>
                      <Field label="Total XP"><div className="oga-input bg-[#121212] text-[#39FF14] font-bold cursor-default">{((pass.total_levels || 0) * (pass.xp_per_level || 0)).toLocaleString()}</div></Field>
                    </div>
                  </div>
                </div>
              </Section>
            );

          case 'hero':
            return (
              <Section key={key} title="Hero & Branding" icon={Image} defaultOpen={false} {...sectionProps}>
                <div className="space-y-4 pt-4">
                  <p className="text-xs text-gray-500">These fields control the hero area of the Portal Pass detail page shown to players.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Headline" hint="Bold hero text, e.g., BUY CANDY. UNLOCK LEGENDS."><TextInput value={pass.headline} onChange={(v) => updatePass('headline', v)} placeholder="e.g., BUY CANDY. UNLOCK LEGENDS." /></Field>
                    <Field label="Subheadline" hint="Secondary descriptive text"><TextInput value={pass.subheadline} onChange={(v) => updatePass('subheadline', v)} placeholder="e.g., Collect all 4 Final Boss Sour characters" /></Field>
                  </div>
                  <Field label="Hero Banner Image" hint="Full-width top banner on the detail page (recommended 1200×400)">
                    <ImageUploader value={pass.hero_banner_url} onChange={(v) => updatePass('hero_banner_url', v)} pathPrefix="pass-banners" label="Hero banner" />
                  </Field>
                </div>
              </Section>
            );

          case 'cta':
            return (
              <Section key={key} title="Call to Action" icon={Link} defaultOpen={false} {...sectionProps}>
                <div className="space-y-4 pt-4">
                  <p className="text-xs text-gray-500">Toggle built-in app behaviors. These appear as primary buttons on the Portal Pass detail page.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-[#2C2C2C] bg-[#0A0A0A]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center"><ScanLine size={16} className="text-[#39FF14]" /></div>
                        <div><p className="text-sm text-white font-semibold">Scan QR Code</p><p className="text-[10px] text-gray-500">Opens camera scanner in-app</p></div>
                      </div>
                      <Toggle checked={pass.enable_scan_qr} onChange={(v) => updatePass('enable_scan_qr', v)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-[#2C2C2C] bg-[#0A0A0A]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center"><Wrench size={16} className="text-[#39FF14]" /></div>
                        <div><p className="text-sm text-white font-semibold">Enter Code</p><p className="text-[10px] text-gray-500">Opens code redemption modal</p></div>
                      </div>
                      <Toggle checked={pass.enable_enter_code} onChange={(v) => updatePass('enable_enter_code', v)} />
                    </div>
                  </div>
                  <div className="border-t border-[#2C2C2C] pt-4 mt-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Custom Buttons</p>
                    <p className="text-xs text-gray-600 mb-3">Additional link buttons shown below the preset actions.</p>
                    {pass.cta_buttons.map((btn, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="text" value={btn.label || ''} onChange={(e) => updateCtaButton(i, 'label', e.target.value)} placeholder="Button label" className="oga-input flex-1" />
                        <input type="url" value={btn.url || ''} onChange={(e) => updateCtaButton(i, 'url', e.target.value)} placeholder="https://..." className="oga-input flex-1" />
                        <select value={btn.style || 'outline'} onChange={(e) => updateCtaButton(i, 'style', e.target.value)} className="oga-select w-28">
                          <option value="primary">Primary</option><option value="outline">Outline</option>
                        </select>
                        <button onClick={() => removeCtaButton(i)} className="text-gray-600 hover:text-red-400"><X size={14} /></button>
                      </div>
                    ))}
                    {pass.cta_buttons.length < 4 && (
                      <button onClick={addCtaButton} className="text-xs text-gray-500 hover:text-[#39FF14] flex items-center gap-1 mt-1"><Plus size={12} /> Add Custom Button</button>
                    )}
                  </div>
                </div>
              </Section>
            );

          case 'characters':
            return (
              <Section key={key} title="Pass Characters" icon={Users} count={passCharacters.length} defaultOpen={false} {...sectionProps}>
                <div className="space-y-3 pt-4">
                  <p className="text-xs text-gray-500">Select which characters are part of this Portal Pass.</p>
                  {passCharacters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {passCharacters.map(cid => {
                        const char = characters.find(c => c.id === cid);
                        return (
                          <div key={cid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/30">
                            <span className="text-xs text-[#39FF14] font-bold">{char?.name || cid}</span>
                            <button onClick={() => togglePassCharacter(cid)} className="text-[#39FF14]/50 hover:text-red-400"><X size={12} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                    {characters.map(char => {
                      const isSelected = passCharacters.includes(char.id);
                      return (
                        <button key={char.id} onClick={() => togglePassCharacter(char.id)} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center ${isSelected ? 'border-[#39FF14] bg-[#39FF14]/5' : 'border-[#2C2C2C] bg-[#0A0A0A] hover:border-[#39FF14]/30'}`}>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#39FF14] bg-[#39FF14]/20' : 'border-[#2C2C2C]'}`}>{isSelected && <Check size={12} className="text-[#39FF14]" />}</div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-[#39FF14]' : 'text-gray-400'}`}>{char.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>
            );

          case 'tasks':
            return (
              <Section key={key} title="Tasks" icon={Swords} count={tasks.length} defaultOpen={true} {...sectionProps}>
                <div className="space-y-2 pt-4">
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500"><Swords size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No tasks yet. Add your first task to get started.</p></div>
                  )}
                  {tasks.map((task, i) => (
                    <TaskCard key={task.id} task={task} index={i} total={tasks.length} characters={characters} games={games} onChange={(updated) => updateTask(i, updated)} onDelete={() => deleteTask(i)} onMoveUp={() => moveTask(i, -1)} onMoveDown={() => moveTask(i, 1)} />
                  ))}
                  <button onClick={() => setShowTaskPalette(true)} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C] rounded-lg text-gray-500 hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-colors"><Plus size={16} /><span className="text-sm font-medium">Add Task</span></button>
                </div>
              </Section>
            );

          case 'rewards':
            return (
              <Section key={key} title="Level Rewards" icon={Gift} count={rewards.length} {...sectionProps}>
                <div className="space-y-2 pt-4">
                  {rewards.length === 0 && (
                    <div className="text-center py-8 text-gray-500"><Gift size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No rewards yet. Add milestone rewards at level thresholds.</p></div>
                  )}
                  {rewards.map((reward, i) => (<RewardCard key={reward.id} reward={reward} onChange={(updated) => updateReward(i, updated)} onDelete={() => deleteReward(i)} />))}
                  <button onClick={addReward} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C] rounded-lg text-gray-500 hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-colors"><Plus size={16} /><span className="text-sm font-medium">Add Reward</span></button>
                </div>
              </Section>
            );

          case 'special':
            return (
              <Section key={key} title="Special Reward" icon={Trophy} badge="Completion Prize" {...sectionProps}>
                <div className="space-y-4 pt-4">
                  <p className="text-xs text-gray-500">The special reward is granted when a player completes the entire pass.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Reward Name"><TextInput value={pass.special_reward_name} onChange={(v) => updatePass('special_reward_name', v)} placeholder="e.g., THE FINAL BOSS" /></Field>
                    <Field label="Granted Character"><Select value={pass.special_reward_character_id} onChange={(v) => updatePass('special_reward_character_id', v)} placeholder="None (cosmetic reward only)" options={characters.map(c => ({ value: c.id, label: c.name }))} /></Field>
                  </div>
                  <Field label="Description"><TextArea value={pass.special_reward_description} onChange={(v) => updatePass('special_reward_description', v)} placeholder="Describe the ultimate reward" /></Field>
                  <Field label="Reward Image"><ImageUploader value={pass.special_reward_image_url} onChange={(v) => updatePass('special_reward_image_url', v)} pathPrefix="pass-special" label="Special reward" /></Field>
                  <div className="border-t border-[#2C2C2C] pt-4 mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Consumer-Facing Completion Copy</p>
                    <p className="text-xs text-gray-600 mb-3">These are shown on the Portal Pass detail page as the completion incentive.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Completion Reward Title" hint="e.g., UNLOCK THE FINAL BOSS"><TextInput value={pass.completion_reward_title} onChange={(v) => updatePass('completion_reward_title', v)} placeholder="e.g., UNLOCK THE FINAL BOSS" /></Field>
                      <Field label="Completion Reward Description"><TextArea value={pass.completion_reward_description} onChange={(v) => updatePass('completion_reward_description', v)} placeholder="What players see as the completion incentive" rows={2} /></Field>
                    </div>
                  </div>
                </div>
              </Section>
            );

          case 'promo':
            return (
              <Section key={key} title="Brand Promo Sections" icon={Megaphone} count={pass.promo_sections.length} defaultOpen={false} {...sectionProps}>
                <div className="space-y-2 pt-4">
                  <p className="text-xs text-gray-500 mb-3">Flexible promotional blocks shown on the Portal Pass detail page.</p>
                  {pass.promo_sections.length === 0 && (
                    <div className="text-center py-6 text-gray-500"><Megaphone size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No promo sections yet.</p></div>
                  )}
                  {pass.promo_sections.map((block, i) => (
                    <PromoBlockCard key={i} block={block} index={i} total={pass.promo_sections.length} onChange={(updated) => updatePromoBlock(i, updated)} onDelete={() => deletePromoBlock(i)} onMoveUp={() => movePromoBlock(i, -1)} onMoveDown={() => movePromoBlock(i, 1)} />
                  ))}
                  <button onClick={addPromoBlock} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C] rounded-lg text-gray-500 hover:border-[#C084FC]/50 hover:text-[#C084FC] transition-colors"><Plus size={16} /><span className="text-sm font-medium">Add Promo Section</span></button>
                </div>
              </Section>
            );

          case 'explainers':
            return (
              <Section key={key} title="Task Explainers" icon={BookOpen} count={pass.task_explainers.length} defaultOpen={false} {...sectionProps}>
                <div className="space-y-2 pt-4">
                  <p className="text-xs text-gray-500 mb-3">Educational how-to blocks that explain features to players.</p>
                  {pass.task_explainers.length === 0 && (
                    <div className="text-center py-6 text-gray-500"><BookOpen size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No explainers yet.</p></div>
                  )}
                  {pass.task_explainers.map((block, i) => (
                    <ExplainerBlockCard key={i} block={block} index={i} total={pass.task_explainers.length} onChange={(updated) => updateExplainerBlock(i, updated)} onDelete={() => deleteExplainerBlock(i)} onMoveUp={() => moveExplainerBlock(i, -1)} onMoveDown={() => moveExplainerBlock(i, 1)} onSaveAsTemplate={saveAsTemplate} />
                  ))}
                  <div className="flex gap-2">
                    <button onClick={addExplainerBlock} className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C] rounded-lg text-gray-500 hover:border-[#00BFFF]/50 hover:text-[#00BFFF] transition-colors"><Plus size={16} /><span className="text-sm font-medium">Add Explainer</span></button>
                    {explainerTemplates.length > 0 && (
                      <button onClick={() => setShowTemplatePicker(true)} className="flex items-center gap-2 px-4 py-3 border border-dashed border-[#2C2C2C] rounded-lg text-gray-500 hover:border-[#C084FC]/50 hover:text-[#C084FC] transition-colors"><FileDown size={16} /><span className="text-sm font-medium">From Template</span></button>
                    )}
                  </div>
                </div>
              </Section>
            );

          case 'preview':
            return (
              <Section key={key} title="Milestone Preview" icon={Eye} defaultOpen={tasks.length > 0 || rewards.length > 0} {...sectionProps}>
                <MilestonePreview tasks={tasks} rewards={rewards} totalLevels={pass.total_levels || 0} xpPerLevel={pass.xp_per_level || 0} />
              </Section>
            );

          default:
            return null;
        }
      })}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <TemplatePicker
          templates={explainerTemplates}
          onSelect={useTemplate}
          onClose={() => setShowTemplatePicker(false)}
          onDelete={deleteTemplate}
        />
      )}

      {/* ─── Danger Zone ─────────────────────────────────────────── */}
      {!isNew && (
        <div className="oga-card mb-4 border-red-500/20">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider">Danger Zone</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Permanently delete this Portal Pass and all its tasks and rewards. This cannot be undone.
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400 mr-2">Are you sure?</span>
                  <button
                    onClick={handleDeletePass}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="oga-btn-secondary !py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 
                    hover:bg-red-500/10 text-sm font-bold rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                  Delete Portal Pass
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Save Bar ─────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-[#0A0A0A]/90 backdrop-blur-sm border-t border-[#2C2C2C] -mx-4 md:-mx-8 px-4 md:px-8 py-4 mt-6 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {deletedTaskIds.length + deletedRewardIds.length > 0 && (
            <span className="text-amber-400">
              {deletedTaskIds.length + deletedRewardIds.length} item(s) pending deletion
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal-passes')} className="oga-btn-secondary">
            Cancel
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="oga-btn-primary flex items-center gap-2 !px-6"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}