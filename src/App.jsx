import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Importing Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
// Importing icons
import { Coffee, Clock, Edit, Trash2, Plus, X, Info, Activity, Settings, BarChart2, Calendar, ChevronLeft, ChevronRight, AlertCircle, Save, Award, Heart, PieChart, Sliders, Thermometer, Download, Upload, RotateCcw, HelpCircle, Search, Filter, Star, Leaf, CupSoda, GlassWater, Snowflake, Sun } from 'lucide-react'; // Added more icons

// --- Constants and Defaults ---

// Define default settings outside the component for reuse
const defaultSettings = {
  weight: 60, // 默认体重（kg）
  gender: 'male', // 默认性别
  maxDailyCaffeine: 400, // 默认每日最大咖啡因摄入量（mg）
  safeBeforeSleepCaffeine: 50, // 默认睡前安全咖啡因水平（mg）
  plannedSleepTime: '22:00', // 默认计划睡眠时间
  caffeineHalfLifeHours: 5, // 默认咖啡因半衰期（小时）
};

// Define initial preset drinks data with categories and reordered
// Categories: 通用, 连锁咖啡, 茶饮, 速溶, 其他
const initialPresetDrinks = [
    // --- 通用 (Generic) ---
    { id: 'preset-espresso', name: '浓缩咖啡', category: '通用', caffeineContent: 212, defaultVolume: 30, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-drip', name: '滴滤咖啡', category: '通用', caffeineContent: 95, defaultVolume: 240, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-americano-generic', name: '美式咖啡', category: '通用', caffeineContent: 80, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-latte-generic', name: '拿铁咖啡', category: '通用', caffeineContent: 55, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-cappuccino', name: '卡布奇诺', category: '通用', caffeineContent: 60, defaultVolume: 240, isPreset: true, isDeletable: false, isEditable: true },

    // --- 连锁咖啡 (Coffee Chains - Ordered by perceived popularity) ---
    { id: 'preset-starbucks-americano', name: '星巴克 美式', category: '连锁咖啡', caffeineContent: 38.59, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-starbucks-latte', name: '星巴克 拿铁', category: '连锁咖啡', caffeineContent: 27.89, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-luckin-americano', name: '瑞幸 美式', category: '连锁咖啡', caffeineContent: 50, defaultVolume: 450, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-luckin-latte', name: '瑞幸 拿铁', category: '连锁咖啡', caffeineContent: 33.33, defaultVolume: 450, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-manner-americano', name: 'MANNER 美式', category: '连锁咖啡', caffeineContent: 56.34, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-manner-latte', name: 'MANNER 拿铁', category: '连锁咖啡', caffeineContent: 52.39, defaultVolume: 355, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-costa-americano', name: 'COSTA 美式', category: '连锁咖啡', caffeineContent: 47.29, defaultVolume: 480, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-costa-latte', name: 'COSTA 拿铁', category: '连锁咖啡', caffeineContent: 36.88, defaultVolume: 480, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-mcd-americano', name: '麦当劳 美式', category: '连锁咖啡', caffeineContent: 44.4, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-mcd-latte', name: '麦当劳 拿铁', category: '连锁咖啡', caffeineContent: 42.75, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-kfc-americano', name: '肯德基 美式', category: '连锁咖啡', caffeineContent: 37.50, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-kfc-latte', name: '肯德基 拿铁', category: '连锁咖啡', caffeineContent: 16.50, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-tims-americano', name: 'Tims 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 350, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-tims-latte', name: 'Tims 拿铁', category: '连锁咖啡', caffeineContent: 22.57, defaultVolume: 350, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-cotti-americano', name: 'COTTI 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-cotti-latte', name: 'COTTI 拿铁', category: '连锁咖啡', caffeineContent: 43.00, defaultVolume: 400, isPreset: true, isDeletable: false, isEditable: true },

    // --- 茶饮 (Tea) ---
    { id: 'preset-black-tea', name: '红茶', category: '茶饮', caffeineContent: 47, defaultVolume: 240, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-green-tea', name: '绿茶', category: '茶饮', caffeineContent: 28, defaultVolume: 240, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-chagee', name: '霸王茶姬 (标准杯)', category: '茶饮', caffeineContent: 35, defaultVolume: 500, isPreset: true, isDeletable: false, isEditable: true },

    // --- 速溶 (Instant) ---
    { id: 'preset-instant', name: '速溶咖啡', category: '速溶', caffeineContent: 62, defaultVolume: 240, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-nescafe-gold', name: '雀巢 金牌', category: '速溶', caffeineContent: 40, defaultVolume: 150, isPreset: true, isDeletable: false, isEditable: true },

    // --- 其他 (Other) ---
    { id: 'preset-cola', name: '可乐', category: '其他', caffeineContent: 10, defaultVolume: 330, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-energy', name: '能量饮料', category: '其他', caffeineContent: 32, defaultVolume: 250, isPreset: true, isDeletable: false, isEditable: true },
    { id: 'preset-dark-chocolate', name: '黑巧克力(100g)', category: '其他', caffeineContent: 43, defaultVolume: 100, isPreset: true, isDeletable: false, isEditable: true }, // Note: Unit inconsistency
];


// Coffee-themed color palette for charts
const COFFEE_COLORS = {
  espresso: '#4a2c2a', // Dark brown
  latte: '#c69c6d',    // Light brown/beige
  cappuccino: '#a0522d', // Sienna/Medium brown
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  accent: '#8b4513', // Saddle brown
  grid: '#d2b48c', // Tan (for grid lines)
  tooltipBg: 'rgba(255, 255, 255, 0.9)', // White with opacity
  tooltipText: '#4a2c2a',
};

// --- Helper Functions ---

// Format date to YYYY-MM-DDTHH:mm for datetime-local input
const formatDatetimeLocal = (date) => {
  const d = new Date(date);
  // Adjust for timezone offset to display correctly in datetime-local input
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  try {
    return d.toISOString().slice(0, 16);
  } catch (e) {
    console.error("Error formatting date:", date, e);
    // Return current time as fallback
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
};

// Format timestamp to readable time (HH:MM)
const formatTime = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    console.error("Error formatting time:", timestamp, e);
    return "无效时间";
  }
};

// Format timestamp to readable date (Locale default)
const formatDate = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  } catch (e) {
    console.error("Error formatting date:", timestamp, e);
    return "无效日期";
  }
};

// Get start of the day (00:00:00) for a given date
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Get end of the day (23:59:59.999) for a given date
const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

// Get start of the week (Monday) for a given date
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday = 0, Monday = 1, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Get end of the week (Sunday) for a given date
const getEndOfWeek = (date) => {
  const startOfWeek = getStartOfWeek(date);
  const d = new Date(startOfWeek);
  d.setDate(d.getDate() + 6); // Add 6 days to get Sunday
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

// Get start of the month (1st day) for a given date
const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Get end of the month (last day) for a given date
const getEndOfMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1); // Go to next month
  d.setDate(0); // Go back to the last day of the previous month
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

