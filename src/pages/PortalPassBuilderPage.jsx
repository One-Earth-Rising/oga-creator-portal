import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  GripVertical, Swords, QrCode, MapPin, Gamepad2, ArrowLeftRight,
  HandHelping, LayoutGrid, Wrench, Trophy, Star, Gift, Clock,
  Eye, EyeOff, AlertCircle, Check, X, MoveUp, MoveDown, Sparkles, Copy
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
function Section({ title, icon: Icon, children, defaultOpen = true, count, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="oga-card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
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

// ─── Milestone Preview ──────────────────────────────────────────────
function MilestonePreview({ tasks, rewards, totalLevels, xpPerLevel }) {
  if (!totalLevels || totalLevels <= 0) return null;

  const totalXP = totalLevels * xpPerLevel;
  const markers = [];

  // Map tasks to positions
  tasks.forEach((t) => {
    const levelPos = (t.level_requirement || 0) / totalLevels;
    markers.push({
      pos: Math.min(levelPos, 1),
      label: t.title || 'Task',
      type: 'task',
      color: TASK_TYPES[t.task_type]?.color || '#94A3B8',
      xp: t.xp_reward,
      level: t.level_requirement || 0,
    });
  });

  // Map rewards to positions
  rewards.forEach((r) => {
    const levelPos = (r.level_required || 0) / totalLevels;
    markers.push({
      pos: Math.min(levelPos, 1),
      label: r.name || 'Reward',
      type: 'reward',
      color: '#FFD700',
      level: r.level_required,
    });
  });

  // Sort by position
  markers.sort((a, b) => a.pos - b.pos);

  return (
    <div className="space-y-4 pt-4">
      {/* XP summary */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>Total Levels: <strong className="text-white">{totalLevels}</strong></span>
        <span>XP/Level: <strong className="text-white">{xpPerLevel}</strong></span>
        <span>Total XP: <strong className="text-[#39FF14]">{totalXP.toLocaleString()}</strong></span>
        <span>Task XP Pool: <strong className="text-[#39FF14]">{tasks.reduce((s, t) => s + (t.xp_reward || 0), 0).toLocaleString()}</strong></span>
      </div>

      {/* Track */}
      <div className="relative">
        {/* Base track */}
        <div className="h-2 bg-[#2C2C2C] rounded-full relative overflow-visible">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#39FF14]/20 to-[#39FF14]/5" />
        </div>

        {/* Markers */}
        <div className="relative h-20 mt-1">
          {markers.map((m, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${Math.max(2, Math.min(m.pos * 100, 96))}%`, transform: 'translateX(-50%)' }}
            >
              {/* Dot */}
              <div
                className="w-3 h-3 rounded-full border-2 -mt-[10px]"
                style={{
                  backgroundColor: m.color,
                  borderColor: m.type === 'reward' ? '#FFD700' : m.color,
                  boxShadow: `0 0 6px ${m.color}40`,
                }}
              />
              {/* Label */}
              <div className={`mt-1 text-center max-w-[80px] ${i % 2 === 0 ? '' : 'mt-8'}`}>
                <div className="text-[9px] font-bold truncate" style={{ color: m.color }}>
                  {m.label}
                </div>
                <div className="text-[8px] text-gray-500">
                  Lv.{m.level}
                  {m.xp ? ` · ${m.xp}XP` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Level markers at 25%, 50%, 75%, 100% */}
        <div className="flex justify-between text-[9px] text-gray-600 mt-1 px-1">
          <span>Lv.0</span>
          <span>Lv.{Math.round(totalLevels * 0.25)}</span>
          <span>Lv.{Math.round(totalLevels * 0.5)}</span>
          <span>Lv.{Math.round(totalLevels * 0.75)}</span>
          <span>Lv.{totalLevels}</span>
        </div>
      </div>
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

  // Pass data
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

      if (!isNew) {
        // Load full pass via RPC
        const { data, error } = await supabase.rpc('get_portal_pass_full', { p_pass_id: id });
        if (error) throw error;

        if (data) {
          const passData = Array.isArray(data) ? data[0] : data;

          // Separate pass fields from nested tasks/rewards
          const { tasks: loadedTasks, rewards: loadedRewards, ...passFields } = passData;

          // Format expires_at for datetime-local input
          if (passFields.expires_at) {
            passFields.expires_at = new Date(passFields.expires_at).toISOString().slice(0, 16);
          }

          setPass(prev => ({ ...prev, ...passFields, id: passFields.id || id }));
          setTasks((loadedTasks || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
          setRewards((loadedRewards || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
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

  // ── Duplicate Pass ────────────────────────────────────────────────
  const handleDuplicate = async () => {
    setSaving(true);
    try {
      const newSlug = `${pass.slug}_copy_${Date.now()}`;

      // 1. Create the duplicated pass (null ID triggers INSERT path)
      const { data: passData, error: passError } = await supabase.rpc('upsert_portal_pass', {
        p_id: null,
        p_slug: newSlug,
        p_name: `${pass.name} (Copy)`,
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
        p_is_active: false,
        p_total_levels: pass.total_levels || 50,
        p_xp_per_level: pass.xp_per_level || 100,
        p_expires_at: pass.expires_at ? new Date(pass.expires_at).toISOString() : null,
      });
      console.log('Duplicate pass RPC:', JSON.stringify(passData), 'error:', passError);
      if (passError) throw passError;
      if (passData && passData.error) throw new Error(passData.error);

      const newId = passData.id;
      if (!newId) throw new Error('No ID returned from pass creation');

      // 2. Duplicate all tasks
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

      // 3. Duplicate all rewards
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
      // The RPC cascades tasks + rewards internally, so just call delete_portal_pass
      const passIdToDelete = pass.id || id;
      console.log('Deleting pass with ID:', passIdToDelete, 'pass.id:', pass.id, 'url id:', id);
      const { data, error } = await supabase.rpc('delete_portal_pass', { p_pass_id: passIdToDelete });
      console.log('Delete RPC response:', JSON.stringify(data), 'error:', error);

      if (error) throw error;

      // RPC returns JSON — check for app-level error
      if (data && data.error) {
        throw new Error(data.error);
      }

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
      // 1. Save pass
      const passIdParam = isNew ? null : (pass.id || id);

      const { data: passResult, error: passError } = await supabase.rpc('upsert_portal_pass', {
        p_id: passIdParam,
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
        p_is_active: pass.is_active,
        p_total_levels: pass.total_levels || 50,
        p_xp_per_level: pass.xp_per_level || 100,
        p_expires_at: pass.expires_at ? new Date(pass.expires_at).toISOString() : null,
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

      setDeletedTaskIds([]);
      setDeletedRewardIds([]);
      showToast('Portal Pass saved successfully');

      // If new pass, redirect to the edit URL
      if (isNew) {
        navigate(`/portal-passes/${passId}`, { replace: true });
      } else {
        // Reload to get fresh IDs for any temp items
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

      {/* ─── Pass Settings ───────────────────────────────────────── */}
      <Section title="Pass Settings" icon={Sparkles} defaultOpen={isNew}>
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
              <Select
                value={pass.character_id}
                onChange={(v) => updatePass('character_id', v)}
                placeholder="None (multi-character pass)"
                options={characters.map(c => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Expires At">
              <input
                type="datetime-local"
                value={pass.expires_at || ''}
                onChange={(e) => updatePass('expires_at', e.target.value)}
                className="oga-input"
              />
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={pass.description} onChange={(v) => updatePass('description', v)} placeholder="Describe the pass to players" />
          </Field>

          {/* Brand Fields */}
          <div className="border-t border-[#2C2C2C] pt-4 mt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Brand / Co-Brand</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Brand Name">
                <TextInput value={pass.brand_name} onChange={(v) => updatePass('brand_name', v)} placeholder="e.g., Final Boss Sour" />
              </Field>
              <Field label="Brand Logo">
                <ImageUploader
                  value={pass.brand_logo_url}
                  onChange={(v) => updatePass('brand_logo_url', v)}
                  pathPrefix="brands"
                  label="Brand logo"
                />
              </Field>
              <Field label="Brand Card Logo">
                <ImageUploader
                  value={pass.brand_card_logo_url}
                  onChange={(v) => updatePass('brand_card_logo_url', v)}
                  pathPrefix="brands"
                  label="Brand card logo"
                />
              </Field>
            </div>
          </div>

          {/* XP Curve */}
          <div className="border-t border-[#2C2C2C] pt-4 mt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">XP Curve</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Total Levels">
                <NumberInput value={pass.total_levels} onChange={(v) => updatePass('total_levels', v)} min={1} max={999} />
              </Field>
              <Field label="XP per Level">
                <NumberInput value={pass.xp_per_level} onChange={(v) => updatePass('xp_per_level', v)} min={1} />
              </Field>
              <Field label="Total XP">
                <div className="oga-input bg-[#121212] text-[#39FF14] font-bold cursor-default">
                  {((pass.total_levels || 0) * (pass.xp_per_level || 0)).toLocaleString()}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Tasks ───────────────────────────────────────────────── */}
      <Section title="Tasks" icon={Swords} count={tasks.length} defaultOpen={true}>
        <div className="space-y-2 pt-4">
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Swords size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks yet. Add your first task to get started.</p>
            </div>
          )}

          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              total={tasks.length}
              characters={characters}
              games={games}
              onChange={(updated) => updateTask(i, updated)}
              onDelete={() => deleteTask(i)}
              onMoveUp={() => moveTask(i, -1)}
              onMoveDown={() => moveTask(i, 1)}
            />
          ))}

          <button
            onClick={() => setShowTaskPalette(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C]
              rounded-lg text-gray-500 hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Task</span>
          </button>
        </div>
      </Section>

      {/* ─── Rewards ─────────────────────────────────────────────── */}
      <Section title="Level Rewards" icon={Gift} count={rewards.length}>
        <div className="space-y-2 pt-4">
          {rewards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Gift size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No rewards yet. Add milestone rewards at level thresholds.</p>
            </div>
          )}

          {rewards.map((reward, i) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onChange={(updated) => updateReward(i, updated)}
              onDelete={() => deleteReward(i)}
            />
          ))}

          <button
            onClick={addReward}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C]
              rounded-lg text-gray-500 hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Reward</span>
          </button>
        </div>
      </Section>

      {/* ─── Special Reward (Completion Prize) ───────────────────── */}
      <Section title="Special Reward" icon={Trophy} badge="Completion Prize">
        <div className="space-y-4 pt-4">
          <p className="text-xs text-gray-500">
            The special reward is granted when a player completes the entire pass. This is the "boss drop" — the big incentive.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Reward Name">
              <TextInput value={pass.special_reward_name} onChange={(v) => updatePass('special_reward_name', v)} placeholder="e.g., THE FINAL BOSS" />
            </Field>
            <Field label="Granted Character">
              <Select
                value={pass.special_reward_character_id}
                onChange={(v) => updatePass('special_reward_character_id', v)}
                placeholder="None (cosmetic reward only)"
                options={characters.map(c => ({ value: c.id, label: c.name }))}
              />
            </Field>
          </div>
          <Field label="Description">
            <TextArea
              value={pass.special_reward_description}
              onChange={(v) => updatePass('special_reward_description', v)}
              placeholder="Describe the ultimate reward"
            />
          </Field>
          <Field label="Reward Image">
            <ImageUploader
              value={pass.special_reward_image_url}
              onChange={(v) => updatePass('special_reward_image_url', v)}
              pathPrefix="pass-special"
              label="Special reward"
            />
          </Field>
        </div>
      </Section>

      {/* ─── Milestone Preview ───────────────────────────────────── */}
      <Section title="Milestone Preview" icon={Eye} defaultOpen={true}>
        <MilestonePreview
          tasks={tasks}
          rewards={rewards}
          totalLevels={pass.total_levels || 50}
          xpPerLevel={pass.xp_per_level || 100}
        />
      </Section>

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
