import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Zap, Trophy, Star, Calendar, Eye, EyeOff, GripVertical,
  Swords, Handshake, QrCode, Gamepad2, Users, Package,
  PenTool, MapPin, AlertTriangle, Check, X, Settings, Gift,
  Shield, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';

// ─── Task type config ───────────────────────────────────────
const TASK_TYPES = [
  {
    value: 'acquire_character', label: 'Acquire Character', icon: Package, color: 'text-oga-green',
    description: 'Own this OGA', fields: ['target_character_id']
  },
  {
    value: 'irl_autograph', label: 'IRL Autograph', icon: PenTool, color: 'text-purple-400',
    description: 'Get autographed by approved signer', fields: []
  },
  {
    value: 'irl_location_verify', label: 'IRL Location', icon: MapPin, color: 'text-blue-400',
    description: 'Get scanned at an event', fields: []
  },
  {
    value: 'play_in_game', label: 'Play in Game', icon: Gamepad2, color: 'text-cyan-400',
    description: 'Use character in a specific game', fields: ['target_game_id']
  },
  {
    value: 'trade', label: 'Trade', icon: Swords, color: 'text-orange-400',
    description: 'Complete a trade', fields: ['required_count']
  },
  {
    value: 'lend', label: 'Lend', icon: Handshake, color: 'text-yellow-400',
    description: 'Lend this character to a friend', fields: ['required_count']
  },
  {
    value: 'collect_set', label: 'Collect Set', icon: Users, color: 'text-pink-400',
    description: 'Own all characters in an IP collection', fields: []
  },
  {
    value: 'custom', label: 'Custom', icon: Star, color: 'text-gray-400',
    description: 'Free-form task', fields: ['required_count']
  },
];

function getTaskTypeConfig(type) {
  return TASK_TYPES.find((t) => t.value === type) || TASK_TYPES[TASK_TYPES.length - 1];
}