// Get start of the year (Jan 1st) for a given date
const getStartOfYear = (date) => {
    const d = new Date(date);
    d.setMonth(0, 1); // Set to January 1st
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

// Get end of the year (Dec 31st) for a given date
const getEndOfYear = (date) => {
    const d = new Date(date);
    d.setFullYear(d.getFullYear(), 11, 31); // Set to December 31st
    d.setHours(23, 59, 59, 999);
    return d.getTime();
};

// Check if a date is today
const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// Check if a date is in the future (strictly after today)
const isFuture = (date) => {
    const today = new Date();
    today.setHours(0,0,0,0); // Compare start of day
    const compareDate = new Date(date);
    compareDate.setHours(0,0,0,0);
    return compareDate > today;
}

// --- Drink Selector Component ---
const DrinkSelector = ({ drinks, selectedDrinkId, onSelectDrink, onClearSelection }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', '通用', '连锁咖啡', etc.

    // Memoize categories to avoid recalculating on every render
    const categories = useMemo(() => {
        const cats = new Set(drinks.map(d => d.category || '自定义')); // Include '自定义' for uncategorized custom drinks
        return ['all', ...Array.from(cats).sort()]; // Add 'all' and sort
    }, [drinks]);

    // Memoize filtered drinks
    const filteredDrinks = useMemo(() => {
        return drinks.filter(drink => {
            const nameMatch = drink.name.toLowerCase().includes(searchTerm.toLowerCase());
            const categoryMatch = filterCategory === 'all' || (drink.category || '自定义') === filterCategory;
            return nameMatch && categoryMatch;
        }).sort((a, b) => a.name.localeCompare(b.name)); // Sort filtered results
    }, [drinks, searchTerm, filterCategory]);

    // Group filtered drinks by category for rendering
    const groupedDrinks = useMemo(() => {
        const groups = {};
        filteredDrinks.forEach(drink => {
            const category = drink.category || '自定义';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(drink);
        });
        // Order categories: Put '通用' and '连锁咖啡' first if they exist
        const orderedCategories = Object.keys(groups).sort((a, b) => {
            if (a === '通用') return -1;
            if (b === '通用') return 1;
            if (a === '连锁咖啡') return -1;
            if (b === '连锁咖啡') return 1;
            return a.localeCompare(b);
        });
        return orderedCategories.map(category => ({ category, items: groups[category] }));
    }, [filteredDrinks]);

    // Simple icon mapping based on category or name keywords
    const getDrinkIcon = (drink) => {
        const nameLower = drink.name.toLowerCase();
        if (nameLower.includes('美式') || nameLower.includes('浓缩') || nameLower.includes('滴滤') || nameLower.includes('咖啡')) return <Coffee size={18} className="mb-1 text-amber-700"/>;
        if (nameLower.includes('拿铁') || nameLower.includes('卡布奇诺')) return <Coffee size={18} className="mb-1 text-orange-600"/>;
        if (nameLower.includes('茶')) return <Leaf size={18} className="mb-1 text-green-600"/>;
        if (nameLower.includes('可乐') || nameLower.includes('苏打')) return <CupSoda size={18} className="mb-1 text-blue-500"/>;
        if (nameLower.includes('能量')) return <Sun size={18} className="mb-1 text-yellow-500"/>; // Using Sun for energy
        if (nameLower.includes('巧克力')) return <Star size={18} className="mb-1 text-yellow-900"/>; // Using Star for chocolate
        return <GlassWater size={18} className="mb-1 text-gray-500"/>; // Default icon
    };


    return (
        <div className="mb-4 border border-amber-200 rounded-lg p-3 bg-amber-50/50">
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
                {/* Search Input */}
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="搜索饮品..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-8 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                    <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                {/* Category Filter */}
                <div className="relative flex-shrink-0">
                     <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full sm:w-auto p-2 pl-8 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm appearance-none"
                     >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat === 'all' ? '所有分类' : cat}</option>
                        ))}
                    </select>
                    <Filter size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Drink Grid */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {groupedDrinks.length > 0 ? groupedDrinks.map(({ category, items }) => (
                    <div key={category}>
                        <h4 className="text-sm font-semibold text-amber-800 mb-1.5">{category}</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {items.map(drink => (
                                <button
                                    key={drink.id}
                                    onClick={() => onSelectDrink(drink.id)}
                                    className={`p-2 border rounded-lg text-center text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 flex flex-col items-center justify-center h-20 ${
                                        selectedDrinkId === drink.id
                                            ? 'bg-amber-800 text-white border-amber-900 shadow-md ring-2 ring-amber-500 ring-offset-1'
                                            : drink.isPreset
                                                ? 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                                                : 'bg-green-50 text-green-900 border-green-200 hover:bg-green-100 hover:border-green-300' // Custom drink style
                                    }`}
                                    title={`${drink.name} (${drink.caffeineContent}mg/100ml${drink.defaultVolume ? `, ${drink.defaultVolume}ml` : ''})`}
                                >
                                    {getDrinkIcon(drink)}
                                    <span className="leading-tight line-clamp-2">{drink.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )) : (
                     <p className="text-center text-yellow-700 py-4 text-sm">没有找到匹配的饮品。</p>
                )}
            </div>
             {/* Clear Selection Button */}
             {selectedDrinkId && (
                <button
                    onClick={onClearSelection}
                    className="mt-3 w-full py-1.5 px-3 text-xs border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center"
                >
                    <X size={14} className="mr-1" /> 清除选择 (手动输入)
                </button>
            )}
        </div>
    );
};


// --- Main Component ---

const CaffeineTracker = () => {
  // --- State Variables ---

  // User Settings
  const [userSettings, setUserSettings] = useState(defaultSettings);

  // Intake Records
  const [records, setRecords] = useState([]);
  const [currentCaffeine, setCurrentCaffeine] = useState(0);
  const [optimalSleepTime, setOptimalSleepTime] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // ID of the record being edited
  const [selectedDrinkId, setSelectedDrinkId] = useState(''); // ID of the selected drink from the list
  const [drinkVolume, setDrinkVolume] = useState('');
  const [customAmount, setCustomAmount] = useState(''); // For direct mg entry
  const [entryName, setEntryName] = useState(''); // Custom name for the specific entry (can override drink name)
  const [intakeTime, setIntakeTime] = useState(formatDatetimeLocal(new Date()));

  // Drinks State (Combined Presets and Custom)
  const [drinks, setDrinks] = useState([]); // Holds all drinks [{ id, name, caffeineContent, defaultVolume?, isPreset, isDeletable, isEditable }]
  const [showDrinkEditor, setShowDrinkEditor] = useState(false);
  const [editingDrink, setEditingDrink] = useState(null); // The drink object being edited
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');
  const [newDrinkVolume, setNewDrinkVolume] = useState(''); // For editing/adding default volume

  // View and Statistics State
  const [viewMode, setViewMode] = useState('current'); // 'current', 'stats', 'settings'
  const [statsView, setStatsView] = useState('week'); // 'week', 'month', 'year'
  const [statsDate, setStatsDate] = useState(new Date());

  // --- Effects ---

  // Load data from localStorage on initial mount
  useEffect(() => {
    let loadedRecords = [];
    let loadedSettings = defaultSettings;
    let loadedDrinks = []; // Will hold combined presets and custom drinks from storage

    try {
      // Load Records
      const savedRecords = localStorage.getItem('caffeineRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          const validRecords = parsedRecords.filter(r => r && typeof r.id !== 'undefined' && typeof r.amount === 'number' && typeof r.timestamp === 'number' && typeof r.name === 'string');
          if (validRecords.length !== parsedRecords.length) {
            console.warn("Some invalid records were filtered out during loading.");
          }
          loadedRecords = validRecords;
        } else {
          console.error('Invalid format for records data in localStorage. Clearing.');
          localStorage.removeItem('caffeineRecords');
        }
      }

      // Load Settings
      const savedSettings = localStorage.getItem('caffeineSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings === 'object' && parsedSettings !== null) {
          loadedSettings = { ...defaultSettings, ...parsedSettings };
          delete loadedSettings.defaultCupSize; // Remove legacy key
        } else {
          console.error('Invalid format for settings data in localStorage. Clearing.');
          localStorage.removeItem('caffeineSettings');
        }
      }

      // Load Drinks (Combined)
      const savedDrinks = localStorage.getItem('caffeineDrinks');
      if (savedDrinks) {
          const parsedDrinks = JSON.parse(savedDrinks);
          if (Array.isArray(parsedDrinks)) {
              const validDrinks = parsedDrinks.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string' && typeof d.caffeineContent === 'number');
              if (validDrinks.length !== parsedDrinks.length) {
                  console.warn("Some invalid drinks were filtered out during loading.");
              }
              // Merge Strategy: Keep saved drinks, add any *new* initial presets not present in saved data
              const savedDrinkIds = new Set(validDrinks.map(d => d.id));
              const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));
              // Ensure loaded drinks have the category field, default if missing
              const validatedSavedDrinks = validDrinks.map(d => ({ ...d, category: d.category || (d.isPreset ? '通用' : '自定义') }));
              loadedDrinks = [...validatedSavedDrinks, ...newPresetsToAdd];
          } else {
              console.error('Invalid format for drinks data in localStorage. Using initial presets.');
              loadedDrinks = [...initialPresetDrinks];
              localStorage.removeItem('caffeineDrinks');
          }
      } else {
          loadedDrinks = [...initialPresetDrinks];
      }

    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      loadedRecords = [];
      loadedSettings = defaultSettings;
      loadedDrinks = [...initialPresetDrinks];
      // localStorage.clear();
    } finally {
      setRecords(loadedRecords.sort((a, b) => b.timestamp - a.timestamp)); // Sort records initially
      setUserSettings(loadedSettings);
      setDrinks(loadedDrinks);
      const currentSelectedDrink = loadedDrinks.find(d => d.id === selectedDrinkId);
      setDrinkVolume(currentSelectedDrink?.defaultVolume?.toString() ?? '');
    }
  }, []); // Run once on mount

  // Update form volume and entry name when selected drink changes
  useEffect(() => {
      const selectedDrink = drinks.find(d => d.id === selectedDrinkId);
      if (selectedDrink) {
          // Only update volume if not currently editing an existing record with a volume
          const editingRecord = editingId ? records.find(r => r.id === editingId) : null;
          if (!editingRecord || !editingRecord.volume) {
             setDrinkVolume(selectedDrink.defaultVolume?.toString() ?? '');
          }
          // Only update name if not editing or if the editing name hasn't been manually changed
          if (!editingId || entryName === records.find(r => r.id === editingId)?.name) {
             setEntryName(selectedDrink.name);
          }
      } else if (!editingId) {
          // Clear volume and name if deselected and not editing
          setDrinkVolume('');
          setEntryName('');
      }
  }, [selectedDrinkId, drinks, editingId, records]); // Rerun when selection or drinks list changes


  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (records.length > 0 || localStorage.getItem('caffeineRecords') !== null) {
      try {
        localStorage.setItem('caffeineRecords', JSON.stringify(records));
      } catch (error) {
        console.error('Error saving records to localStorage:', error);
        alert("保存记录时出错，本地存储可能已满或损坏。");
      }
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('caffeineSettings', JSON.stringify(userSettings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      alert("保存设置时出错。");
    }
  }, [userSettings]);

  useEffect(() => {
    if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
      try {
        localStorage.setItem('caffeineDrinks', JSON.stringify(drinks));
      } catch (error) {
        console.error('Error saving drinks to localStorage:', error);
        alert("保存饮品列表时出错。");
      }
    }
  }, [drinks]);

  // Calculate current caffeine level and optimal sleep time
  useEffect(() => {
    const calculateCaffeine = () => {
      let total = 0;
      const now = Date.now();
      const halfLifeHours = userSettings.caffeineHalfLifeHours || 5;

      records.forEach(record => {
        if (!record || typeof record.timestamp !== 'number' || typeof record.amount !== 'number') {
          console.warn('Skipping invalid record in calculation:', record);
          return;
        }
        const hoursElapsed = (now - record.timestamp) / (1000 * 60 * 60);
        const decayFactor = halfLifeHours > 0 ? Math.pow(0.5, hoursElapsed / halfLifeHours) : (hoursElapsed > 0 ? 0 : 1);
        const remaining = Math.max(0, record.amount * decayFactor);

        if (remaining > 0.1) {
          total += remaining;
        }
      });

      setCurrentCaffeine(Math.round(total));

      // Calculate optimal sleep time
      const safeLevel = userSettings.safeBeforeSleepCaffeine;
      if (total > safeLevel && safeLevel > 0 && halfLifeHours > 0) {
        const hoursToSleep = halfLifeHours * Math.log2(total / safeLevel);
        if (isFinite(hoursToSleep) && hoursToSleep >= 0) {
          const sleepTime = new Date(now + hoursToSleep * 60 * 60 * 1000);
          setOptimalSleepTime(sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        } else {
          setOptimalSleepTime('计算中...');
        }
      } else {
        setOptimalSleepTime('现在');
      }
    };

    calculateCaffeine();
    const timer = setInterval(calculateCaffeine, 60000);
    return () => clearInterval(timer);
  }, [records, userSettings.safeBeforeSleepCaffeine, userSettings.caffeineHalfLifeHours]);

  // --- Data Aggregation Functions ---

  const getTodayTotal = useCallback(() => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    return Math.round(records
      .filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const getDayTotal = useCallback((date) => {
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const getWeekTotal = useCallback((date) => {
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= weekStart && record.timestamp <= weekEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const getMonthTotal = useCallback((date) => {
    const monthStart = getStartOfMonth(date);
    const monthEnd = getEndOfMonth(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= monthStart && record.timestamp <= monthEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const getYearTotal = useCallback((date) => {
    const yearStart = getStartOfYear(date);
    const yearEnd = getEndOfYear(date);
    return Math.round(records
        .filter(record => record && record.timestamp >= yearStart && record.timestamp <= yearEnd)
        .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const getWeekDailyTotals = useCallback(() => {
    const weekStart = getStartOfWeek(statsDate);
    const totals = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(currentDay.getDate() + i);
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        name: currentDay.toLocaleDateString(undefined, { weekday: 'short' }),
        value: dayTotal,
        date: currentDay,
      });
    }
    return totals;
  }, [statsDate, getDayTotal]);

  const getMonthDailyTotals = useCallback(() => {
    const monthStart = getStartOfMonth(statsDate);
    const monthEnd = getEndOfMonth(statsDate);
    const totals = [];
    const endDate = new Date(monthEnd);
    if (isNaN(monthStart) || isNaN(monthEnd) || monthEnd < monthStart) return [];
    let currentDay = new Date(monthStart);
    while (currentDay <= endDate) {
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        name: currentDay.getDate().toString(),
        value: dayTotal,
        date: new Date(currentDay),
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return totals;
  }, [statsDate, getDayTotal]);

  const getYearMonthlyTotals = useCallback(() => {
    const year = statsDate.getFullYear();
    const totals = [];
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    for (let i = 0; i < 12; i++) {
        const monthDate = new Date(year, i, 1);
        const monthTotal = getMonthTotal(monthDate);
        totals.push({ name: monthNames[i], value: monthTotal, monthIndex: i });
    }
    return totals;
  }, [statsDate, getMonthTotal]);

  // --- Event Handlers ---

  const selectedDrink = useMemo(() => drinks.find(d => d.id === selectedDrinkId), [selectedDrinkId, drinks]);

  const handleAddOrUpdateRecord = useCallback(() => {
    let caffeineAmount = 0;
    let nameForRecord = '';
    let volume = null;
    let drinkIdForRecord = null;
    const finalEntryName = entryName.trim();

    if (selectedDrinkId && drinkVolume) {
      const drink = drinks.find(d => d.id === selectedDrinkId);
      if (!drink) { alert("选择的饮品无效。"); return; }
      const caffeineContent = drink.caffeineContent;
      const parsedVolume = parseFloat(drinkVolume);
      if (!isNaN(parsedVolume) && parsedVolume > 0 && caffeineContent >= 0) {
        caffeineAmount = Math.round((caffeineContent * parsedVolume) / 100);
        volume = parsedVolume;
        drinkIdForRecord = drink.id;
        nameForRecord = finalEntryName || drink.name;
      } else { alert("请输入有效的容量 (必须大于 0)。"); return; }
    } else if (customAmount) {
      const parsedAmount = parseFloat(customAmount);
      if (!isNaN(parsedAmount) && parsedAmount >= 0) { // Allow 0mg custom entry
        caffeineAmount = Math.round(parsedAmount);
        nameForRecord = finalEntryName || '自定义摄入';
      } else { alert("请输入有效的自定义咖啡因摄入量 (必须大于或等于 0)。"); return; }
    } else { alert("请选择饮品并输入容量，或直接输入自定义摄入量和名称。"); return; }

    // // Re-check for <= 0 amounts (already handled allowing 0 above)
    // const baseDrinkCaffeine = selectedDrinkId ? drinks.find(d => d.id === selectedDrinkId)?.caffeineContent : null;
    // if (caffeineAmount <= 0 && !(baseDrinkCaffeine === 0 || (customAmount && parseFloat(customAmount) === 0))) {
    //    alert("计算出的咖啡因摄入量必须大于 0。如果您想记录无咖啡因饮品，请确保其咖啡因含量设置为 0 mg/100ml 或使用自定义摄入量输入 0。");
    //    return;
    // }

    let timestamp;
    try {
      timestamp = new Date(intakeTime).getTime();
      if (isNaN(timestamp)) throw new Error("Invalid date format");
    } catch (e) { alert("请输入有效的摄入时间。"); console.error("Invalid date/time value:", intakeTime); return; }

    const newRecord = {
      id: editingId || Date.now(),
      name: nameForRecord,
      amount: caffeineAmount,
      volume: volume,
      timestamp,
      drinkId: drinkIdForRecord,
      customName: (drinkIdForRecord && finalEntryName !== drinks.find(d=>d.id===drinkIdForRecord)?.name) ? finalEntryName : null
    };

    if (editingId) {
      setRecords(records.map(record => record.id === editingId ? newRecord : record).sort((a, b) => b.timestamp - a.timestamp));
    } else {
      setRecords(prevRecords => [...prevRecords, newRecord].sort((a, b) => b.timestamp - a.timestamp));
    }
    resetForm();
  }, [editingId, selectedDrinkId, drinkVolume, customAmount, entryName, intakeTime, records, drinks]);

  const deleteRecord = useCallback((id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setRecords(records.filter(record => record.id !== id));
    }
  }, [records]);

  const editRecord = useCallback((record) => {
    setEditingId(record.id);
    if (record.drinkId) {
        setSelectedDrinkId(record.drinkId);
        setDrinkVolume(record.volume ? record.volume.toString() : '');
        const baseDrink = drinks.find(d => d.id === record.drinkId);
        setEntryName(record.customName || record.name || baseDrink?.name || '');
        setCustomAmount('');
    } else {
        setSelectedDrinkId('');
        setDrinkVolume('');
        setCustomAmount(record.amount.toString());
        setEntryName(record.name);
    }
    try {
      const recordDate = new Date(record.timestamp);
      setIntakeTime(formatDatetimeLocal(recordDate));
    } catch (e) {
      console.error("Error formatting record date for editing:", record.timestamp, e);
      setIntakeTime(formatDatetimeLocal(new Date()));
    }
    setShowForm(true);
  }, [drinks]);

  const resetForm = useCallback(() => {
    setSelectedDrinkId('');
    setDrinkVolume('');
    setCustomAmount('');
    setEntryName('');
    setEditingId(null);
    setShowForm(false);
    setIntakeTime(formatDatetimeLocal(new Date()));
  }, []);

  const handleAddOrUpdateDrink = useCallback(() => {
    const name = newDrinkName.trim();
    const caffeine = parseFloat(newDrinkCaffeine);
    const volume = newDrinkVolume.trim() === '' ? null : parseFloat(newDrinkVolume);
    const category = editingDrink?.category || '自定义'; // Keep original category or default to '自定义'

    if (!name || isNaN(caffeine) || caffeine < 0) { alert("请输入有效的饮品名称和非负的咖啡因含量 (mg/100ml)。"); return; }
    if (volume !== null && (isNaN(volume) || volume <= 0)) { alert("默认容量必须是大于 0 的数字，或留空。"); return; }

    const existingDrink = drinks.find(drink => drink.name.toLowerCase() === name.toLowerCase() && drink.id !== editingDrink?.id);
    if (existingDrink) { alert(`名称为 "${name}" 的饮品已存在。请使用不同的名称。`); return; }

    const newDrinkData = {
      id: editingDrink?.id || `custom-${Date.now()}`,
      name: name,
      caffeineContent: caffeine,
      defaultVolume: volume,
      category: category, // Assign category
      isPreset: editingDrink?.isPreset ?? false,
      isDeletable: editingDrink?.isDeletable ?? true,
      isEditable: true,
    };

    if (editingDrink) {
      setDrinks(drinks.map(drink => drink.id === editingDrink.id ? newDrinkData : drink));
    } else {
      setDrinks(prevDrinks => [...prevDrinks, newDrinkData]);
    }
    resetDrinkForm();
  }, [newDrinkName, newDrinkCaffeine, newDrinkVolume, editingDrink, drinks]);

  const deleteDrink = useCallback((id) => {
    const drinkToDelete = drinks.find(drink => drink.id === id);
    if (!drinkToDelete || !drinkToDelete.isDeletable) { alert("无法删除预设饮品。"); return; }
    if (window.confirm(`确定要删除自定义饮品 "${drinkToDelete.name}" 吗？`)) {
      setDrinks(drinks.filter(drink => drink.id !== id));
      if (selectedDrinkId === id) { setSelectedDrinkId(''); }
    }
  }, [drinks, selectedDrinkId]);

  const editDrink = useCallback((drink) => {
    setEditingDrink(drink);
    setNewDrinkName(drink.name);
    setNewDrinkCaffeine(drink.caffeineContent.toString());
    setNewDrinkVolume(drink.defaultVolume?.toString() ?? '');
    setShowDrinkEditor(true);
  }, []);

  const resetDrinkForm = useCallback(() => {
    setShowDrinkEditor(false);
    setEditingDrink(null);
    setNewDrinkName('');
    setNewDrinkCaffeine('');
    setNewDrinkVolume('');
  }, []);

  const navigateStats = useCallback((direction) => {
    const newDate = new Date(statsDate);
    let isFutureDate = false;
    if (statsView === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
      isFutureDate = getEndOfWeek(newDate) > Date.now();
    } else if (statsView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction, 1);
      isFutureDate = getEndOfMonth(newDate) > Date.now();
    } else if (statsView === 'year') {
        newDate.setFullYear(newDate.getFullYear() + direction);
        isFutureDate = getEndOfYear(newDate) > Date.now();
    }
    if (direction > 0 && isFutureDate) {
        let startOfPeriod;
        if (statsView === 'week') startOfPeriod = getStartOfWeek(newDate);
        else if (statsView === 'month') startOfPeriod = getStartOfMonth(newDate);
        else startOfPeriod = getStartOfYear(newDate);
        if (startOfPeriod > Date.now()) return;
    }
    setStatsDate(newDate);
  }, [statsDate, statsView]);

  const formatStatsPeriod = useCallback(() => {
    try {
      if (statsView === 'week') {
        const weekStart = new Date(getStartOfWeek(statsDate));
        const weekEnd = new Date(getEndOfWeek(statsDate));
        const startStr = weekStart.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        const yearStr = weekStart.getFullYear() !== weekEnd.getFullYear() ? `${weekStart.getFullYear()}/${weekEnd.getFullYear()}` : weekStart.getFullYear();
        return `${startStr} - ${endStr}, ${yearStr}`;
      } else if (statsView === 'month') {
        return statsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      } else if (statsView === 'year') {
        return statsDate.getFullYear().toString();
      }
    } catch (e) { console.error("Error formatting stats period:", e); return "日期错误"; }
    return '';
  }, [statsDate, statsView]);

  // --- Derived State and Calculations ---

  const userStatus = useMemo(() => {
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    const currentRounded = Math.round(currentCaffeine);
    if (currentRounded < maxDaily * 0.1) return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: 'text-green-600' };
    if (currentRounded < maxDaily * 0.5) return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: 'text-green-500' };
    if (currentRounded < maxDaily) return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-[${COFFEE_COLORS.warning}]` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-[${COFFEE_COLORS.danger}]` };
  }, [currentCaffeine, userSettings.maxDailyCaffeine]);

  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const weekData = getWeekDailyTotals();
    const weekTotal = Math.round(weekData.reduce((sum, day) => sum + day.value, 0));
    const weeklyAvg = weekTotal > 0 ? Math.round(weekTotal / 7) : 0;
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    const currentRounded = Math.round(currentCaffeine);
    if (dailyTotal > maxDaily) return { advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过推荐上限 (${maxDaily}mg)，建议减少摄入。`, color: `text-[${COFFEE_COLORS.danger}]`, bgColor: `bg-[${COFFEE_COLORS.danger}]/10` };
    if (weeklyAvg > maxDaily * 0.9) return { advice: `您本周的日均咖啡因摄入量 (${weeklyAvg}mg) 较高，建议适当减少以避免产生耐受性。`, color: `text-[${COFFEE_COLORS.warning}]`, bgColor: `bg-[${COFFEE_COLORS.warning}]/10` };
    if (currentRounded > 100 && new Date().getHours() >= 16) return { advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。', color: `text-[${COFFEE_COLORS.warning}]`, bgColor: `bg-[${COFFEE_COLORS.warning}]/10` };
    return { advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。', color: 'text-green-600', bgColor: 'bg-green-100' };
  }, [getTodayTotal, getWeekDailyTotals, userSettings.maxDailyCaffeine, currentCaffeine]);

  const caffeineDistribution = useMemo(() => {
      const sourceData = {};
      let totalIntake = 0;
      records.forEach(record => {
          if (!record || typeof record.amount !== 'number' || record.amount <= 0) return;
          const key = record.drinkId || record.name;
          if (!sourceData[key]) sourceData[key] = { amount: 0, count: 0, name: record.name };
          sourceData[key].amount += record.amount;
          sourceData[key].count += 1;
          totalIntake += record.amount;
      });
      if (totalIntake === 0) return [];
      const distributionArray = Object.entries(sourceData).map(([key, data]) => {
          let displayName = data.name;
          if (key.startsWith('preset-') || key.startsWith('custom-')) {
              const drink = drinks.find(d => d.id === key);
              displayName = drink ? drink.name : `已删除饮品 (${key.substring(0, 10)}...)`;
          }
          return { id: key, name: displayName, amount: Math.round(data.amount), percentage: Math.round((data.amount / totalIntake) * 100) };
      });
      return distributionArray.sort((a, b) => b.amount - a.amount);
  }, [records, drinks]);

  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (maxDailyCaffeineForProgress <= 0) return 0;
    return Math.min(Math.max(0, (currentCaffeine / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeine, userSettings.maxDailyCaffeine]);

  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- Chart Rendering Logic ---

  const chartData = useMemo(() => {
      try {
          if (statsView === 'week') return getWeekDailyTotals();
          if (statsView === 'month') return getMonthDailyTotals();
          if (statsView === 'year') return getYearMonthlyTotals();
      } catch (error) { console.error("Error preparing chart data:", error); return []; }
      return [];
  }, [statsView, getWeekDailyTotals, getMonthDailyTotals, getYearMonthlyTotals]);

  const chartMaxValue = useMemo(() => {
      if (!chartData || chartData.length === 0) return 1;
      const maxValue = Math.max(...chartData.map(d => d.value));
      return Math.max(maxValue, 1);
  }, [chartData]);

  const hasChartData = useMemo(() => chartData && chartData.some(d => d.value > 0), [chartData]);

  const formatYAxisTick = (value) => Math.round(value);

  const renderChart = () => {
    if (!hasChartData) {
      return <div key="chart-no-data" className="flex items-center justify-center h-64 text-yellow-700 text-sm">{statsView === 'week' ? '本周没有数据' : statsView === 'month' ? '本月没有数据' : '本年没有数据'}</div>;
    }
    let title = '';
    if (statsView === 'week') title = '每日摄入量 (mg)';
    if (statsView === 'month') title = '每日摄入量 (mg)';
    if (statsView === 'year') title = '每月摄入量 (mg)';
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    const yMax = Math.ceil(Math.max(chartMaxValue, maxDaily) * 1.1 / 50) * 50;
    const yAxisDomain = [0, yMax];

    return (
      <>
        <h3 className="text-center text-sm font-medium text-yellow-800 mb-3">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COFFEE_COLORS.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis domain={yAxisDomain} tick={{ fontSize: 10 }} tickFormatter={formatYAxisTick} />
            <Tooltip
                contentStyle={{ backgroundColor: COFFEE_COLORS.tooltipBg, border: `1px solid ${COFFEE_COLORS.grid}`, borderRadius: '8px', color: COFFEE_COLORS.tooltipText, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${Math.round(value)} mg`, '摄入量']}
                labelFormatter={(label, payload) => {
                    const entry = payload?.[0]?.payload;
                    if (entry?.date && (statsView === 'week' || statsView === 'month')) { return `${entry.date.toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric'})} (${label})`; }
                    return label;
                }}
            />
            <Bar dataKey="value" name="摄入量" barSize={statsView === 'month' ? 10 : (statsView === 'year' ? 15 : 20)}>
              {chartData.map((entry, index) => {
                let fillColor = COFFEE_COLORS.cappuccino;
                if ((statsView === 'week' || statsView === 'month')) {
                    if (entry.value > maxDaily) fillColor = COFFEE_COLORS.danger;
                    else if (entry.value > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                } else if (statsView === 'year') {
                    const daysInMonth = new Date(statsDate.getFullYear(), entry.monthIndex + 1, 0).getDate();
                    const avgDaily = daysInMonth > 0 ? entry.value / daysInMonth : 0;
                    if (avgDaily > maxDaily) fillColor = COFFEE_COLORS.danger;
                    else if (avgDaily > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                    else fillColor = COFFEE_COLORS.espresso;
                }
                return <Cell key={`cell-${index}`} fill={fillColor} radius={[4, 4, 0, 0]} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  };


  // --- JSX ---
  return (
    <div className="min-h-screen bg-amber-50 text-yellow-900 font-sans">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-yellow-900 flex justify-center items-center">
            <Coffee className="mr-2" size={30} />
            咖啡因摄入管理
          </h1>
          <p className="text-yellow-700 mt-1">科学管理您的日常咖啡因摄入</p>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl mb-4 flex overflow-hidden shadow-sm border border-amber-100">
          <button onClick={() => setViewMode('current')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'current' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}><Thermometer size={16} className="mr-1" /> 当前状态</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'stats' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}><BarChart2 size={16} className="mr-1" /> 数据统计</button>
          <button onClick={() => setViewMode('settings')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'settings' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}><Settings size={16} className="mr-1" /> 设置</button>
        </div>

        {/* Current Status View */}
        {viewMode === 'current' && (
          <>
            {/* Current Status Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Activity size={20} className="mr-2" /> 当前状态</h2>
              {/* Semi-Circle Progress Gauge */}
              <div className="relative w-full flex justify-center my-6">
                <svg width="240" height="160" viewBox="0 0 240 160">
                  <path d="M20,130 A100,100 0 0,1 220,130" fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round"/>
                  <path d="M20,130 A100,100 0 0,1 220,130" fill="none" stroke="url(#caffeine-gauge-gradient)" strokeWidth="20" strokeLinecap="round" strokeDasharray="314.16" strokeDashoffset={314.16 - (314.16 * percentFilled / 100)} style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}/>
                  <defs><linearGradient id="caffeine-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#4ade80" /><stop offset="50%" stopColor={COFFEE_COLORS.warning} /><stop offset="100%" stopColor={COFFEE_COLORS.danger} /></linearGradient></defs>
                  <text x="20" y="155" fontSize="12" fill="#78716c" textAnchor="start">0</text>
                  <text x="120" y="155" fontSize="12" fill="#78716c" textAnchor="middle">{Math.round((userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400) / 2)}</text>
                  <text x="220" y="155" fontSize="12" fill="#78716c" textAnchor="end">{userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400}+</text>
                  <text x="120" y="105" fontSize="28" fontWeight="bold" fill="#78716c" textAnchor="middle">{Math.round(currentCaffeine)} mg</text>
                  <text x="120" y="125" fontSize="12" fill="#a1a1aa" textAnchor="middle">当前体内含量</text>
                </svg>
              </div>
              {/* Status Text */}
              <div className="text-center mb-4 mt-2">
                <h3 className={`text-lg font-semibold ${userStatus.color}`}>{userStatus.status}</h3>
                <p className="text-yellow-700 mt-1">{userStatus.recommendation}</p>
                {/* Health Advice */}
                <div className={`mt-3 text-sm p-2 rounded-lg bg-opacity-80 ${healthAdvice.bgColor} ${healthAdvice.color}`}>
                  <div className="flex items-center justify-center"><AlertCircle size={16} className="inline-block mr-1 flex-shrink-0" /><span>{healthAdvice.advice}</span></div>
                </div>
              </div>
              {/* Summary Stats */}
              <div className="flex justify-between text-sm text-yellow-700 mt-4 pt-4 border-t border-amber-100">
                <div>今日总摄入: <span className="font-semibold">{todayTotal} mg</span></div>
                <div>目标摄入: <span className="font-semibold">{userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400} mg</span></div>
              </div>
              {/* Optimal Sleep Time */}
              <div className="mt-3 text-sm text-center p-2 rounded-lg bg-blue-100 text-blue-700"><Clock size={16} className="inline-block mr-1" /> 建议最早睡眠时间: <span className="font-semibold">{optimalSleepTime}</span></div>
            </div>

            {/* Add/Edit Form Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              {showForm ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">{editingId ? '编辑咖啡因摄入记录' : '添加咖啡因摄入记录'}</h2>

                  {/* New Drink Selector Component */}
                  <DrinkSelector
                      drinks={drinks}
                      selectedDrinkId={selectedDrinkId}
                      onSelectDrink={(id) => {
                          if (selectedDrinkId === id) {
                              // Deselect if clicking the same item again
                              setSelectedDrinkId('');
                              setEntryName('');
                              setDrinkVolume('');
                          } else {
                              setSelectedDrinkId(id);
                              // Volume and name are set via useEffect
                          }
                          setCustomAmount(''); // Clear custom amount when selecting a drink
                      }}
                      onClearSelection={() => {
                          setSelectedDrinkId('');
                          setEntryName('');
                          setDrinkVolume('');
                          // Keep customAmount if user clears selection to input manually
                      }}
                  />


                  {/* Intake Time Input */}
                  <div className="mb-4">
                    <label htmlFor="intakeTime" className="block mb-1 font-medium text-sm">摄入时间:</label>
                    <input id="intakeTime" type="datetime-local" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={intakeTime} onChange={(e) => setIntakeTime(e.target.value)} max={formatDatetimeLocal(new Date())}/>
                  </div>

                  {/* Entry Name Input */}
                  <div className="mb-4">
                      <label htmlFor="entryName" className="block mb-1 font-medium text-sm">记录名称:</label>
                      <input id="entryName" type="text" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={entryName} onChange={(e) => setEntryName(e.target.value)} placeholder={selectedDrink ? selectedDrink.name : "例如：午后提神咖啡"}/>
                      <p className="text-xs text-yellow-700 mt-1">{selectedDrinkId ? "可修改名称用于本次记录。" : "输入本次摄入的名称。"}</p>
                  </div>

                  {/* Volume Input (Conditional) */}
                  {selectedDrinkId && (
                    <div className="mb-4">
                      <label htmlFor="drinkVolume" className="block mb-1 font-medium text-sm">容量 (ml):</label>
                      <input id="drinkVolume" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={drinkVolume} onChange={(e) => setDrinkVolume(e.target.value)} placeholder={`例如: ${selectedDrink?.defaultVolume ?? '250'}`} min="1"/>
                      {drinkVolume && !isNaN(parseFloat(drinkVolume)) && parseFloat(drinkVolume) > 0 && selectedDrink?.caffeineContent >= 0 && (
                        <div className="mt-1 text-xs text-yellow-700">预计咖啡因摄入量: {Math.round((selectedDrink.caffeineContent * parseFloat(drinkVolume)) / 100)} mg</div>
                      )}
                    </div>
                  )}

                  {/* Custom Amount Input (Conditional) */}
                  {!selectedDrinkId && (
                    <div className="mb-4">
                      <label htmlFor="customAmount" className="block mb-1 font-medium text-sm">摄入量 (mg):</label>
                      <input id="customAmount" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="直接输入咖啡因毫克数" min="0"/>
                       <p className="text-xs text-yellow-700 mt-1">如果您不选择饮品，请在此直接输入咖啡因总量。</p>
                    </div>
                  )}

                  {/* Form Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button onClick={handleAddOrUpdateRecord} className="flex-1 py-2 px-4 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors duration-200 flex items-center justify-center shadow text-sm"><Save size={16} className="mr-1" />{editingId ? '保存修改' : '添加记录'}</button>
                    <button onClick={resetForm} className="py-2 px-4 border border-amber-800 text-amber-800 rounded-md hover:bg-amber-100 transition-colors duration-200 flex items-center justify-center text-sm"><X size={16} className="mr-1" /> 取消</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)} className="w-full py-3 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors duration-200 flex items-center justify-center shadow"><Plus size={18} className="mr-1" /> 添加咖啡因摄入记录</button>
              )}
            </div>

            {/* Intake History Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Clock size={20} className="mr-2" /> 摄入历史</h2>
              {records.length === 0 ? (
                <p className="text-center text-yellow-700 py-4">暂无记录。添加您的第一条咖啡因摄入记录吧！</p>
              ) : (
                <ul className="divide-y divide-amber-100 max-h-96 overflow-y-auto">
                  {records.map(record => (
                      <li key={record.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">
                            {record.name} - {record.amount} mg
                            {record.customName && record.drinkId && (<span className="text-xs text-gray-500 ml-1 italic">(源自: {drinks.find(d=>d.id===record.drinkId)?.name ?? '未知'})</span>)}
                          </div>
                          <div className="text-xs text-yellow-700 flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center"><Calendar size={12} className="mr-1" /> {formatDate(record.timestamp)}</span>
                            <span className="flex items-center"><Clock size={12} className="mr-1" /> {formatTime(record.timestamp)}</span>
                            {record.volume && (<span className="flex items-center"><Coffee size={12} className="mr-1" /> {record.volume} ml</span>)}
                          </div>
                        </div>
                        <div className="flex space-x-1 flex-shrink-0">
                          <button onClick={() => editRecord(record)} className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100 transition-colors duration-150" aria-label="Edit record"><Edit size={16} /></button>
                          <button onClick={() => deleteRecord(record.id)} className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150" aria-label="Delete record"><Trash2 size={16} /></button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Data Statistics View */}
        {viewMode === 'stats' && (
          <>
            {/* Time Range Selector */}
            <div className="mb-4 bg-white rounded-xl p-4 shadow-md border border-amber-100">
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => navigateStats(-1)} className="p-2 text-yellow-700 hover:bg-amber-100 rounded-md transition-colors duration-150" aria-label="Previous period"><ChevronLeft size={18} /></button>
                <h2 className="text-lg font-semibold text-center">{formatStatsPeriod()}</h2>
                <button onClick={() => navigateStats(1)} className="p-2 text-yellow-700 hover:bg-amber-100 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed" disabled={(() => { const nextDate = new Date(statsDate); if (statsView === 'week') nextDate.setDate(nextDate.getDate() + 7); else if (statsView === 'month') nextDate.setMonth(nextDate.getMonth() + 1, 1); else nextDate.setFullYear(nextDate.getFullYear() + 1); let startOfNextPeriod; if (statsView === 'week') startOfNextPeriod = getStartOfWeek(nextDate); else if (statsView === 'month') startOfNextPeriod = getStartOfMonth(nextDate); else startOfNextPeriod = getStartOfYear(nextDate); return startOfNextPeriod > Date.now(); })()} aria-label="Next period"><ChevronRight size={18} /></button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={() => { setStatsView('week'); setStatsDate(new Date()); }} className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'week' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>周</button>
                <button onClick={() => { setStatsView('month'); setStatsDate(new Date()); }} className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'month' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>月</button>
                <button onClick={() => { setStatsView('year'); setStatsDate(new Date()); }} className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'year' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>年</button>
              </div>
            </div>

            {/* Intake Overview Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><BarChart2 size={20} className="mr-2" /> 摄入总览</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                  <div className="text-sm text-yellow-700">{statsView === 'week' ? '本周总摄入' : statsView === 'month' ? '本月总摄入' : '本年总摄入'}</div>
                  <div className="text-xl font-bold text-amber-800 mt-1">{statsView === 'week' ? getWeekTotal(statsDate) : statsView === 'month' ? getMonthTotal(statsDate) : getYearTotal(statsDate)} mg</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                   <div className="text-sm text-yellow-700">{statsView === 'week' ? '日均 (本周)' : statsView === 'month' ? '日均 (本月)' : '日均 (本年)'}</div>
                   <div className="text-xl font-bold text-amber-800 mt-1">{(() => { let total = 0; let days = 0; if (statsView === 'week') { total = getWeekTotal(statsDate); days = 7; } else if (statsView === 'month') { total = getMonthTotal(statsDate); days = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate(); } else { total = getYearTotal(statsDate); const year = statsDate.getFullYear(); days = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365; } return days > 0 && total > 0 ? Math.round(total / days) : 0; })()} mg</div>
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg mt-4 min-h-[300px]">{renderChart()}</div>
            </div>

            {/* Intake Source Analysis Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><PieChart size={20} className="mr-2" /> 摄入来源分析 (所有记录)</h2>
              <div className="space-y-3">
                {caffeineDistribution.length > 0 ? (caffeineDistribution.slice(0, 7).map((item, index) => (<div key={item.id} className="flex items-center text-sm"><div className="w-24 truncate pr-2" title={item.name}>{item.name}</div><div className="flex-1 mx-2"><div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${item.percentage}%`, backgroundColor: [COFFEE_COLORS.espresso, COFFEE_COLORS.latte, COFFEE_COLORS.cappuccino, COFFEE_COLORS.accent, COFFEE_COLORS.grid, COFFEE_COLORS.warning, COFFEE_COLORS.danger][index % 7] }}></div></div></div><div className="w-20 text-right text-yellow-800 font-medium">{item.percentage}% <span className="text-xs text-yellow-600">({item.amount}mg)</span></div></div>))) : (<p className="text-center text-yellow-700 py-3">没有足够的记录进行分析。</p>)}
              </div>
            </div>

            {/* Health Analysis Report Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Heart size={20} className="mr-2" /> 健康分析与洞察</h2>
              <div className="space-y-4 text-sm text-yellow-800">
                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center"><Award size={16} className="mr-1 text-amber-700" /> 摄入模式评估</h3>
                  <p>{records.length > 0 ? `根据您的历史记录，${caffeineDistribution[0]?.name ? `您的主要咖啡因来源似乎是 ${caffeineDistribution[0].name} (${caffeineDistribution[0].percentage}%)。` : '您的咖啡因来源较为多样。'}` : "您还没有添加任何摄入记录。"}{records.length > 0 && ` 您设定的每日最大摄入量为 ${userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400}mg。本周您的日均摄入量约为 ${Math.round(getWeekTotal(new Date()) / 7)}mg。请关注统计图表，了解您是否经常超过推荐量。`}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center"><Clock size={16} className="mr-1 text-amber-700" /> 睡眠影响考量</h3>
                  <p>咖啡因的平均半衰期约为 {userSettings.caffeineHalfLifeHours} 小时，但个体差异显著。当前计算的建议最早睡眠时间为 <strong className="text-blue-700">{optimalSleepTime}</strong>，这是基于当前体内咖啡因降至 {userSettings.safeBeforeSleepCaffeine}mg 所需的时间估算。如果您计划在 <strong className="text-blue-700">{userSettings.plannedSleepTime}</strong> 左右入睡，请留意当前体内咖啡因含量 (<strong className="text-blue-700">{Math.round(currentCaffeine)}mg</strong>) 是否过高。通常建议睡前 6 小时避免摄入咖啡因。</p>
                </div>
              </div>
            </div>

             {/* Caffeine Knowledge Card (Moved Here) */}
             <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
               <h2 className="text-xl font-semibold mb-4 flex items-center"><Info size={20} className="mr-2" /> 咖啡因知识库</h2>
               <ul className="space-y-2 text-sm text-yellow-800 list-disc list-inside">
                 <li><strong>推荐摄入量:</strong> 健康成年人每日咖啡因摄入量建议不超过 <strong>400mg</strong>。孕妇或哺乳期妇女、青少年以及某些健康状况人群的推荐量通常更低。</li>
                 <li><strong>半衰期:</strong> 咖啡因在成人体内的平均半衰期约为 <strong>3-7 小时</strong>，但受遗传 (如CYP1A2基因型)、年龄、肝功能、是否吸烟、是否服用某些药物 (如口服避孕药) 等因素影响，个体差异可达 <strong>1.5 至 9.5 小时</strong>。您可以在个人设置中调整半衰期估算值。</li>
                 <li><strong>作用时间:</strong> 咖啡因在摄入后约 <strong>15-45 分钟</strong> 开始显现效果，血浆浓度峰值通常在 <strong>30-120 分钟</strong> 达到。</li>
                 <li><strong>对睡眠的影响:</strong> 由于半衰期较长，下午或晚上摄入咖啡因可能显著干扰夜间睡眠结构和质量。一般建议在计划睡眠时间前至少 <strong>6 小时</strong> 避免摄入。</li>
                 <li><strong>益处与风险:</strong> 适量咖啡因可提高警觉性、专注力、反应速度和运动表现。然而，过量摄入或个体敏感可能导致焦虑、紧张、心悸、失眠、胃肠不适、头痛等副作用。</li>
                 <li><strong>耐受性与依赖:</strong> 长期规律摄入会导致身体产生耐受性，需要更高剂量才能达到相同效果。突然停止摄入可能引发戒断症状，如头痛、疲劳、注意力不集中、易怒等。</li>
                 <li><strong>来源:</strong> 咖啡因天然存在于咖啡豆、茶叶、可可豆中，并被添加到可乐、能量饮料、某些药物（如止痛药）中。不同来源和制备方法的咖啡因含量差异很大。</li>
               </ul>
             </div>
          </>
        )}

        {/* Settings View */}
        {viewMode === 'settings' && (
          <>
            {/* Personal Settings Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Settings size={20} className="mr-2" /> 个人设置</h2>
              <div className="space-y-4">
                <div><label htmlFor="userWeight" className="block mb-1 font-medium text-sm">体重 (kg):</label><input id="userWeight" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.weight} onChange={(e) => setUserSettings({...userSettings, weight: e.target.value === '' ? '' : parseInt(e.target.value) })} onBlur={(e) => { const value = parseInt(e.target.value); if (isNaN(value) || value < 20 || value > 300) setUserSettings({...userSettings, weight: defaultSettings.weight}); }} min="20" max="300" placeholder={defaultSettings.weight.toString()}/></div>
                <div><label htmlFor="userGender" className="block mb-1 font-medium text-sm">性别:</label><select id="userGender" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.gender} onChange={(e) => setUserSettings({...userSettings, gender: e.target.value})}><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select><p className="text-xs text-yellow-700 mt-1">性别可能影响咖啡因代谢速率（仅供参考）。</p></div>
                <div><label htmlFor="maxDailyCaffeine" className="block mb-1 font-medium text-sm">每日最大咖啡因摄入量 (mg):</label><input id="maxDailyCaffeine" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.maxDailyCaffeine} onChange={(e) => setUserSettings({...userSettings, maxDailyCaffeine: e.target.value === '' ? '' : parseInt(e.target.value) })} onBlur={(e) => { const value = parseInt(e.target.value); if (isNaN(value) || value < 0 || value > 2000) setUserSettings({...userSettings, maxDailyCaffeine: defaultSettings.maxDailyCaffeine}); }} min="0" max="2000" placeholder={defaultSettings.maxDailyCaffeine.toString()}/><div className="text-xs text-yellow-700 mt-1">推荐最大摄入量通常为 400mg/天。设为 0 将使用默认值 400 计算进度。</div></div>
                <div><label htmlFor="safeBeforeSleepCaffeine" className="block mb-1 font-medium text-sm">睡前安全咖啡因水平 (mg):</label><input id="safeBeforeSleepCaffeine" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.safeBeforeSleepCaffeine} onChange={(e) => setUserSettings({...userSettings, safeBeforeSleepCaffeine: e.target.value === '' ? '' : parseInt(e.target.value) })} onBlur={(e) => { const value = parseInt(e.target.value); if (isNaN(value) || value < 0 || value > 200) setUserSettings({...userSettings, safeBeforeSleepCaffeine: defaultSettings.safeBeforeSleepCaffeine}); }} min="0" max="200" placeholder={defaultSettings.safeBeforeSleepCaffeine.toString()}/><p className="text-xs text-yellow-700 mt-1">当体内咖啡因低于此值时，对睡眠影响较小（估算）。设为 0 将禁用睡眠时间建议。</p></div>
                <div><label htmlFor="plannedSleepTime" className="block mb-1 font-medium text-sm">计划睡眠时间:</label><input id="plannedSleepTime" type="time" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.plannedSleepTime} onChange={(e) => setUserSettings({...userSettings, plannedSleepTime: e.target.value || defaultSettings.plannedSleepTime})}/><p className="text-xs text-yellow-700 mt-1">用于提供更个性化的睡眠建议。</p></div>
                <div><label htmlFor="caffeineHalfLife" className="block mb-1 font-medium text-sm">咖啡因半衰期 (小时):</label><input id="caffeineHalfLife" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={userSettings.caffeineHalfLifeHours} onChange={(e) => setUserSettings({...userSettings, caffeineHalfLifeHours: e.target.value === '' ? '' : parseFloat(e.target.value) })} onBlur={(e) => { const value = parseFloat(e.target.value); if (isNaN(value) || value < 1 || value > 24) setUserSettings({...userSettings, caffeineHalfLifeHours: defaultSettings.caffeineHalfLifeHours}); }} min="1" max="24" step="0.5" placeholder={defaultSettings.caffeineHalfLifeHours.toString()}/><p className="text-xs text-yellow-700 mt-1">影响体内咖啡因代谢速度估算，平均为 5 小时，个体差异大。</p></div>
              </div>
            </div>

            {/* Drink Management Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
                <h2 className="text-xl font-semibold mb-4 flex items-center"><Coffee size={20} className="mr-2" /> 饮品管理</h2>
                {showDrinkEditor ? (
                    <div className="mb-4 p-4 border border-amber-200 rounded-lg bg-amber-50/50">
                        <h3 className="font-semibold mb-3 text-base text-amber-900">{editingDrink ? '编辑饮品' : '添加新饮品'}</h3>
                        <div className="mb-3"><label htmlFor="newDrinkName" className="block mb-1 text-sm font-medium">饮品名称:</label><input id="newDrinkName" type="text" className="w-full p-2 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={newDrinkName} onChange={(e) => setNewDrinkName(e.target.value)} placeholder="例如：自制冷萃 (大杯)"/></div>
                        <div className="mb-3"><label htmlFor="newDrinkCaffeine" className="block mb-1 text-sm font-medium">咖啡因含量 (mg/100ml):</label><input id="newDrinkCaffeine" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={newDrinkCaffeine} onChange={(e) => setNewDrinkCaffeine(e.target.value)} placeholder="每100ml的咖啡因毫克数" min="0" step="1"/></div>
                        <div className="mb-4"><label htmlFor="newDrinkVolume" className="block mb-1 text-sm font-medium">默认容量 (ml, 可选):</label><input id="newDrinkVolume" type="number" className="w-full p-2 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" value={newDrinkVolume} onChange={(e) => setNewDrinkVolume(e.target.value)} placeholder="例如: 350 (留空则无默认)" min="1" step="1"/></div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <button onClick={handleAddOrUpdateDrink} className="flex-1 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow flex items-center justify-center"><Save size={16} className="mr-1" /> {editingDrink ? '保存修改' : '添加饮品'}</button>
                            <button onClick={resetDrinkForm} className="flex-1 py-2 px-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm flex items-center justify-center"><X size={16} className="mr-1" /> 取消</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setShowDrinkEditor(true)} className="w-full py-2 mb-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center justify-center text-sm shadow"><Plus size={16} className="mr-1" /> 添加自定义饮品</button>
                )}
                <div className="divide-y divide-amber-100">
                    <h3 className="font-medium mb-2 text-base pt-2">饮品列表:</h3>
                     <p className="text-xs text-yellow-700 mb-3 flex items-center"><HelpCircle size={14} className="mr-1 flex-shrink-0"/>品牌饮品数据为公开信息整理或估算值，可能存在误差，仅供参考。您可以编辑这些预设值或添加自定义饮品。</p>
                    <ul className="pt-2 space-y-1 max-h-60 overflow-y-auto text-sm">
                        {drinks.sort((a, b) => { if (a.isPreset && !b.isPreset) return -1; if (!a.isPreset && b.isPreset) return 1; return a.name.localeCompare(b.name); }).map(drink => (
                                <li key={drink.id} className={`flex justify-between items-center py-1.5 px-2 rounded ${drink.isPreset ? 'bg-amber-50' : 'bg-green-50'}`}>
                                    <div>
                                        <span className="font-medium truncate pr-2">{drink.name}</span>
                                        <span className="text-xs text-gray-600 ml-1">({drink.caffeineContent}mg/100ml{drink.defaultVolume ? `, ${drink.defaultVolume}ml` : ''})</span>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 space-x-1">
                                        {drink.isEditable && (<button onClick={() => editDrink(drink)} className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100" aria-label="Edit drink"><Edit size={14} /></button>)}
                                        {drink.isDeletable && (<button onClick={() => deleteDrink(drink.id)} className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100" aria-label="Delete drink"><Trash2 size={14} /></button>)}
                                        {!drink.isDeletable && (<span className="p-1 text-gray-400 cursor-not-allowed" title="预设饮品不可删除"><Trash2 size={14} /></span>)}
                                    </div>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>

             {/* Data Management Card */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Sliders size={20} className="mr-2" /> 数据管理</h2>
              <div className="space-y-4">
                <div><h3 className="font-medium mb-1 text-sm">导出数据:</h3><button onClick={() => { try { const exportData = { records, userSettings, drinks, exportTimestamp: new Date().toISOString(), version: '2.0' }; const dataStr = JSON.stringify(exportData, null, 2); const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`; const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); document.body.appendChild(linkElement); linkElement.click(); document.body.removeChild(linkElement); } catch (error) { console.error("导出数据失败:", error); alert("导出数据时发生错误。"); } }} className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow text-sm"><Download size={16} className="mr-1" /> 导出所有数据 (.json)</button><p className="text-xs text-yellow-700 mt-1">将所有记录、设置和饮品列表导出为 JSON 文件备份。</p></div>
                <div><h3 className="font-medium mb-1 text-sm">导入数据:</h3><label className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow text-sm"><Upload size={16} className="mr-1" /> 选择文件导入数据<input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target.result); if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.drinks)) { const firstDrink = data.drinks[0]; if (!firstDrink || typeof firstDrink.id === 'undefined' || typeof firstDrink.name === 'undefined' || typeof firstDrink.caffeineContent === 'undefined') throw new Error("饮品列表格式不正确。"); if (window.confirm('导入数据将覆盖当前所有记录、设置和饮品列表。确定要继续吗？')) { const mergedSettings = { ...defaultSettings, ...data.userSettings }; delete mergedSettings.defaultCupSize; setRecords(data.records.sort((a, b) => b.timestamp - a.timestamp)); setUserSettings(mergedSettings); setDrinks(data.drinks); alert('数据导入成功！'); setViewMode('current'); } } else if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.customDrinks)) { if (window.confirm('检测到旧版数据格式。导入将覆盖当前记录和设置，并将旧的自定义饮品添加到当前饮品列表。确定要继续吗？')) { const mergedSettings = { ...defaultSettings, ...data.userSettings }; delete mergedSettings.defaultCupSize; const convertedCustomDrinks = data.customDrinks.map(cd => ({ ...cd, defaultVolume: null, isPreset: false, isDeletable: true, isEditable: true, category: '自定义' })); const finalDrinks = [...initialPresetDrinks]; const presetIds = new Set(initialPresetDrinks.map(p => p.id)); convertedCustomDrinks.forEach(cd => { if (!presetIds.has(cd.id)) { finalDrinks.push(cd); } else { finalDrinks.push({...cd, id: `imported-${cd.id}-${Date.now()}`}); console.warn(`Imported custom drink ID conflict resolved for: ${cd.name}`); } }); setRecords(data.records.sort((a, b) => b.timestamp - a.timestamp)); setUserSettings(mergedSettings); setDrinks(finalDrinks); alert('旧版数据导入成功！自定义饮品已合并。'); setViewMode('current'); } } else { alert('导入失败：数据格式不正确或缺少必要部分 (需要 records, userSettings, drinks)。'); } } catch (error) { alert(`导入失败：无法解析文件或文件格式错误。错误: ${error.message}`); console.error('导入错误:', error); } finally { e.target.value = null; } }; reader.onerror = () => { alert('读取文件时出错。'); console.error('File reading error:', reader.error); e.target.value = null; }; reader.readAsText(file); }} /></label><p className="text-xs text-yellow-700 mt-1">从之前导出的 JSON 文件恢复数据。注意：这将覆盖当前所有数据。</p></div>
                <div><h3 className="font-medium mb-1 text-sm">清除数据:</h3><button onClick={() => { if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) { setRecords([]); setUserSettings(defaultSettings); setDrinks([...initialPresetDrinks]); setCurrentCaffeine(0); setOptimalSleepTime(''); localStorage.removeItem('caffeineRecords'); localStorage.removeItem('caffeineSettings'); localStorage.removeItem('caffeineDrinks'); alert('所有本地数据已清除！'); } }} className="w-full py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow text-sm"><RotateCcw size={16} className="mr-1" /> 清除所有本地数据</button><p className="text-xs text-red-500 mt-1">警告：此操作将永久删除所有记录、设置和自定义饮品，并重置为初始预设。</p></div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-yellow-700">
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议仅供参考，不能替代专业医疗意见。</p>
           <p>&copy; {new Date().getFullYear()} Caffeine Tracker App v2.1</p> {/* Version bump */}
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;