// ─── Main component ─────────────────────────────────────────
export default function PortalPassEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Pass data
  const [pass, setPass] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [permissions, setPermissions] = useState([]);

  // Lookups
  const [characters, setCharacters] = useState([]);
  const [games, setGames] = useState([]);

  // UI
  const [activeSection, setActiveSection] = useState('settings');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);

  // ─── Load data ────────────────────────────────────────────
  const loadPass = useCallback(async () => {
    setLoading(true);
    try {
      // Load pass full data
      const { data, error } = await supabase.rpc('get_portal_pass_full', { p_pass_id: id });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.error) throw new Error(result.error);

      setPass(result.pass);
      setTasks(result.tasks || []);
      setRewards(result.rewards || []);
      setPermissions(result.autograph_permissions || []);

      // Load characters for dropdowns
      const { data: chars } = await supabase.rpc('get_characters_admin');
      setCharacters(chars || []);

      // Load games for dropdowns
      const { data: gamesData } = await supabase.from('game_projects').select('id, name, engine');
      setGames(gamesData || []);
    } catch (err) {
      console.error('Failed to load pass:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPass();
  }, [loadPass]);

  // ─── Save pass settings ───────────────────────────────────
  async function savePass() {
    setSaving(true);
    setSaveMessage('');
    try {
      const { data, error } = await supabase.rpc('upsert_portal_pass', {
        p_id: pass.id,
        p_slug: pass.slug,
        p_name: pass.name,
        p_type: pass.type,
        p_brand_name: pass.brand_name,
        p_brand_logo_url: pass.brand_logo_url,
        p_brand_card_logo_url: pass.brand_card_logo_url,
        p_season_name: pass.season_name,
        p_description: pass.description,
        p_character_id: pass.character_id,
        p_special_reward_name: pass.special_reward_name,
        p_special_reward_description: pass.special_reward_description,
        p_special_reward_image_url: pass.special_reward_image_url,
        p_special_reward_character_id: pass.special_reward_character_id,
        p_gameplay_videos: JSON.stringify(pass.gameplay_videos || []),
        p_is_active: pass.is_active,
        p_total_levels: pass.total_levels || 50,
        p_xp_per_level: pass.xp_per_level || 100,
        p_expires_at: pass.expires_at || null,
      });
      if (error) throw error;
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveMessage('Error saving');
    } finally {
      setSaving(false);
    }
  }

  // ─── Task CRUD ────────────────────────────────────────────
  async function addTask(taskType) {
    const config = getTaskTypeConfig(taskType);
    try {
      const { data, error } = await supabase.rpc('upsert_portal_pass_task', {
        p_pass_id: id,
        p_title: config.label.toUpperCase(),
        p_description: config.description,
        p_task_type: taskType,
        p_xp_reward: 100,
        p_order_index: tasks.length,
        p_level_requirement: 0,
        p_required_count: 1,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        setShowAddTask(false);
        await loadPass();
        setEditingTaskId(result.id);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }

  async function saveTask(task) {
    try {
      const { error } = await supabase.rpc('upsert_portal_pass_task', {
        p_id: task.id,
        p_pass_id: id,
        p_title: task.title,
        p_description: task.description,
        p_task_type: task.task_type,
        p_target_character_id: task.target_character_id || null,
        p_target_value: task.target_value || null,
        p_xp_reward: parseInt(task.xp_reward) || 100,
        p_order_index: task.order_index,
        p_level_requirement: parseInt(task.level_requirement) || 0,
        p_target_game_id: task.target_game_id || null,
        p_required_count: parseInt(task.required_count) || 1,
      });
      if (error) throw error;
      setEditingTaskId(null);
      await loadPass();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      const { error } = await supabase.rpc('delete_portal_pass_task', { p_task_id: taskId });
      if (error) throw error;
      await loadPass();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  async function moveTask(index, direction) {
    const newTasks = [...tasks];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newTasks.length) return;
    [newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]];
    setTasks(newTasks);

    try {
      const orderedIds = newTasks.map((t) => t.id);
      const { error } = await supabase.rpc('reorder_portal_pass_tasks', {
        p_pass_id: id,
        p_ordered_ids: orderedIds,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  }

  // ─── Reward CRUD ──────────────────────────────────────────
  async function addReward() {
    try {
      const { data, error } = await supabase.rpc('upsert_portal_pass_reward', {
        p_pass_id: id,
        p_name: 'New Reward',
        p_level_required: 10,
        p_is_unlocked: false,
        p_sort_order: rewards.length,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        setShowAddReward(false);
        await loadPass();
        setEditingRewardId(result.id);
      }
    } catch (err) {
      console.error('Failed to add reward:', err);
    }
  }

  async function saveReward(reward) {
    try {
      const { error } = await supabase.rpc('upsert_portal_pass_reward', {
        p_id: reward.id,
        p_pass_id: id,
        p_name: reward.name,
        p_image: reward.image || null,
        p_level_required: parseInt(reward.level_required) || 1,
        p_is_unlocked: reward.is_unlocked || false,
        p_sort_order: parseInt(reward.sort_order) || 0,
        p_description: reward.description || null,
      });
      if (error) throw error;
      setEditingRewardId(null);
      await loadPass();
    } catch (err) {
      console.error('Failed to save reward:', err);
    }
  }

  async function deleteReward(rewardId) {
    if (!confirm('Delete this reward?')) return;
    try {
      const { error } = await supabase.rpc('delete_portal_pass_reward', { p_reward_id: rewardId });
      if (error) throw error;
      await loadPass();
    } catch (err) {
      console.error('Failed to delete reward:', err);
    }
  }

  // ─── Pass field updater ───────────────────────────────────
  function updatePass(field, value) {
    setPass((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oga-green" />
      </div>
    );
  }

  if (!pass) {
    return (
      <div className="oga-card p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <p className="text-white text-lg">Pass not found</p>
        <button onClick={() => navigate('/portal-passes')} className="oga-btn-secondary mt-4">
          Back to Passes
        </button>
      </div>
    );
  }

  // ─── Computed values ──────────────────────────────────────
  const totalXP = tasks.reduce((sum, t) => sum + (parseInt(t.xp_reward) || 0), 0);
  const maxLevel = pass.total_levels || 50;
  const xpPerLevel = pass.xp_per_level || 100;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/portal-passes')}
            className="p-2 rounded-lg hover:bg-oga-charcoal transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {pass.name || 'Untitled Pass'}
            </h1>
            <span className="text-xs text-gray-500">{pass.slug}</span>
          </div>
          {pass.is_active ? (
            <span className="oga-badge text-[10px] ml-2">LIVE</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-400 ml-2">
              DRAFT
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm font-semibold ${saveMessage === 'Saved!' ? 'text-oga-green' : 'text-red-400'}`}>
              {saveMessage}
            </span>
          )}
          <button onClick={savePass} disabled={saving} className="oga-btn-primary flex items-center gap-2">
            <Save size={14} />
            {saving ? 'SAVING...' : 'SAVE PASS'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column — Form */}
        <div className="xl:col-span-2 space-y-4">
          {/* Section nav */}
          <div className="flex gap-1 bg-oga-charcoal rounded-lg p-1 overflow-x-auto">
            {[
              { key: 'settings', label: 'Settings', icon: Settings },
              { key: 'tasks', label: `Tasks (${tasks.length})`, icon: Zap },
              { key: 'rewards', label: `Rewards (${rewards.length})`, icon: Trophy },
              { key: 'special', label: 'Special Reward', icon: Gift },
              { key: 'autographs', label: 'Autographs', icon: PenTool },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase rounded-md transition-colors whitespace-nowrap ${activeSection === key
                    ? 'bg-oga-green/20 text-oga-green'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="oga-card p-6 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Pass Settings</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="oga-label">Pass Name</label>
                  <input
                    type="text"
                    value={pass.name || ''}
                    onChange={(e) => updatePass('name', e.target.value)}
                    className="oga-input w-full"
                    placeholder="FINAL BOSS SOUR × OGA"
                  />
                </div>
                <div>
                  <label className="oga-label">Slug</label>
                  <input
                    type="text"
                    value={pass.slug || ''}
                    onChange={(e) => updatePass('slug', e.target.value)}
                    className="oga-input w-full"
                    placeholder="fbs_season_1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="oga-label">Type</label>
                  <select
                    value={pass.type || 'brand_campaign'}
                    onChange={(e) => updatePass('type', e.target.value)}
                    className="oga-select w-full"
                  >
                    <option value="brand_campaign">Brand Campaign</option>
                    <option value="character_pass">Character Pass</option>
                    <option value="event_pass">Event Pass</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                <div>
                  <label className="oga-label">Season Name</label>
                  <input
                    type="text"
                    value={pass.season_name || ''}
                    onChange={(e) => updatePass('season_name', e.target.value)}
                    className="oga-input w-full"
                    placeholder="SEASON 1"
                  />
                </div>
              </div>

              <div>
                <label className="oga-label">Description</label>
                <textarea
                  value={pass.description || ''}
                  onChange={(e) => updatePass('description', e.target.value)}
                  className="oga-input w-full h-24 resize-none"
                  placeholder="Describe what players need to do..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="oga-label">Brand Name</label>
                  <input
                    type="text"
                    value={pass.brand_name || ''}
                    onChange={(e) => updatePass('brand_name', e.target.value)}
                    className="oga-input w-full"
                  />
                </div>
                <div>
                  <label className="oga-label">Linked Character</label>
                  <select
                    value={pass.character_id || ''}
                    onChange={(e) => updatePass('character_id', e.target.value || null)}
                    className="oga-select w-full"
                  >
                    <option value="">None (brand-level pass)</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="oga-label">Expires</label>
                  <input
                    type="date"
                    value={pass.expires_at ? pass.expires_at.split('T')[0] : ''}
                    onChange={(e) =>
                      updatePass('expires_at', e.target.value ? e.target.value + 'T23:59:59Z' : null)
                    }
                    className="oga-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="oga-label">Total Levels</label>
                  <input
                    type="number"
                    value={pass.total_levels || 50}
                    onChange={(e) => updatePass('total_levels', parseInt(e.target.value) || 50)}
                    className="oga-input w-full"
                    min="1"
                    max="200"
                  />
                </div>
                <div>
                  <label className="oga-label">XP Per Level</label>
                  <input
                    type="number"
                    value={pass.xp_per_level || 100}
                    onChange={(e) => updatePass('xp_per_level', parseInt(e.target.value) || 100)}
                    className="oga-input w-full"
                    min="1"
                  />
                </div>
                <div>
                  <label className="oga-label">Status</label>
                  <button
                    onClick={() => updatePass('is_active', !pass.is_active)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${pass.is_active
                        ? 'border-oga-green/40 bg-oga-green/10 text-oga-green'
                        : 'border-gray-700 bg-oga-charcoal text-gray-400'
                      }`}
                  >
                    {pass.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {pass.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
              </div>

              {/* Brand logos */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                <div>
                  <label className="oga-label">Brand Logo URL (Co-brand)</label>
                  <input
                    type="text"
                    value={pass.brand_logo_url || ''}
                    onChange={(e) => updatePass('brand_logo_url', e.target.value)}
                    className="oga-input w-full"
                    placeholder="https://..."
                  />
                  {pass.brand_logo_url && (
                    <img src={pass.brand_logo_url} alt="Brand logo" className="h-12 mt-2 rounded bg-black/50 p-1" />
                  )}
                </div>
                <div>
                  <label className="oga-label">Brand Card Logo URL</label>
                  <input
                    type="text"
                    value={pass.brand_card_logo_url || ''}
                    onChange={(e) => updatePass('brand_card_logo_url', e.target.value)}
                    className="oga-input w-full"
                    placeholder="https://..."
                  />
                  {pass.brand_card_logo_url && (
                    <img src={pass.brand_card_logo_url} alt="Card logo" className="h-12 mt-2 rounded bg-black/50 p-1" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {activeSection === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tasks</h2>
                  <span className="text-xs text-gray-500">
                    {totalXP} total XP across {tasks.length} tasks
                  </span>
                </div>
                <button
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="oga-btn-primary text-xs flex items-center gap-1"
                >
                  <Plus size={14} />
                  ADD TASK
                </button>
              </div>

              {/* Add task type picker */}
              {showAddTask && (
                <div className="oga-card p-4">
                  <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                    Choose task type:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TASK_TYPES.map((tt) => {
                      const Icon = tt.icon;
                      return (
                        <button
                          key={tt.value}
                          onClick={() => addTask(tt.value)}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-800 hover:border-oga-green/40 hover:bg-oga-green/5 transition-all text-center"
                        >
                          <Icon size={20} className={tt.color} />
                          <span className="text-[11px] font-semibold text-white">{tt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task list */}
              {tasks.length === 0 ? (
                <div className="oga-card p-8 text-center">
                  <Zap size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">No tasks yet. Add your first task above.</p>
                </div>
              ) : (
                tasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    total={tasks.length}
                    isEditing={editingTaskId === task.id}
                    characters={characters}
                    games={games}
                    onEdit={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
                    onSave={saveTask}
                    onDelete={() => deleteTask(task.id)}
                    onMove={(dir) => moveTask(idx, dir)}
                  />
                ))
              )}
            </div>
          )}

          {/* Rewards Section */}
          {activeSection === 'rewards' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Level Rewards</h2>
                <button onClick={addReward} className="oga-btn-primary text-xs flex items-center gap-1">
                  <Plus size={14} />
                  ADD REWARD
                </button>
              </div>

              {rewards.length === 0 ? (
                <div className="oga-card p-8 text-center">
                  <Trophy size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">No level rewards yet.</p>
                </div>
              ) : (
                rewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    isEditing={editingRewardId === reward.id}
                    onEdit={() => setEditingRewardId(editingRewardId === reward.id ? null : reward.id)}
                    onSave={saveReward}
                    onDelete={() => deleteReward(reward.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Special Reward Section */}
          {activeSection === 'special' && (
            <div className="oga-card p-6 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Special Reward (Completion Prize)
              </h2>
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                The big reward players get for completing all tasks. Shows prominently on the pass screen.
              </p>

              <div>
                <label className="oga-label">Reward Name</label>
                <input
                  type="text"
                  value={pass.special_reward_name || ''}
                  onChange={(e) => updatePass('special_reward_name', e.target.value)}
                  className="oga-input w-full"
                  placeholder="THE FINAL BOSS"
                />
              </div>

              <div>
                <label className="oga-label">Description</label>
                <textarea
                  value={pass.special_reward_description || ''}
                  onChange={(e) => updatePass('special_reward_description', e.target.value)}
                  className="oga-input w-full h-24 resize-none"
                  placeholder="Describe what makes this reward special..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="oga-label">Reward Image URL</label>
                  <input
                    type="text"
                    value={pass.special_reward_image_url || ''}
                    onChange={(e) => updatePass('special_reward_image_url', e.target.value)}
                    className="oga-input w-full"
                    placeholder="https://..."
                  />
                  {pass.special_reward_image_url && (
                    <img
                      src={pass.special_reward_image_url}
                      alt="Special reward"
                      className="h-24 w-24 mt-2 rounded-lg object-cover bg-black/50"
                    />
                  )}
                </div>
                <div>
                  <label className="oga-label">Reward Character ID</label>
                  <select
                    value={pass.special_reward_character_id || ''}
                    onChange={(e) => updatePass('special_reward_character_id', e.target.value || null)}
                    className="oga-select w-full"
                  >
                    <option value="">None (non-character reward)</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Autograph Permissions Section */}
          {activeSection === 'autographs' && (
            <div className="oga-card p-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Autograph Permissions
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Characters referenced in this pass's tasks that have autograph permissions configured.
                Manage permissions via the <span className="text-oga-green">autograph_permissions</span> table.
              </p>

              {permissions.length === 0 ? (
                <div className="text-center py-6">
                  <Shield size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">
                    No autograph permissions configured for characters in this pass.
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Add IRL Autograph tasks first, then configure signer permissions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between py-3 px-4 bg-black/30 rounded-lg border border-gray-800"
                    >
                      <div>
                        <span className="text-white text-sm font-semibold">{perm.signer_email}</span>
                        <span className="text-gray-500 text-xs ml-2">→ {perm.character_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {perm.event_scope && (
                          <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">
                            {perm.event_scope}
                          </span>
                        )}
                        {perm.valid_until && (
                          <span>expires {new Date(perm.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — Preview */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* XP Summary */}
            <div className="oga-card p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">XP Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-oga-green">{totalXP}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Total XP</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{tasks.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Tasks</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{rewards.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Rewards</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.min(Math.floor(totalXP / xpPerLevel), maxLevel)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">Max Level</div>
                </div>
              </div>
            </div>

            {/* Milestone Preview */}
            <div className="oga-card p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Milestone Track
              </h3>
              <MilestonePreview
                tasks={tasks}
                rewards={rewards}
                xpPerLevel={xpPerLevel}
                maxLevel={maxLevel}
                specialRewardName={pass.special_reward_name}
              />
            </div>

            {/* Pass Info */}
            <div className="oga-card p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pass Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="text-gray-300 font-mono text-[10px]">{pass.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-white">{pass.type?.replace('_', ' ')}</span>
                </div>
                {pass.brand_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Brand</span>
                    <span className="text-white">{pass.brand_name}</span>
                  </div>
                )}
                {pass.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires</span>
                    <span className="text-white">{new Date(pass.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════
// TaskCard component
// ═════════════════════════════════════════════════════════════
function TaskCard({ task, index, total, isEditing, characters, games, onEdit, onSave, onDelete, onMove }) {
  const [form, setForm] = useState({ ...task });
  const config = getTaskTypeConfig(task.task_type);
  const Icon = config.icon;

  useEffect(() => {
    setForm({ ...task });
  }, [task, isEditing]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className={`oga-card transition-all ${isEditing ? 'border-oga-green/40 ring-1 ring-oga-green/20' : ''}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className={`p-2 rounded-lg bg-black/40 ${config.color}`}>
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm truncate">{task.title}</span>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{task.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-oga-green">{task.xp_reward} XP</span>
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-gray-800 transition-colors">
            {isEditing ? <X size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="oga-label">Title</label>
              <input
                type="text"
                value={form.title || ''}
                onChange={(e) => update('title', e.target.value)}
                className="oga-input w-full"
              />
            </div>
            <div>
              <label className="oga-label">Task Type</label>
              <select
                value={form.task_type || 'custom'}
                onChange={(e) => update('task_type', e.target.value)}
                className="oga-select w-full"
              >
                {TASK_TYPES.map((tt) => (
                  <option key={tt.value} value={tt.value}>
                    {tt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="oga-label">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
              className="oga-input w-full h-16 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="oga-label">XP Reward</label>
              <input
                type="number"
                value={form.xp_reward || 100}
                onChange={(e) => update('xp_reward', e.target.value)}
                className="oga-input w-full"
                min="0"
              />
            </div>
            <div>
              <label className="oga-label">Level Req.</label>
              <input
                type="number"
                value={form.level_requirement || 0}
                onChange={(e) => update('level_requirement', e.target.value)}
                className="oga-input w-full"
                min="0"
              />
            </div>
            <div>
              <label className="oga-label">Required Count</label>
              <input
                type="number"
                value={form.required_count || 1}
                onChange={(e) => update('required_count', e.target.value)}
                className="oga-input w-full"
                min="1"
              />
            </div>
          </div>

          {/* Conditional fields based on task type */}
          {['acquire_character', 'collect_set'].includes(form.task_type) && (
            <div>
              <label className="oga-label">Target Character</label>
              <select
                value={form.target_character_id || ''}
                onChange={(e) => update('target_character_id', e.target.value || null)}
                className="oga-select w-full"
              >
                <option value="">Select character...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.task_type === 'play_in_game' && (
            <div>
              <label className="oga-label">Target Game</label>
              <select
                value={form.target_game_id || ''}
                onChange={(e) => update('target_game_id', e.target.value || null)}
                className="oga-select w-full"
              >
                <option value="">Select game...</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.engine})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <button
              onClick={() => onDelete()}
              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
            >
              <Trash2 size={13} />
              Delete
            </button>
            <div className="flex gap-2">
              <button onClick={onEdit} className="oga-btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={() => onSave(form)} className="oga-btn-primary text-xs flex items-center gap-1">
                <Check size={13} />
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════
// RewardCard component
// ═════════════════════════════════════════════════════════════
function RewardCard({ reward, isEditing, onEdit, onSave, onDelete }) {
  const [form, setForm] = useState({ ...reward });

  useEffect(() => {
    setForm({ ...reward });
  }, [reward, isEditing]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className={`oga-card transition-all ${isEditing ? 'border-yellow-500/40 ring-1 ring-yellow-500/20' : ''}`}>
      <div className="flex items-center gap-3 p-4">
        {reward.image ? (
          <img
            src={reward.image.startsWith('http') ? reward.image : `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/characters/${reward.image}`}
            alt={reward.name}
            className="h-12 w-12 rounded-lg object-cover bg-black/50"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-black/40 flex items-center justify-center">
            <Trophy size={20} className="text-yellow-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-sm">{reward.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-yellow-500 font-semibold">Level {reward.level_required}</span>
            {reward.is_unlocked && (
              <span className="text-[10px] text-oga-green font-semibold">UNLOCKED</span>
            )}
          </div>
        </div>

        <button onClick={onEdit} className="p-1.5 rounded hover:bg-gray-800 transition-colors">
          {isEditing ? <X size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </button>
      </div>

      {isEditing && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="oga-label">Reward Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => update('name', e.target.value)}
                className="oga-input w-full"
              />
            </div>
            <div>
              <label className="oga-label">Level Required</label>
              <input
                type="number"
                value={form.level_required || 1}
                onChange={(e) => update('level_required', e.target.value)}
                className="oga-input w-full"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="oga-label">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
              className="oga-input w-full h-16 resize-none"
              placeholder="What does the player get?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="oga-label">Image Path / URL</label>
              <input
                type="text"
                value={form.image || ''}
                onChange={(e) => update('image', e.target.value)}
                className="oga-input w-full"
                placeholder="pass-rewards/reward.png"
              />
            </div>
            <div>
              <label className="oga-label">Sort Order</label>
              <input
                type="number"
                value={form.sort_order || 0}
                onChange={(e) => update('sort_order', e.target.value)}
                className="oga-input w-full"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <button
              onClick={() => onDelete()}
              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
            >
              <Trash2 size={13} />
              Delete
            </button>
            <div className="flex gap-2">
              <button onClick={onEdit} className="oga-btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={() => onSave(form)} className="oga-btn-primary text-xs flex items-center gap-1">
                <Check size={13} />
                Save Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════
// MilestonePreview — visual track on the right
// ═════════════════════════════════════════════════════════════
function MilestonePreview({ tasks, rewards, xpPerLevel, maxLevel, specialRewardName }) {
  // Build milestone nodes: tasks (by cumulative XP → level) + rewards (by level_required)
  const nodes = [];

  // Tasks as milestones
  let cumulativeXP = 0;
  tasks.forEach((task) => {
    cumulativeXP += parseInt(task.xp_reward) || 0;
    const level = Math.min(Math.floor(cumulativeXP / xpPerLevel), maxLevel);
    nodes.push({
      type: 'task',
      label: task.title,
      xp: parseInt(task.xp_reward) || 0,
      level,
      taskType: task.task_type,
      cumulativeXP,
    });
  });

  // Rewards as milestones
  rewards.forEach((reward) => {
    nodes.push({
      type: 'reward',
      label: reward.name,
      level: parseInt(reward.level_required) || 0,
      image: reward.image,
    });
  });

  // Sort all by level
  nodes.sort((a, b) => a.level - b.level || (a.type === 'task' ? -1 : 1));

  if (nodes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 text-xs">Add tasks and rewards to see the milestone track</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />

      <div className="space-y-3">
        {nodes.map((node, i) => {
          const config = node.taskType ? getTaskTypeConfig(node.taskType) : null;
          const Icon = config?.icon || Trophy;
          const isReward = node.type === 'reward';

          return (
            <div key={i} className="flex items-start gap-3 relative pl-2">
              {/* Node dot */}
              <div
                className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 ${isReward
                    ? 'border-yellow-500 bg-yellow-500/20'
                    : 'border-gray-600 bg-oga-charcoal'
                  }`}
              >
                {isReward ? (
                  <Trophy size={10} className="text-yellow-500" />
                ) : (
                  <Icon size={10} className={config?.color || 'text-gray-400'} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 -mt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold truncate ${isReward ? 'text-yellow-400' : 'text-white'
                      }`}
                  >
                    {node.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-600">LVL {node.level}</span>
                  {!isReward && (
                    <span className="text-[10px] text-oga-green font-semibold">+{node.xp} XP</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Special reward at the end */}
        {specialRewardName && (
          <div className="flex items-start gap-3 relative pl-2">
            <div className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 border-oga-green bg-oga-green/20 shrink-0">
              <Star size={10} className="text-oga-green" />
            </div>
            <div className="flex-1 -mt-0.5">
              <span className="text-xs font-bold text-oga-green">{specialRewardName}</span>
              <div className="text-[10px] text-gray-600 mt-0.5">COMPLETION REWARD</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
