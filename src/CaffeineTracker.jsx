import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Coffee, Clock, Edit, Trash2, Plus, X, Info, Activity, Settings, BarChart2, Calendar, ChevronLeft, ChevronRight, AlertCircle, Save, Award, Heart, PieChart, Sliders, Thermometer, Download, Upload, RotateCcw, HelpCircle, Search, Filter, Star, Leaf, CupSoda, GlassWater, Snowflake, Sun, Tag, Droplet, TrendingUp, Target, User, Weight, Moon } from 'lucide-react'; // Added more icons

// --- Constants and Defaults ---

// Define default settings outside the component for reuse
const defaultSettings = {
  weight: 60, // 默认体重（kg）
  gender: 'male', // 默认性别 (Currently unused in calculations, but kept for potential future use)
  maxDailyCaffeine: 400, // 默认每日最大咖啡因摄入量（mg） - FDA/Mayo Clinic general guideline
  recommendedDosePerKg: 5, // 推荐剂量 (mg/kg) - Used for personalized recommendation (range 3-6 suggested)
  safeSleepThresholdConcentration: 2.0, // 睡前安全咖啡因浓度阈值 (mg/L) - Example value, adjust based on sensitivity
  volumeOfDistribution: 0.6, // 分布容积 (L/kg) - Typical value for caffeine
  plannedSleepTime: '22:00', // 默认计划睡眠时间
  caffeineHalfLifeHours: 4, // 默认咖啡因半衰期（小时） - Average, user adjustable
};

// Define standard categories
const DRINK_CATEGORIES = ['通用', '连锁咖啡', '茶饮', '速溶', '其他'];
const DEFAULT_CATEGORY = '其他';

// Define initial preset drinks data with categories and reordered
// REMOVED isDeletable and isEditable flags - logic will handle this now
const initialPresetDrinks = [
  // --- 通用 (Generic) ---
  { id: 'preset-espresso', name: '浓缩咖啡', category: '通用', caffeineContent: 212, defaultVolume: 30, isPreset: true },
  { id: 'preset-drip', name: '滴滤咖啡', category: '通用', caffeineContent: 95, defaultVolume: 240, isPreset: true },
  { id: 'preset-americano-generic', name: '美式咖啡', category: '通用', caffeineContent: 80, defaultVolume: 355, isPreset: true },
  { id: 'preset-latte-generic', name: '拿铁咖啡', category: '通用', caffeineContent: 55, defaultVolume: 355, isPreset: true },
  { id: 'preset-cappuccino', name: '卡布奇诺', category: '通用', caffeineContent: 60, defaultVolume: 240, isPreset: true },

  // --- 连锁咖啡 (Coffee Chains - Ordered by perceived popularity) ---
  { id: 'preset-starbucks-americano', name: '星巴克 美式', category: '连锁咖啡', caffeineContent: 38.59, defaultVolume: 355, isPreset: true },
  { id: 'preset-starbucks-latte', name: '星巴克 拿铁', category: '连锁咖啡', caffeineContent: 27.89, defaultVolume: 355, isPreset: true },
  { id: 'preset-luckin-americano', name: '瑞幸 美式', category: '连锁咖啡', caffeineContent: 50, defaultVolume: 450, isPreset: true },
  { id: 'preset-luckin-latte', name: '瑞幸 拿铁', category: '连锁咖啡', caffeineContent: 33.33, defaultVolume: 450, isPreset: true },
  { id: 'preset-manner-americano', name: 'MANNER 美式', category: '连锁咖啡', caffeineContent: 56.34, defaultVolume: 355, isPreset: true },
  { id: 'preset-manner-latte', name: 'MANNER 拿铁', category: '连锁咖啡', caffeineContent: 52.39, defaultVolume: 355, isPreset: true },
  { id: 'preset-costa-americano', name: 'COSTA 美式', category: '连锁咖啡', caffeineContent: 47.29, defaultVolume: 480, isPreset: true },
  { id: 'preset-costa-latte', name: 'COSTA 拿铁', category: '连锁咖啡', caffeineContent: 36.88, defaultVolume: 480, isPreset: true },
  { id: 'preset-mcd-americano', name: '麦当劳 美式', category: '连锁咖啡', caffeineContent: 44.4, defaultVolume: 400, isPreset: true },
  { id: 'preset-mcd-latte', name: '麦当劳 拿铁', category: '连锁咖啡', caffeineContent: 42.75, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-americano', name: '肯德基 美式', category: '连锁咖啡', caffeineContent: 37.50, defaultVolume: 400, isPreset: true },
  { id: 'preset-kfc-latte', name: '肯德基 拿铁', category: '连锁咖啡', caffeineContent: 16.50, defaultVolume: 400, isPreset: true },
  { id: 'preset-tims-americano', name: 'Tims 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 350, isPreset: true },
  { id: 'preset-tims-latte', name: 'Tims 拿铁', category: '连锁咖啡', caffeineContent: 22.57, defaultVolume: 350, isPreset: true },
  { id: 'preset-cotti-americano', name: 'COTTI 美式', category: '连锁咖啡', caffeineContent: 34.00, defaultVolume: 400, isPreset: true },
  { id: 'preset-cotti-latte', name: 'COTTI 拿铁', category: '连锁咖啡', caffeineContent: 43.00, defaultVolume: 400, isPreset: true },

  // --- 茶饮 (Tea) ---
  { id: 'preset-black-tea', name: '红茶', category: '茶饮', caffeineContent: 47, defaultVolume: 240, isPreset: true },
  { id: 'preset-green-tea', name: '绿茶', category: '茶饮', caffeineContent: 28, defaultVolume: 240, isPreset: true },
  { id: 'preset-chagee', name: '霸王茶姬 (中杯)', category: '茶饮', caffeineContent: 35, defaultVolume: 470, isPreset: true },
  { id: 'preset-chagee-large', name: '霸王茶姬 (大杯)', category: '茶饮', caffeineContent: 35, defaultVolume: 580, isPreset: true },

  // --- 速溶 (Instant) ---
  { id: 'preset-instant', name: '速溶咖啡', category: '速溶', caffeineContent: 62, defaultVolume: 240, isPreset: true },
  { id: 'preset-nescafe-gold', name: '雀巢 金牌', category: '速溶', caffeineContent: 40, defaultVolume: 150, isPreset: true },

  // --- 其他 (Other) ---
  { id: 'preset-cola', name: '可乐', category: '其他', caffeineContent: 10, defaultVolume: 330, isPreset: true },
  { id: 'preset-energy', name: '能量饮料', category: '其他', caffeineContent: 32, defaultVolume: 250, isPreset: true },
  { id: 'preset-dark-chocolate', name: '黑巧克力(100g)', category: '其他', caffeineContent: 43, defaultVolume: 100, isPreset: true }, // Note: Unit inconsistency
];

// Store original preset IDs for reference (e.g., for deletion logic)
const originalPresetDrinkIds = new Set(initialPresetDrinks.map(d => d.id));

// Coffee-themed color palette for charts and UI elements (Refined)
const COFFEE_COLORS = {
  espresso: '#4a2c2a', // Dark brown (Primary Text/Strong elements)
  latte: '#c69c6d',     // Light brown/beige (Secondary elements)
  cappuccino: '#a0522d', // Sienna/Medium brown (Accent/Chart bars)
  accent: '#8b4513',    // Saddle brown (Buttons/Highlights)
  warning: '#f59e0b',   // amber-500 (Warnings)
  danger: '#ef4444',    // red-500 (Danger/High levels)
  safe: '#10b981',      // emerald-500 (Safe/Low levels)
  grid: '#e0d6c7',      // Lighter tan (Grid lines/Borders)
  tooltipBg: 'rgba(255, 255, 255, 0.95)', // White with opacity
  tooltipText: '#4a2c2a',
  bgBase: '#fdfbf6',    // Very light beige background
  bgCard: '#ffffff',    // White for cards
  textPrimary: '#4a2c2a', // Dark brown
  textSecondary: '#78350f', // Amber-800
  textMuted: '#a16207',   // Amber-700
  borderSubtle: '#f3eade', // Lighter beige border
  borderStrong: '#d2b48c', // Tan border
  customDrinkBg: '#f0fdf4', // Light green for custom drinks
  customDrinkBorder: '#bbf7d0',
  customDrinkText: '#166534',
  chartLine: '#8b4513', // Saddle brown for the metabolism line
  chartNowLine: '#dc2626', // Red for the 'now' line
  chartSleepLine: '#3b82f6', // Blue for the sleep threshold line
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
  today.setHours(0, 0, 0, 0); // Compare start of day
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
}

// --- Scientific Calculation Helpers ---

/**
 * Calculates the remaining caffeine amount from a single intake record at a specific time.
 * Uses the first-order decay formula based on half-life.
 * M(t) = M0 * (0.5)^(t / t_half)
 * @param {number} initialAmount - The initial caffeine amount (mg).
 * @param {number} intakeTimestamp - The timestamp of intake (milliseconds).
 * @param {number} calculationTimestamp - The timestamp at which to calculate remaining amount (milliseconds).
 * @param {number} halfLifeHours - The caffeine half-life in hours.
 * @returns {number} The remaining caffeine amount (mg), or 0 if calculation time is before intake.
 */
const calculateRemainingCaffeine = (initialAmount, intakeTimestamp, calculationTimestamp, halfLifeHours) => {
  if (calculationTimestamp < intakeTimestamp || halfLifeHours <= 0 || initialAmount <= 0) {
    return 0;
  }
  const hoursElapsed = (calculationTimestamp - intakeTimestamp) / (1000 * 60 * 60);
  const remaining = initialAmount * Math.pow(0.5, hoursElapsed / halfLifeHours);
  return Math.max(0, remaining); // Ensure non-negative result
};

/**
 * Calculates the total caffeine amount in the system at a specific time from all records.
 * @param {Array} records - Array of intake records.
 * @param {number} calculationTimestamp - The timestamp at which to calculate total amount (milliseconds).
 * @param {number} halfLifeHours - The caffeine half-life in hours.
 * @returns {number} The total caffeine amount (mg) at the specified time.
 */
const getTotalCaffeineAtTime = (records, calculationTimestamp, halfLifeHours) => {
  let total = 0;
  records.forEach(record => {
    if (record && typeof record.timestamp === 'number' && typeof record.amount === 'number') {
      total += calculateRemainingCaffeine(record.amount, record.timestamp, calculationTimestamp, halfLifeHours);
    }
  });
  return total;
};

/**
 * Estimates the time required for the current caffeine level to decay below a target amount.
 * Uses the inverse decay formula: t = t_half * log2(C_current / C_target)
 * @param {number} currentAmount - The current caffeine amount (mg).
 * @param {number} targetAmount - The target caffeine amount (mg).
 * @param {number} halfLifeHours - The caffeine half-life in hours.
 * @returns {number|null} The time required in hours, or null if calculation is not possible or needed.
 */
const calculateHoursToReachTarget = (currentAmount, targetAmount, halfLifeHours) => {
  if (currentAmount <= targetAmount || targetAmount < 0 || halfLifeHours <= 0) {
    return 0; // Already below or at target, or invalid input
  }
  if (targetAmount === 0) targetAmount = 0.1; // Avoid log(infinity) if target is exactly 0, use a small value

  const hoursNeeded = halfLifeHours * Math.log2(currentAmount / targetAmount);
  return isFinite(hoursNeeded) && hoursNeeded >= 0 ? hoursNeeded : null;
};

/**
 * Calculates the estimated caffeine concentration (mg/L) based on total amount, weight, and Vd.
 * C = Amount / (Vd * Weight)
 * @param {number} totalAmountMg - Total caffeine amount in the body (mg).
 * @param {number} weightKg - User's weight (kg).
 * @param {number} volumeOfDistribution - Volume of distribution (L/kg).
 * @returns {number|null} Estimated concentration (mg/L) or null if inputs are invalid.
 */
const estimateConcentration = (totalAmountMg, weightKg, volumeOfDistribution) => {
    if (totalAmountMg < 0 || weightKg <= 0 || volumeOfDistribution <= 0) {
        return null;
    }
    const totalVolumeL = volumeOfDistribution * weightKg;
    return totalAmountMg / totalVolumeL;
};

/**
 * Calculates the estimated caffeine amount (mg) corresponding to a target concentration.
 * Amount = TargetConcentration * Vd * Weight
 * @param {number} targetConcentrationMgL - Target concentration (mg/L).
 * @param {number} weightKg - User's weight (kg).
 * @param {number} volumeOfDistribution - Volume of distribution (L/kg).
 * @returns {number|null} Estimated amount (mg) or null if inputs are invalid.
 */
const estimateAmountFromConcentration = (targetConcentrationMgL, weightKg, volumeOfDistribution) => {
    if (targetConcentrationMgL < 0 || weightKg <= 0 || volumeOfDistribution <= 0) {
        return null;
    }
    const totalVolumeL = volumeOfDistribution * weightKg;
    return targetConcentrationMgL * totalVolumeL;
};


// --- Drink Selector Component ---
const DrinkSelector = ({ drinks, selectedDrinkId, onSelectDrink, onClearSelection }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', '通用', '连锁咖啡', etc.

  // Memoize categories to avoid recalculating on every render
  const categories = useMemo(() => {
    const existingCats = new Set(drinks.map(d => d.category || DEFAULT_CATEGORY));
    const allCats = new Set([...DRINK_CATEGORIES, ...existingCats]);
    return ['all', ...Array.from(allCats).sort((a, b) => {
      const aIndex = DRINK_CATEGORIES.indexOf(a);
      const bIndex = DRINK_CATEGORIES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })];
  }, [drinks]);

  // Memoize filtered drinks
  const filteredDrinks = useMemo(() => {
    return drinks.filter(drink => {
      const nameMatch = drink.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory === 'all' || (drink.category || DEFAULT_CATEGORY) === filterCategory;
      return nameMatch && categoryMatch;
    });
  }, [drinks, searchTerm, filterCategory]);

  // Group filtered drinks by category for rendering
  const groupedDrinks = useMemo(() => {
    const groups = {};
    filteredDrinks.forEach(drink => {
      const category = drink.category || DEFAULT_CATEGORY;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(drink);
    });

    // Sort items within each group: custom first, then preset, then alphabetically
    Object.values(groups).forEach(items => {
      items.sort((a, b) => {
        if (!a.isPreset && b.isPreset) return -1; // Custom before preset
        if (a.isPreset && !b.isPreset) return 1;  // Preset after custom
        return a.name.localeCompare(b.name);      // Alphabetical otherwise
      });
    });

    // Order categories based on DRINK_CATEGORIES, then alphabetically for others
    const orderedCategories = Object.keys(groups).sort((a, b) => {
      const aIndex = DRINK_CATEGORIES.indexOf(a);
      const bIndex = DRINK_CATEGORIES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return orderedCategories.map(category => ({ category, items: groups[category] }));
  }, [filteredDrinks]);

  // Simple icon mapping based on category or name keywords
  const getDrinkIcon = (drink) => {
    const nameLower = drink.name.toLowerCase();
    if (nameLower.includes('美式') || nameLower.includes('浓缩') || nameLower.includes('滴滤') || nameLower.includes('咖啡')) return <Coffee size={18} className={`mb-1 ${drink.isPreset ? 'text-amber-700' : COFFEE_COLORS.customDrinkText}`} />;
    if (nameLower.includes('拿铁') || nameLower.includes('卡布奇诺')) return <Coffee size={18} className={`mb-1 ${drink.isPreset ? 'text-orange-600' : COFFEE_COLORS.customDrinkText}`} />;
    if (nameLower.includes('茶')) return <Leaf size={18} className={`mb-1 ${drink.isPreset ? 'text-green-600' : COFFEE_COLORS.customDrinkText}`} />;
    if (nameLower.includes('可乐') || nameLower.includes('苏打')) return <CupSoda size={18} className={`mb-1 ${drink.isPreset ? 'text-blue-500' : COFFEE_COLORS.customDrinkText}`} />;
    if (nameLower.includes('能量')) return <Sun size={18} className={`mb-1 ${drink.isPreset ? 'text-yellow-500' : COFFEE_COLORS.customDrinkText}`} />;
    if (nameLower.includes('巧克力')) return <Star size={18} className={`mb-1 ${drink.isPreset ? 'text-yellow-900' : COFFEE_COLORS.customDrinkText}`} />;
    return <Droplet size={18} className={`mb-1 ${drink.isPreset ? 'text-gray-500' : COFFEE_COLORS.customDrinkText}`} />; // Use Droplet as default
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
            className={`w-full p-2 pl-8 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`}
          />
          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        {/* Category Filter */}
        <div className="relative flex-shrink-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`w-full sm:w-auto p-2 pl-8 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm appearance-none ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`}
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
            <h4 className={`text-sm font-semibold ${COFFEE_COLORS.textSecondary} mb-1.5`}>{category}</h4>
            <div className="grid grid-cols-3 gap-2">
              {items.map(drink => (
                <button
                  key={drink.id}
                  onClick={() => onSelectDrink(drink.id)}
                  className={`p-2 border rounded-lg text-center text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 flex flex-col items-center justify-center h-20 shadow-sm hover:shadow-md ${selectedDrinkId === drink.id
                      ? `bg-amber-200 ${COFFEE_COLORS.borderStrong} ring-2 ring-amber-500 ring-offset-1` // Selected style
                      : drink.isPreset
                        ? `bg-white ${COFFEE_COLORS.textPrimary} border-amber-200 hover:bg-amber-100 hover:border-amber-300` // Preset style
                        : `${COFFEE_COLORS.customDrinkBg} ${COFFEE_COLORS.customDrinkText} border-green-200 hover:bg-green-100 hover:border-green-300` // Custom drink style
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
          <p className={`text-center ${COFFEE_COLORS.textMuted} py-4 text-sm`}>没有找到匹配的饮品。</p>
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
  const [currentCaffeineAmount, setCurrentCaffeineAmount] = useState(0); // Renamed for clarity (mg)
  const [currentCaffeineConcentration, setCurrentCaffeineConcentration] = useState(0); // Added (mg/L)
  const [optimalSleepTime, setOptimalSleepTime] = useState('');
  const [hoursUntilSafeSleep, setHoursUntilSafeSleep] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // ID of the record being edited
  const [selectedDrinkId, setSelectedDrinkId] = useState(''); // ID of the selected drink from the list
  const [drinkVolume, setDrinkVolume] = useState('');
  const [customAmount, setCustomAmount] = useState(''); // For direct mg entry
  const [entryName, setEntryName] = useState(''); // Custom name for the specific entry (can override drink name)
  const [intakeTime, setIntakeTime] = useState(formatDatetimeLocal(new Date()));

  // Drinks State (Combined Presets and Custom)
  const [drinks, setDrinks] = useState([]); // Holds all drinks [{ id, name, caffeineContent, defaultVolume?, category, isPreset }]
  const [showDrinkEditor, setShowDrinkEditor] = useState(false);
  const [editingDrink, setEditingDrink] = useState(null); // The drink object being edited
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');
  const [newDrinkVolume, setNewDrinkVolume] = useState(''); // For editing/adding default volume
  const [newDrinkCategory, setNewDrinkCategory] = useState(DEFAULT_CATEGORY); // For editing/adding category

  // View and Statistics State
  const [viewMode, setViewMode] = useState('current'); // 'current', 'stats', 'settings'
  const [statsView, setStatsView] = useState('week'); // 'week', 'month', 'year'
  const [statsDate, setStatsDate] = useState(new Date());

  // Metabolism Chart State
  const [metabolismChartData, setMetabolismChartData] = useState([]);
  const metabolismChartRef = useRef(null); // Ref for chart container

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
          // Ensure all keys from defaultSettings exist, merge carefully
          const mergedSettings = { ...defaultSettings };
          for (const key in defaultSettings) {
            if (parsedSettings.hasOwnProperty(key) && typeof parsedSettings[key] === typeof defaultSettings[key]) {
              mergedSettings[key] = parsedSettings[key];
            }
          }
          // Validate numeric ranges
          if (mergedSettings.weight < 20 || mergedSettings.weight > 300) mergedSettings.weight = defaultSettings.weight;
          if (mergedSettings.maxDailyCaffeine < 0 || mergedSettings.maxDailyCaffeine > 2000) mergedSettings.maxDailyCaffeine = defaultSettings.maxDailyCaffeine;
          if (mergedSettings.recommendedDosePerKg < 1 || mergedSettings.recommendedDosePerKg > 10) mergedSettings.recommendedDosePerKg = defaultSettings.recommendedDosePerKg;
          if (mergedSettings.safeSleepThresholdConcentration < 0 || mergedSettings.safeSleepThresholdConcentration > 10) mergedSettings.safeSleepThresholdConcentration = defaultSettings.safeSleepThresholdConcentration;
          if (mergedSettings.volumeOfDistribution < 0.1 || mergedSettings.volumeOfDistribution > 1.5) mergedSettings.volumeOfDistribution = defaultSettings.volumeOfDistribution;
          if (mergedSettings.caffeineHalfLifeHours < 1 || mergedSettings.caffeineHalfLifeHours > 24) mergedSettings.caffeineHalfLifeHours = defaultSettings.caffeineHalfLifeHours;

          loadedSettings = mergedSettings;
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
          // Ensure loaded drinks have the category and isPreset fields, default if missing
          const validatedSavedDrinks = validDrinks.map(d => {
            const isOriginalPreset = originalPresetDrinkIds.has(d.id);
            const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : {};
            return {
              ...d,
              category: d.category || (isOriginalPreset ? originalPresetData.category : DEFAULT_CATEGORY), // Assign category, default custom to '其他'
              isPreset: d.isPreset ?? isOriginalPreset, // Keep saved isPreset if exists, otherwise determine from original list
              // isDeletable/isEditable are not stored, determined dynamically
            };
          });
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
      // Consider clearing potentially corrupted storage
      // localStorage.clear();
    } finally {
      setRecords(loadedRecords.sort((a, b) => b.timestamp - a.timestamp)); // Sort records initially
      setUserSettings(loadedSettings);
      setDrinks(loadedDrinks);
    }
  }, []); // Run once on mount

  // Update form volume and entry name when selected drink changes
  useEffect(() => {
    const selectedDrinkData = drinks.find(d => d.id === selectedDrinkId);
    const editingRecord = editingId ? records.find(r => r.id === editingId) : null;

    if (selectedDrinkData) {
      // Set Volume: Only if not editing or editing record has no volume
      if (!editingId || (editingRecord && !editingRecord.volume)) {
        setDrinkVolume(selectedDrinkData.defaultVolume?.toString() ?? '');
      }
      // Set Name: Only when selectedDrinkId changes and we are ADDING a new record.
      // The editRecord function handles setting the initial name when editing.
      if (!editingId) {
        setEntryName(selectedDrinkData.name);
      }

    } else if (!editingId) {
      // Clear volume and name if deselected and not editing
      setDrinkVolume('');
      setEntryName('');
    }

    // Clear custom amount when drink selection changes unless editing a custom entry
    if (!editingId || (editingRecord && editingRecord.volume !== null)) {
      setCustomAmount('');
    }
  }, [selectedDrinkId, drinks, editingId, records]);


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
    // Only save if drinks state is initialized and different from initial presets or storage exists
    if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
      try {
        // Store only necessary fields, isPreset is important
        const drinksToSave = drinks.map(({ id, name, caffeineContent, defaultVolume, category, isPreset }) => ({
          id, name, caffeineContent, defaultVolume, category, isPreset
        }));
        localStorage.setItem('caffeineDrinks', JSON.stringify(drinksToSave));
      } catch (error) {
        console.error('Error saving drinks to localStorage:', error);
        alert("保存饮品列表时出错。");
      }
    }
  }, [drinks]);

  // Calculate current caffeine level (amount and concentration) and optimal sleep time
  useEffect(() => {
    const calculateCurrentStatus = () => {
      const now = Date.now();
      const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;

      // 1. Calculate total current caffeine amount (mg)
      const totalAmount = getTotalCaffeineAtTime(records, now, caffeineHalfLifeHours);
      setCurrentCaffeineAmount(totalAmount);

      // 2. Estimate current concentration (mg/L)
      const concentration = estimateConcentration(totalAmount, weight, volumeOfDistribution);
      setCurrentCaffeineConcentration(concentration ?? 0); // Default to 0 if calculation fails

      // 3. Calculate time to reach safe sleep threshold
      // First, determine the target *amount* (mg) corresponding to the safe concentration threshold
      const safeTargetAmount = estimateAmountFromConcentration(safeSleepThresholdConcentration, weight, volumeOfDistribution);

      if (safeTargetAmount !== null && safeTargetAmount >= 0) {
        const hoursNeeded = calculateHoursToReachTarget(totalAmount, safeTargetAmount, caffeineHalfLifeHours);
        setHoursUntilSafeSleep(hoursNeeded); // Store hours needed

        if (hoursNeeded !== null && hoursNeeded > 0) {
          const sleepTime = new Date(now + hoursNeeded * 60 * 60 * 1000);
          setOptimalSleepTime(sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        } else if (hoursNeeded === 0) {
           setOptimalSleepTime('现在'); // Safe to sleep now
        } else {
          setOptimalSleepTime('N/A'); // Calculation failed or not applicable
        }
      } else {
        // Handle case where safeTargetAmount calculation failed (e.g., invalid settings)
        setHoursUntilSafeSleep(null);
        setOptimalSleepTime('N/A');
      }
    };

    calculateCurrentStatus(); // Initial calculation
    const timer = setInterval(calculateCurrentStatus, 60000); // Recalculate every minute
    return () => clearInterval(timer); // Cleanup timer on unmount
  }, [records, userSettings]);

  // Generate data for the metabolism chart
  useEffect(() => {
    const generateChartData = () => {
      const now = Date.now();
      const { caffeineHalfLifeHours } = userSettings;
      const chartHoursBefore = 6;
      const chartHoursAfter = 18;
      const pointsPerHour = 4; // Data points per hour (e.g., every 15 mins)
      const data = [];

      const startTime = now - chartHoursBefore * 60 * 60 * 1000;
      const endTime = now + chartHoursAfter * 60 * 60 * 1000;
      const interval = (60 / pointsPerHour) * 60 * 1000; // Interval in milliseconds

      for (let time = startTime; time <= endTime; time += interval) {
        const caffeineLevel = getTotalCaffeineAtTime(records, time, caffeineHalfLifeHours);
        data.push({
          time: time,
          // timeLabel: formatTime(time), // Can be used for tooltips
          caffeine: parseFloat(caffeineLevel.toFixed(1)), // Round for display
        });
      }
      setMetabolismChartData(data);
    };

    // Debounce or throttle chart generation if performance becomes an issue
    generateChartData();
  }, [records, userSettings.caffeineHalfLifeHours]); // Re-generate if records or half-life changes


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
    let customNameValue = null; // Store custom name separately

    // Prioritize custom amount if entered
    if (customAmount) {
      const parsedAmount = parseFloat(customAmount);
      if (!isNaN(parsedAmount) && parsedAmount >= 0) {
        caffeineAmount = Math.round(parsedAmount);
        const baseDrink = selectedDrinkId ? drinks.find(d => d.id === selectedDrinkId) : null;
        nameForRecord = finalEntryName || (baseDrink ? `${baseDrink.name} (手动)` : '自定义摄入');
        drinkIdForRecord = selectedDrinkId || null; // Keep track of base drink if selected
        volume = null; // Volume is irrelevant
        // If a drink was selected but custom amount used, and name differs, store custom name
        if (baseDrink && finalEntryName && finalEntryName !== baseDrink.name) {
          customNameValue = finalEntryName;
        } else if (!baseDrink && finalEntryName) {
          customNameValue = finalEntryName; // Store name if it's purely custom
        }
      } else {
        alert("请输入有效的自定义咖啡因摄入量 (必须大于或等于 0)。");
        return;
      }
    }
    // If no custom amount, and a drink is selected, calculate based on volume
    else if (selectedDrinkId && drinkVolume) {
      const drink = drinks.find(d => d.id === selectedDrinkId);
      if (!drink) { alert("选择的饮品无效。"); return; }
      const caffeineContent = drink.caffeineContent;
      const parsedVolume = parseFloat(drinkVolume);
      if (!isNaN(parsedVolume) && parsedVolume > 0 && caffeineContent >= 0) {
        caffeineAmount = Math.round((caffeineContent * parsedVolume) / 100);
        volume = parsedVolume;
        drinkIdForRecord = drink.id;
        nameForRecord = finalEntryName || drink.name; // Use custom name if provided, else default
        // Store custom name only if it differs from the base drink name
        if (finalEntryName && finalEntryName !== drink.name) {
          customNameValue = finalEntryName;
        }
      } else {
        alert("请输入有效的容量 (必须大于 0)。");
        return;
      }
    }
    // If no custom amount, no drink selected, or drink selected but no volume
    else {
      alert("请选择饮品并输入容量，或清除选择并输入自定义摄入量和名称。");
      return;
    }

    // Validate timestamp
    let timestamp;
    try {
      timestamp = new Date(intakeTime).getTime();
      if (isNaN(timestamp)) throw new Error("Invalid date format");
    } catch (e) { alert("请输入有效的摄入时间。"); console.error("Invalid date/time value:", intakeTime); return; }

    const newRecord = {
      id: editingId || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: nameForRecord, // This will be the potentially customized name
      amount: caffeineAmount,
      volume: volume,
      timestamp,
      drinkId: drinkIdForRecord, // Store the original drink ID if applicable
      customName: customNameValue, // Store custom name if it differs from base or if it's a purely custom entry
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
    if (record.drinkId && record.volume !== null) { // Based on drink + volume
      setSelectedDrinkId(record.drinkId);
      setDrinkVolume(record.volume.toString());
      // Use customName if it exists, otherwise the record name (which might be custom or default)
      setEntryName(record.customName || record.name || '');
      setCustomAmount(''); // Clear custom amount
    } else { // Custom amount entry (or old format)
      setSelectedDrinkId(record.drinkId || ''); // Keep link if original drink was known
      setDrinkVolume(''); // Clear volume
      setCustomAmount(record.amount.toString());
      setEntryName(record.name); // Use the stored name
    }
    try {
      const recordDate = new Date(record.timestamp);
      setIntakeTime(formatDatetimeLocal(recordDate));
    } catch (e) {
      console.error("Error formatting record date for editing:", record.timestamp, e);
      setIntakeTime(formatDatetimeLocal(new Date()));
    }
    setShowForm(true);
  }, [drinks]); // Removed records dependency as it's accessed via closure


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
    const category = newDrinkCategory || DEFAULT_CATEGORY;

    if (!name || isNaN(caffeine) || caffeine < 0) { alert("请输入有效的饮品名称和非负的咖啡因含量 (mg/100ml)。"); return; }
    if (volume !== null && (isNaN(volume) || volume <= 0)) { alert("默认容量必须是大于 0 的数字，或留空。"); return; }

    // Check for duplicate name (case-insensitive) among all drinks, excluding the one being edited
    const existingDrink = drinks.find(drink =>
      drink.name.toLowerCase() === name.toLowerCase() &&
      drink.id !== editingDrink?.id
    );
    if (existingDrink) { alert(`名称为 "${name}" 的饮品已存在。请使用不同的名称。`); return; }

    const newDrinkData = {
      id: editingDrink?.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name,
      caffeineContent: caffeine,
      defaultVolume: volume,
      category: category,
      isPreset: editingDrink?.isPreset ?? false, // Keep preset status if editing preset, new drinks are custom
    };

    if (editingDrink) {
      setDrinks(drinks.map(drink => drink.id === editingDrink.id ? newDrinkData : drink));
    } else {
      // Add new custom drink
      setDrinks(prevDrinks => [...prevDrinks, newDrinkData]);
    }
    resetDrinkForm();
  }, [newDrinkName, newDrinkCaffeine, newDrinkVolume, newDrinkCategory, editingDrink, drinks]);


  const deleteDrink = useCallback((id) => {
    const drinkToDelete = drinks.find(drink => drink.id === id);
    if (!drinkToDelete) return;

    // Prevent deleting original preset drinks
    if (originalPresetDrinkIds.has(id)) {
      alert("无法删除原始预设饮品。您可以编辑它或添加新的自定义饮品。");
      return;
    }

    // Allow deleting custom drinks or presets added/modified by user (which won't have original IDs)
    if (window.confirm(`确定要删除饮品 "${drinkToDelete.name}" 吗？`)) {
      setDrinks(drinks.filter(drink => drink.id !== id));
      if (selectedDrinkId === id) { setSelectedDrinkId(''); } // Clear selection if deleted drink was selected
    }
  }, [drinks, selectedDrinkId]);

  const editDrink = useCallback((drink) => {
    setEditingDrink(drink);
    setNewDrinkName(drink.name);
    setNewDrinkCaffeine(drink.caffeineContent.toString());
    setNewDrinkVolume(drink.defaultVolume?.toString() ?? '');
    setNewDrinkCategory(drink.category || DEFAULT_CATEGORY);
    setShowDrinkEditor(true);
  }, []);

  const resetDrinkForm = useCallback(() => {
    setShowDrinkEditor(false);
    setEditingDrink(null);
    setNewDrinkName('');
    setNewDrinkCaffeine('');
    setNewDrinkVolume('');
    setNewDrinkCategory(DEFAULT_CATEGORY);
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
    // Prevent navigating fully into the future
    if (direction > 0 && isFutureDate) {
      let startOfPeriod;
      if (statsView === 'week') startOfPeriod = getStartOfWeek(newDate);
      else if (statsView === 'month') startOfPeriod = getStartOfMonth(newDate);
      else startOfPeriod = getStartOfYear(newDate);
      // Allow navigating *to* the current period, but not past it
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

  // Personalized daily recommendation based on weight
  const personalizedRecommendation = useMemo(() => {
      const { weight, recommendedDosePerKg } = userSettings;
      if (weight > 0 && recommendedDosePerKg > 0) {
          return Math.round(weight * recommendedDosePerKg);
      }
      return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  // Use the general 400mg limit OR the personalized one, whichever is lower, as the primary daily limit for status checks
  const effectiveMaxDaily = useMemo(() => {
      const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
      if (personalizedRecommendation !== null) {
          return Math.min(generalMax, personalizedRecommendation);
      }
      return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  const userStatus = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    const maxDaily = effectiveMaxDaily; // Use the effective limit

    if (currentRounded < maxDaily * 0.1) return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
    if (currentRounded < maxDaily * 0.5) return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
    if (currentRounded < maxDaily) return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-amber-500` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const weekData = getWeekDailyTotals();
    const weekTotal = Math.round(weekData.reduce((sum, day) => sum + day.value, 0));
    const weeklyAvg = weekTotal > 0 ? Math.round(weekTotal / 7) : 0;
    const maxDaily = effectiveMaxDaily; // Use effective limit
    const currentRounded = Math.round(currentCaffeineAmount);

    if (dailyTotal > maxDaily) return { advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过您的个性化或通用上限 (${maxDaily}mg)，建议减少摄入。`, color: `text-red-700`, bgColor: `bg-red-100` };
    if (weeklyAvg > maxDaily * 0.9) return { advice: `您本周的日均咖啡因摄入量 (${weeklyAvg}mg) 接近上限 (${maxDaily}mg)，建议适当减少以避免产生耐受性。`, color: `text-amber-700`, bgColor: `bg-amber-100` };
    if (currentRounded > 100 && new Date().getHours() >= 16) return { advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。', color: `text-amber-700`, bgColor: `bg-amber-100` };
    return { advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。', color: 'text-emerald-700', bgColor: 'bg-emerald-100' };
  }, [getTodayTotal, getWeekDailyTotals, effectiveMaxDaily, currentCaffeineAmount]);

  // UPDATED: Group by original preset ID if available, otherwise by custom name/ID
  const caffeineDistribution = useMemo(() => {
    const sourceData = {};
    let totalIntake = 0;

    // Create a map of original preset IDs to their names for easy lookup
    const originalPresetNames = initialPresetDrinks.reduce((acc, drink) => {
      acc[drink.id] = drink.name;
      return acc;
    }, {});

    records.forEach(record => {
      if (!record || typeof record.amount !== 'number' || record.amount <= 0) return;

      let groupKey = '';
      let groupName = '';

      // Check if the record is linked to an *original* preset
      if (record.drinkId && originalPresetNames[record.drinkId]) {
        groupKey = record.drinkId; // Group by the original preset ID
        groupName = originalPresetNames[record.drinkId]; // Use the original preset name
      }
      // Check if linked to a *custom* drink (or a modified preset no longer matching original ID)
      else if (record.drinkId) {
        const customDrink = drinks.find(d => d.id === record.drinkId);
        groupKey = record.drinkId; // Group by the custom drink ID
        groupName = customDrink ? customDrink.name : (record.customName || record.name || '未知饮品');
      }
      // Handle purely custom entries (no drinkId)
      else {
        groupKey = record.customName || record.name || 'custom-manual-entry'; // Group manual entries
        groupName = record.customName || record.name || '自定义摄入';
      }

      if (!sourceData[groupKey]) {
        sourceData[groupKey] = { amount: 0, count: 0, name: groupName };
      }
      sourceData[groupKey].amount += record.amount;
      sourceData[groupKey].count += 1;
      totalIntake += record.amount;
    });

    if (totalIntake === 0) return [];

    const distributionArray = Object.entries(sourceData).map(([key, data]) => {
      return { id: key, name: data.name, amount: Math.round(data.amount), percentage: Math.round((data.amount / totalIntake) * 100) };
    });

    return distributionArray.sort((a, b) => b.amount - a.amount);
  }, [records, drinks]); // Added drinks dependency


  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = effectiveMaxDaily; // Use effective limit for gauge
    if (maxDailyCaffeineForProgress <= 0) return 0;
    // Calculate percentage based on *amount*, not concentration
    return Math.min(Math.max(0, (currentCaffeineAmount / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- Chart Rendering Logic ---

  // Bar Chart (Statistics View)
  const statsChartData = useMemo(() => {
    try {
      if (statsView === 'week') return getWeekDailyTotals();
      if (statsView === 'month') return getMonthDailyTotals();
      if (statsView === 'year') return getYearMonthlyTotals();
    } catch (error) { console.error("Error preparing stats chart data:", error); return []; }
    return [];
  }, [statsView, getWeekDailyTotals, getMonthDailyTotals, getYearMonthlyTotals]);

  const statsChartMaxValue = useMemo(() => {
    if (!statsChartData || statsChartData.length === 0) return 1;
    const maxValue = Math.max(...statsChartData.map(d => d.value));
    return Math.max(maxValue, 1);
  }, [statsChartData]);

  const hasStatsChartData = useMemo(() => statsChartData && statsChartData.some(d => d.value > 0), [statsChartData]);

  const formatYAxisTick = (value) => Math.round(value);

  const renderStatsChart = () => {
    if (!hasStatsChartData) {
      return <div key="chart-no-data" className={`flex items-center justify-center h-64 ${COFFEE_COLORS.textMuted} text-sm`}>{statsView === 'week' ? '本周没有数据' : statsView === 'month' ? '本月没有数据' : '本年没有数据'}</div>;
    }
    let title = '';
    if (statsView === 'week') title = '每日摄入量 (mg)';
    if (statsView === 'month') title = '每日摄入量 (mg)';
    if (statsView === 'year') title = '每月摄入量 (mg)';
    const maxDaily = effectiveMaxDaily; // Use effective limit for reference
    const yMax = Math.ceil(Math.max(statsChartMaxValue, maxDaily) * 1.1 / 50) * 50;
    const yAxisDomain = [0, yMax];

    return (
      <>
        <h3 className={`text-center text-sm font-medium ${COFFEE_COLORS.textSecondary} mb-3`}>{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          {/* *** INCREASED MARGINS HERE *** */}
          <BarChart data={statsChartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COFFEE_COLORS.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: COFFEE_COLORS.textMuted }} />
            <YAxis domain={yAxisDomain} tick={{ fontSize: 10, fill: COFFEE_COLORS.textMuted }} tickFormatter={formatYAxisTick} />
            <Tooltip
              contentStyle={{ backgroundColor: COFFEE_COLORS.tooltipBg, border: `1px solid ${COFFEE_COLORS.borderStrong}`, borderRadius: '8px', color: COFFEE_COLORS.tooltipText, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
              formatter={(value) => [`${Math.round(value)} mg`, '摄入量']}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload;
                if (entry?.date && (statsView === 'week' || statsView === 'month')) { return `${entry.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} (${label})`; }
                return label;
              }}
            />
            {/* Add ReferenceLine for max daily intake */}
            <ReferenceLine y={maxDaily} label={{ value: `上限 (${maxDaily}mg)`, position: 'insideTopRight', fill: COFFEE_COLORS.danger, fontSize: 10 }} stroke={COFFEE_COLORS.danger} strokeDasharray="3 3" />
            <Bar dataKey="value" name="摄入量" barSize={statsView === 'month' ? 10 : (statsView === 'year' ? 15 : 20)}>
              {statsChartData.map((entry, index) => {
                let fillColor = COFFEE_COLORS.cappuccino; // Default bar color
                if ((statsView === 'week' || statsView === 'month')) {
                  if (entry.value > maxDaily) fillColor = COFFEE_COLORS.danger;
                  else if (entry.value > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                  else if (entry.value > 0) fillColor = COFFEE_COLORS.safe; // Use safe color for non-warning/danger
                  else fillColor = '#e5e7eb'; // Light gray for zero values
                } else if (statsView === 'year') {
                  const daysInMonth = new Date(statsDate.getFullYear(), entry.monthIndex + 1, 0).getDate();
                  const avgDaily = daysInMonth > 0 ? entry.value / daysInMonth : 0;
                  if (avgDaily > maxDaily) fillColor = COFFEE_COLORS.danger;
                  else if (avgDaily > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                  else if (entry.value > 0) fillColor = COFFEE_COLORS.espresso; // Darker color for year average
                  else fillColor = '#e5e7eb'; // Light gray for zero values
                }
                return <Cell key={`cell-${index}`} fill={fillColor} radius={[4, 4, 0, 0]} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  };

   // Line Chart (Metabolism View)
   const renderMetabolismChart = () => {
    const now = Date.now();
    const { safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;
    const safeTargetAmount = estimateAmountFromConcentration(safeSleepThresholdConcentration, weight, volumeOfDistribution);

    // Find max value for Y-axis scaling
    const maxCaffeineValue = metabolismChartData.length > 0
        ? Math.max(...metabolismChartData.map(d => d.caffeine))
        : 50; // Default max if no data
    const yMax = Math.ceil(Math.max(maxCaffeineValue, safeTargetAmount ?? 0) * 1.1 / 10) * 10; // Scale nicely

    return (
        <div ref={metabolismChartRef} className="mt-4 min-h-[280px] p-4 rounded-lg" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>
            <h3 className="text-center text-sm font-medium mb-3" style={{ color: COFFEE_COLORS.textSecondary }}>
                咖啡因代谢曲线 (mg)
            </h3>
            {metabolismChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                        data={metabolismChartData}
                        // *** INCREASED MARGINS HERE ***
                        margin={{ top: 5, right: 30, left: 15, bottom: 30 }} // Increased left, right, bottom
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={COFFEE_COLORS.grid} />
                        <XAxis
                            dataKey="time"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(unixTime) => formatTime(unixTime)}
                            tick={{ fontSize: 10, fill: COFFEE_COLORS.textMuted }}
                            // Adjusted label position slightly
                            label={{ value: "时间", position: "insideBottom", dy: 20, fill: COFFEE_COLORS.textMuted, fontSize: 11 }}
                        />
                        <YAxis
                            domain={[0, yMax]}
                            tick={{ fontSize: 10, fill: COFFEE_COLORS.textMuted }}
                            // Adjusted label position slightly
                            label={{ value: "咖啡因 (mg)", angle: -90, position: "insideLeft", dx: -10, fill: COFFEE_COLORS.textMuted, fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: COFFEE_COLORS.tooltipBg, border: `1px solid ${COFFEE_COLORS.borderStrong}`, borderRadius: '8px', color: COFFEE_COLORS.tooltipText, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                            labelFormatter={(unixTime) => formatTime(unixTime)}
                            formatter={(value) => [`${value.toFixed(1)} mg`, '体内含量']}
                        />
                        {/* Line for caffeine level */}
                        <Line
                            type="monotone"
                            dataKey="caffeine"
                            stroke={COFFEE_COLORS.chartLine}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: COFFEE_COLORS.chartLine, stroke: COFFEE_COLORS.bgCard, strokeWidth: 2 }}
                            name="体内含量"
                        />
                        {/* Reference Line for 'Now' */}
                        <ReferenceLine
                            x={now}
                            stroke={COFFEE_COLORS.chartNowLine}
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                            label={{ value: "现在", position: "insideTopLeft", fill: COFFEE_COLORS.chartNowLine, fontSize: 10, dy: -5 }}
                        />
                        {/* Reference Line for Safe Sleep Threshold Amount */}
                        {safeTargetAmount !== null && safeTargetAmount >= 0 && (
                             <ReferenceLine
                                 y={safeTargetAmount}
                                 stroke={COFFEE_COLORS.chartSleepLine}
                                 strokeWidth={1.5}
                                 strokeDasharray="4 2"
                                 label={{ value: `睡眠阈值 (~${safeTargetAmount.toFixed(0)}mg)`, position: "insideBottomRight", fill: COFFEE_COLORS.chartSleepLine, fontSize: 10, dy: 10, dx: -5 }} // Adjusted dx slightly
                             />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-60 text-sm" style={{ color: COFFEE_COLORS.textMuted }}>
                    {records.length > 0 ? "正在生成图表..." : "添加摄入记录以查看代谢曲线。"}
                </div>
            )}
        </div>
    );
};


  // --- JSX ---
  return (
    <div className={`min-h-screen font-sans`} style={{ backgroundColor: COFFEE_COLORS.bgBase, color: COFFEE_COLORS.textPrimary }}>
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold flex justify-center items-center" style={{ color: COFFEE_COLORS.espresso }}>
            <Coffee className="mr-2" size={30} />
            咖啡因追踪器
          </h1>
          <p className="mt-1" style={{ color: COFFEE_COLORS.textSecondary }}>科学管理 · 健康生活</p>
        </header>

        {/* Navigation Tabs */}
        <div className="rounded-xl mb-5 flex overflow-hidden shadow-md border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
          <button onClick={() => setViewMode('current')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-amber-50'}`} style={viewMode === 'current' ? { backgroundColor: COFFEE_COLORS.accent } : { color: COFFEE_COLORS.accent }}><TrendingUp size={16} className="mr-1.5" /> 当前状态</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-amber-50'}`} style={viewMode === 'stats' ? { backgroundColor: COFFEE_COLORS.accent, borderColor: COFFEE_COLORS.borderSubtle } : { color: COFFEE_COLORS.accent, borderColor: COFFEE_COLORS.borderSubtle }}><BarChart2 size={16} className="mr-1.5" /> 数据统计</button>
          <button onClick={() => setViewMode('settings')} className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'settings' ? 'text-white shadow-inner' : 'hover:bg-amber-50'}`} style={viewMode === 'settings' ? { backgroundColor: COFFEE_COLORS.accent } : { color: COFFEE_COLORS.accent }}><Settings size={16} className="mr-1.5" /> 设置</button>
        </div>

        {/* Current Status View */}
        {viewMode === 'current' && (
          <>
            {/* Current Status Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Activity size={20} className="mr-2" /> 当前状态</h2>
              {/* Semi-Circle Progress Gauge */}
              <div className="relative w-full flex justify-center my-6">
                <svg width="240" height="160" viewBox="0 0 240 160">
                  {/* Background track */}
                  <path d="M20,130 A100,100 0 0,1 220,130" fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round" />
                  {/* Foreground progress */}
                  <path d="M20,130 A100,100 0 0,1 220,130" fill="none" stroke="url(#caffeine-gauge-gradient-optimized)" strokeWidth="20" strokeLinecap="round" strokeDasharray="314.16" strokeDashoffset={314.16 - (314.16 * percentFilled / 100)} style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="caffeine-gauge-gradient-optimized" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={COFFEE_COLORS.safe} />
                      <stop offset="75%" stopColor={COFFEE_COLORS.warning} />
                      <stop offset="100%" stopColor={COFFEE_COLORS.danger} />
                    </linearGradient>
                  </defs>
                  {/* Labels */}
                  <text x="20" y="155" fontSize="12" fill={COFFEE_COLORS.textMuted} textAnchor="start">0</text>
                  <text x="120" y="155" fontSize="12" fill={COFFEE_COLORS.textMuted} textAnchor="middle">{Math.round(effectiveMaxDaily / 2)}</text>
                  <text x="220" y="155" fontSize="12" fill={COFFEE_COLORS.textMuted} textAnchor="end">{effectiveMaxDaily}+</text>
                  {/* Center Text */}
                  <text x="120" y="100" fontSize="32" fontWeight="bold" fill={COFFEE_COLORS.espresso} textAnchor="middle">{Math.round(currentCaffeineAmount)}</text>
                  <text x="120" y="120" fontSize="14" fill={COFFEE_COLORS.textMuted} textAnchor="middle">mg 当前含量</text>
                  {/* Concentration display */}
                   {currentCaffeineConcentration > 0 && (
                     <text x="120" y="135" fontSize="10" fill={COFFEE_COLORS.textMuted} textAnchor="middle">
                       (约 {currentCaffeineConcentration.toFixed(1)} mg/L)
                     </text>
                   )}
                </svg>
              </div>
              {/* Status Text */}
              <div className="text-center mb-4 mt-2">
                <h3 className={`text-lg font-semibold ${userStatus.color}`}>{userStatus.status}</h3>
                <p className="mt-1" style={{ color: COFFEE_COLORS.textSecondary }}>{userStatus.recommendation}</p>
                {/* Health Advice */}
                <div className={`mt-3 text-sm p-3 rounded-lg ${healthAdvice.bgColor} ${healthAdvice.color} border border-opacity-50`} style={{ borderColor: healthAdvice.color.replace('text', 'border') }}>
                  <div className="flex items-center justify-center"><AlertCircle size={16} className="inline-block mr-1.5 flex-shrink-0" /><span>{healthAdvice.advice}</span></div>
                </div>
              </div>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t" style={{ color: COFFEE_COLORS.textSecondary, borderColor: COFFEE_COLORS.borderSubtle }}>
                   <div className="text-center p-2 rounded" style={{backgroundColor: COFFEE_COLORS.bgBase}}>
                     今日总摄入: <br/><span className="font-semibold text-base" style={{ color: COFFEE_COLORS.espresso }}>{todayTotal} mg</span>
                   </div>
                   <div className="text-center p-2 rounded" style={{backgroundColor: COFFEE_COLORS.bgBase}}>
                     每日推荐上限: <br/><span className="font-semibold text-base" style={{ color: COFFEE_COLORS.espresso }}>{effectiveMaxDaily} mg</span>
                     {personalizedRecommendation && effectiveMaxDaily !== personalizedRecommendation && <span className="text-xs block">({personalizedRecommendation}mg 基于体重)</span>}
                   </div>
              </div>
              {/* Optimal Sleep Time */}
               <div className="mt-3 text-sm text-center p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                   <div className="flex items-center justify-center"><Moon size={16} className="inline-block mr-1.5" />
                       {optimalSleepTime === 'N/A'
                           ? `无法计算建议睡眠时间 (检查设置)`
                           : optimalSleepTime === '现在'
                               ? `根据阈值 (<${userSettings.safeSleepThresholdConcentration.toFixed(1)}mg/L)，现在可以入睡`
                               : `建议最早睡眠时间: ${optimalSleepTime}`
                       }
                   </div>
                   {hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 0 && (
                       <div className="text-xs mt-1"> (约 {hoursUntilSafeSleep.toFixed(1)} 小时后达到安全阈值)</div>
                   )}
               </div>
            </div>

             {/* Metabolism Chart Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
                <h2 className="text-xl font-semibold mb-2 flex items-center" style={{ color: COFFEE_COLORS.espresso }}>
                    <TrendingUp size={20} className="mr-2" /> 咖啡因代谢曲线
                </h2>
                {renderMetabolismChart()}
                 <p className="text-xs mt-3 text-center" style={{ color: COFFEE_COLORS.textMuted }}>
                    图表显示基于您记录的摄入量和半衰期 ({userSettings.caffeineHalfLifeHours}小时) 的估算体内咖啡因含量 (mg) 变化。
                 </p>
            </div>


            {/* Add/Edit Form Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              {showForm ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: COFFEE_COLORS.espresso }}>{editingId ? '编辑咖啡因摄入记录' : '添加咖啡因摄入记录'}</h2>

                  {/* New Drink Selector Component */}
                  <DrinkSelector
                    drinks={drinks}
                    selectedDrinkId={selectedDrinkId}
                    onSelectDrink={(id) => {
                      if (selectedDrinkId === id) {
                        setSelectedDrinkId(''); // Deselect
                      } else {
                        setSelectedDrinkId(id);
                        // Volume and name are set via useEffect
                        // Clear custom amount when selecting a drink
                        setCustomAmount('');
                      }
                    }}
                    onClearSelection={() => {
                      setSelectedDrinkId('');
                      // Keep customAmount if user clears selection
                    }}
                  />

                  {/* Intake Time Input */}
                  <div className="mb-4">
                    <label htmlFor="intakeTime" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>摄入时间:</label>
                    <input id="intakeTime" type="datetime-local" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={intakeTime} onChange={(e) => setIntakeTime(e.target.value)} max={formatDatetimeLocal(new Date())} />
                  </div>

                  {/* Entry Name Input */}
                  <div className="mb-4">
                    <label htmlFor="entryName" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>记录名称:</label>
                    <input id="entryName" type="text" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={entryName} onChange={(e) => setEntryName(e.target.value)} placeholder={selectedDrink ? selectedDrink.name : "例如：午后提神咖啡"} />
                    <p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>{selectedDrinkId ? "可修改名称用于本次记录。" : "输入本次摄入的名称。"}</p>
                  </div>

                  {/* Volume Input (Conditional) */}
                  {selectedDrinkId && (
                    <div className="mb-4">
                      <label htmlFor="drinkVolume" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>容量 (ml):</label>
                      <input id="drinkVolume" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={drinkVolume} onChange={(e) => setDrinkVolume(e.target.value)} placeholder={`例如: ${selectedDrink?.defaultVolume ?? '250'}`} min="1" />
                      {drinkVolume && !isNaN(parseFloat(drinkVolume)) && parseFloat(drinkVolume) > 0 && selectedDrink?.caffeineContent >= 0 && (
                        <div className="mt-1 text-xs" style={{ color: COFFEE_COLORS.textMuted }}>预计咖啡因摄入量: {Math.round((selectedDrink.caffeineContent * parseFloat(drinkVolume)) / 100)} mg</div>
                      )}
                      <p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>输入容量以计算咖啡因。如需直接输入含量，请清除饮品选择。</p>
                    </div>
                  )}

                  {/* Custom Amount Input */}
                  <div className="mb-4">
                    <label htmlFor="customAmount" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>摄入量 (mg):</label>
                    <input id="customAmount" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="直接输入咖啡因毫克数" min="0" />
                    <p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>
                      {selectedDrinkId
                        ? "如果在此输入，将覆盖上方按容量计算的值。"
                        : "如果您不选择饮品，请在此直接输入咖啡因总量。"}
                    </p>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex space-x-3 mt-6">
                    <button onClick={handleAddOrUpdateRecord} className={`flex-1 py-2.5 px-4 text-white rounded-md hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-md text-sm font-medium`} style={{ backgroundColor: COFFEE_COLORS.accent }}><Save size={16} className="mr-1.5" />{editingId ? '保存修改' : '添加记录'}</button>
                    <button onClick={resetForm} className={`py-2.5 px-4 border rounded-md hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center text-sm font-medium`} style={{ borderColor: COFFEE_COLORS.borderStrong, color: COFFEE_COLORS.textSecondary }}><X size={16} className="mr-1.5" /> 取消</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)} className={`w-full py-3 text-white rounded-md hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-md font-medium`} style={{ backgroundColor: COFFEE_COLORS.accent }}><Plus size={18} className="mr-1.5" /> 添加咖啡因摄入记录</button>
              )}
            </div>

            {/* Intake History Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Clock size={20} className="mr-2" /> 摄入历史</h2>
              {records.length === 0 ? (
                <p className="text-center py-4" style={{ color: COFFEE_COLORS.textMuted }}>暂无记录。添加您的第一条咖啡因摄入记录吧！</p>
              ) : (
                <ul className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: COFFEE_COLORS.borderSubtle }}>
                  {records.map(record => (
                    <li key={record.id} className="py-3.5 flex justify-between items-center">
                      <div className="flex-1 overflow-hidden mr-2">
                        <div className="font-medium text-sm truncate" title={record.name}>
                          {record.name} - <span style={{ color: COFFEE_COLORS.accent }}>{record.amount} mg</span>
                          {/* Clarify if name was custom or derived */}
                          {record.customName && record.drinkId && (<span className="text-xs text-gray-500 ml-1 italic">(来自: {drinks.find(d => d.id === record.drinkId)?.name ?? '未知饮品'})</span>)}
                          {!record.customName && record.drinkId && record.volume === null && (<span className="text-xs text-gray-500 ml-1 italic">(手动)</span>)}
                        </div>
                        <div className="text-xs flex items-center flex-wrap gap-x-3 gap-y-1 mt-1" style={{ color: COFFEE_COLORS.textMuted }}>
                          <span className="flex items-center"><Calendar size={12} className="mr-1" /> {formatDate(record.timestamp)}</span>
                          <span className="flex items-center"><Clock size={12} className="mr-1" /> {formatTime(record.timestamp)}</span>
                          {record.volume && (<span className="flex items-center"><Droplet size={12} className="mr-1" /> {record.volume} ml</span>)}
                        </div>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <button onClick={() => editRecord(record)} className="p-1.5 rounded-full hover:bg-amber-100 transition-colors duration-150" style={{ color: COFFEE_COLORS.textSecondary }} aria-label="Edit record"><Edit size={16} /></button>
                        <button onClick={() => deleteRecord(record.id)} className="p-1.5 rounded-full hover:bg-red-100 transition-colors duration-150 text-red-600" aria-label="Delete record"><Trash2 size={16} /></button>
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
            <div className="mb-5 rounded-xl p-4 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => navigateStats(-1)} className="p-2 rounded-md transition-colors duration-150 hover:bg-amber-100" style={{ color: COFFEE_COLORS.textSecondary }} aria-label="Previous period"><ChevronLeft size={18} /></button>
                <h2 className="text-lg font-semibold text-center" style={{ color: COFFEE_COLORS.espresso }}>{formatStatsPeriod()}</h2>
                <button onClick={() => navigateStats(1)} className="p-2 rounded-md transition-colors duration-150 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: COFFEE_COLORS.textSecondary }} disabled={(() => { const nextDate = new Date(statsDate); if (statsView === 'week') nextDate.setDate(nextDate.getDate() + 7); else if (statsView === 'month') nextDate.setMonth(nextDate.getMonth() + 1, 1); else nextDate.setFullYear(nextDate.getFullYear() + 1); let startOfNextPeriod; if (statsView === 'week') startOfNextPeriod = getStartOfWeek(nextDate); else if (statsView === 'month') startOfNextPeriod = getStartOfMonth(nextDate); else startOfNextPeriod = getStartOfYear(nextDate); return startOfNextPeriod > Date.now(); })()} aria-label="Next period"><ChevronRight size={18} /></button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={() => { setStatsView('week'); setStatsDate(new Date()); }} className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'week' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`} style={statsView === 'week' ? { backgroundColor: COFFEE_COLORS.accent } : { backgroundColor: COFFEE_COLORS.bgBase, color: COFFEE_COLORS.accent }}>周</button>
                <button onClick={() => { setStatsView('month'); setStatsDate(new Date()); }} className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'month' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`} style={statsView === 'month' ? { backgroundColor: COFFEE_COLORS.accent } : { backgroundColor: COFFEE_COLORS.bgBase, color: COFFEE_COLORS.accent }}>月</button>
                <button onClick={() => { setStatsView('year'); setStatsDate(new Date()); }} className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'year' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`} style={statsView === 'year' ? { backgroundColor: COFFEE_COLORS.accent } : { backgroundColor: COFFEE_COLORS.bgBase, color: COFFEE_COLORS.accent }}>年</button>
              </div>
            </div>

            {/* Intake Overview Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><BarChart2 size={20} className="mr-2" /> 摄入总览</h2>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-lg text-center shadow-inner" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>
                  <div className="text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>{statsView === 'week' ? '本周总摄入' : statsView === 'month' ? '本月总摄入' : '本年总摄入'}</div>
                  <div className="text-2xl font-bold mt-1" style={{ color: COFFEE_COLORS.espresso }}>{statsView === 'week' ? getWeekTotal(statsDate) : statsView === 'month' ? getMonthTotal(statsDate) : getYearTotal(statsDate)} mg</div>
                </div>
                <div className="p-4 rounded-lg text-center shadow-inner" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>
                  <div className="text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>{statsView === 'week' ? '日均 (本周)' : statsView === 'month' ? '日均 (本月)' : '日均 (本年)'}</div>
                  <div className="text-2xl font-bold mt-1" style={{ color: COFFEE_COLORS.espresso }}>{(() => { let total = 0; let days = 0; if (statsView === 'week') { total = getWeekTotal(statsDate); days = 7; } else if (statsView === 'month') { total = getMonthTotal(statsDate); days = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate(); } else { total = getYearTotal(statsDate); const year = statsDate.getFullYear(); days = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365; } return days > 0 && total > 0 ? Math.round(total / days) : 0; })()} mg</div>
                </div>
              </div>
              <div className="p-4 rounded-lg mt-4 min-h-[300px]" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>{renderStatsChart()}</div>
            </div>

            {/* Intake Source Analysis Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><PieChart size={20} className="mr-2" /> 摄入来源分析 (所有记录)</h2>
              <div className="space-y-3">
                {caffeineDistribution.length > 0 ? (caffeineDistribution.slice(0, 7).map((item, index) => (
                  <div key={item.id} className="flex items-center text-sm">
                    <div className="w-28 truncate pr-2" title={item.name} style={{ color: COFFEE_COLORS.textSecondary }}>{item.name}</div>
                    <div className="flex-1 mx-2">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${item.percentage}%`, backgroundColor: [COFFEE_COLORS.espresso, COFFEE_COLORS.latte, COFFEE_COLORS.cappuccino, COFFEE_COLORS.accent, COFFEE_COLORS.grid, COFFEE_COLORS.warning, COFFEE_COLORS.danger][index % 7] }}></div>
                      </div>
                    </div>
                    <div className="w-24 text-right font-medium" style={{ color: COFFEE_COLORS.espresso }}>{item.percentage}% <span className="text-xs" style={{ color: COFFEE_COLORS.textMuted }}>({item.amount}mg)</span></div>
                  </div>
                ))) : (<p className="text-center py-3" style={{ color: COFFEE_COLORS.textMuted }}>没有足够的记录进行分析。</p>)}
              </div>
            </div>

            {/* Health Analysis Report Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Heart size={20} className="mr-2" /> 健康分析与洞察</h2>
              <div className="space-y-4 text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>
                <div className="p-4 rounded-lg shadow-inner" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>
                  <h3 className="font-semibold mb-1 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Award size={16} className="mr-1.5" /> 摄入模式评估</h3>
                  <p>{records.length > 0 ? `根据您的历史记录，${caffeineDistribution[0]?.name ? `您的主要咖啡因来源似乎是 ${caffeineDistribution[0].name} (${caffeineDistribution[0].percentage}%)。` : '您的咖啡因来源较为多样。'}` : "您还没有添加任何摄入记录。"}{records.length > 0 && ` 您设定的每日推荐上限为 ${effectiveMaxDaily}mg (综合通用指南${personalizedRecommendation ? `和体重推荐 ${personalizedRecommendation}mg` : ''})。本周您的日均摄入量约为 ${Math.round(getWeekTotal(new Date()) / 7)}mg。请关注统计图表，了解您是否经常超过推荐量。`}</p>
                </div>
                <div className="p-4 rounded-lg shadow-inner" style={{ backgroundColor: COFFEE_COLORS.bgBase }}>
                  <h3 className="font-semibold mb-1 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Clock size={16} className="mr-1.5" /> 睡眠影响考量</h3>
                  <p>咖啡因的半衰期设定为 <strong style={{ color: COFFEE_COLORS.espresso }}>{userSettings.caffeineHalfLifeHours} 小时</strong>。当前计算的建议最早睡眠时间为 <strong className="text-blue-700">{optimalSleepTime}</strong>，这是基于体内咖啡因浓度降至 <strong style={{ color: COFFEE_COLORS.espresso }}>{userSettings.safeSleepThresholdConcentration.toFixed(1)} mg/L</strong> (约 <strong style={{ color: COFFEE_COLORS.espresso }}>{(estimateAmountFromConcentration(userSettings.safeSleepThresholdConcentration, userSettings.weight, userSettings.volumeOfDistribution) ?? 0).toFixed(0)} mg</strong>) 所需的时间估算。如果您计划在 <strong className="text-blue-700">{userSettings.plannedSleepTime}</strong> 左右入睡，请留意当前体内咖啡因含量 (<strong className="text-blue-700">{Math.round(currentCaffeineAmount)}mg</strong>) 是否过高。通常建议睡前 6 小时避免摄入咖啡因。</p>
                </div>
              </div>
            </div>

            {/* Caffeine Knowledge Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Info size={20} className="mr-2" /> 咖啡因知识库 (科学依据)</h2>
              <ul className="space-y-2 text-sm list-disc list-inside" style={{ color: COFFEE_COLORS.textSecondary }}>
                <li><strong>推荐摄入量:</strong> FDA/Mayo Clinic 建议健康成人每日不超过 <strong style={{ color: COFFEE_COLORS.espresso }}>400mg</strong>。个性化推荐可按 <strong style={{ color: COFFEE_COLORS.espresso }}>3-6 mg/kg</strong> 体重计算 (本应用默认使用 <strong style={{ color: COFFEE_COLORS.espresso }}>{defaultSettings.recommendedDosePerKg} mg/kg</strong>，可在设置中调整)。</li>
                <li><strong>半衰期 (t½):</strong> 健康成人血浆半衰期平均约为 <strong style={{ color: COFFEE_COLORS.espresso }}>5 小时</strong> (范围 1.5-9.5 小时)。这是体内咖啡因量减少一半所需时间。您可以在设置中调整此值以匹配个人情况。</li>
                <li><strong>代谢模型:</strong> 本应用使用一级消除动力学模型 (<strong style={{ color: COFFEE_COLORS.espresso }}>C(t) = C₀ * e^(-kt)</strong>, 其中 k = ln(2)/t½) 来估算体内咖啡因残留量。</li>
                <li><strong>睡眠阈值:</strong> 多数研究建议睡前 <strong style={{ color: COFFEE_COLORS.espresso }}>6 小时</strong> 避免摄入。本应用通过计算当前咖啡因含量降至设定的安全浓度阈值 (<strong style={{ color: COFFEE_COLORS.espresso }}>{userSettings.safeSleepThresholdConcentration.toFixed(1)} mg/L</strong>) 所需时间来提供建议睡眠时间。此阈值可在设置中调整。</li>
                <li><strong>浓度估算:</strong> 体内浓度 (mg/L) 可通过 <strong style={{ color: COFFEE_COLORS.espresso }}>剂量(mg) / (分布容积(L/kg) * 体重(kg))</strong> 估算。典型分布容积 (Vd) 约为 <strong style={{ color: COFFEE_COLORS.espresso }}>0.6 L/kg</strong> (可在设置调整)。</li>
                <li><strong>清除时间:</strong> 大约需要 <strong style={{ color: COFFEE_COLORS.espresso }}>5 个半衰期</strong> (约 { (5 * userSettings.caffeineHalfLifeHours).toFixed(1)} 小时) 才能将体内咖啡因基本清除 (降至初始量的约 3%)。</li>
              </ul>
            </div>
          </>
        )}

        {/* Settings View */}
        {viewMode === 'settings' && (
          <>
            {/* Personal Settings Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><User size={20} className="mr-2" /> 个人参数</h2>
              <div className="space-y-4">
                <div><label htmlFor="userWeight" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Weight size={14} className="inline mr-1"/>体重 (kg):</label><input id="userWeight" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.weight} onChange={(e) => setUserSettings({ ...userSettings, weight: e.target.value === '' ? '' : parseInt(e.target.value) })} onBlur={(e) => { const value = parseInt(e.target.value); if (isNaN(value) || value < 20 || value > 300) setUserSettings({ ...userSettings, weight: defaultSettings.weight }); }} min="20" max="300" placeholder={defaultSettings.weight.toString()} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>用于计算个性化推荐摄入量和估算浓度。</p></div>
                {/* Gender field kept for potential future use, but not actively used in calculations */}
                {/* <div><label htmlFor="userGender" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>性别:</label><select id="userGender" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.gender} onChange={(e) => setUserSettings({ ...userSettings, gender: e.target.value })}><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>性别可能影响咖啡因代谢速率（当前未用于计算）。</p></div> */}
                <div><label htmlFor="maxDailyCaffeine" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Target size={14} className="inline mr-1"/>通用每日最大摄入量 (mg):</label><input id="maxDailyCaffeine" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.maxDailyCaffeine} onChange={(e) => setUserSettings({ ...userSettings, maxDailyCaffeine: e.target.value === '' ? '' : parseInt(e.target.value) })} onBlur={(e) => { const value = parseInt(e.target.value); if (isNaN(value) || value < 0 || value > 2000) setUserSettings({ ...userSettings, maxDailyCaffeine: defaultSettings.maxDailyCaffeine }); }} min="0" max="2000" placeholder={defaultSettings.maxDailyCaffeine.toString()} /><div className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>通用指南上限 (如 400mg)。设为 0 将使用默认值 400。</div></div>
                <div><label htmlFor="recommendedDosePerKg" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Target size={14} className="inline mr-1"/>个性化推荐剂量 (mg/kg):</label><input id="recommendedDosePerKg" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.recommendedDosePerKg} onChange={(e) => setUserSettings({ ...userSettings, recommendedDosePerKg: e.target.value === '' ? '' : parseFloat(e.target.value) })} onBlur={(e) => { const value = parseFloat(e.target.value); if (isNaN(value) || value < 1 || value > 10) setUserSettings({ ...userSettings, recommendedDosePerKg: defaultSettings.recommendedDosePerKg }); }} min="1" max="10" step="0.5" placeholder={defaultSettings.recommendedDosePerKg.toString()} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>建议范围 3-6 mg/kg。应用将取此计算值与通用上限中的较低者作为您的有效上限。</p></div>
              </div>
            </div>

             {/* Metabolism Settings Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Sliders size={20} className="mr-2" /> 代谢与睡眠设置</h2>
              <div className="space-y-4">
                <div><label htmlFor="caffeineHalfLife" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Clock size={14} className="inline mr-1"/>咖啡因半衰期 (小时):</label><input id="caffeineHalfLife" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.caffeineHalfLifeHours} onChange={(e) => setUserSettings({ ...userSettings, caffeineHalfLifeHours: e.target.value === '' ? '' : parseFloat(e.target.value) })} onBlur={(e) => { const value = parseFloat(e.target.value); if (isNaN(value) || value < 1 || value > 24) setUserSettings({ ...userSettings, caffeineHalfLifeHours: defaultSettings.caffeineHalfLifeHours }); }} min="1" max="24" step="0.5" placeholder={defaultSettings.caffeineHalfLifeHours.toString()} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>影响体内咖啡因代谢速度估算，平均为 5 小时，个体差异大 (1.5-9.5h)。</p></div>
                 <div><label htmlFor="volumeOfDistribution" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Droplet size={14} className="inline mr-1"/>分布容积 (L/kg):</label><input id="volumeOfDistribution" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.volumeOfDistribution} onChange={(e) => setUserSettings({ ...userSettings, volumeOfDistribution: e.target.value === '' ? '' : parseFloat(e.target.value) })} onBlur={(e) => { const value = parseFloat(e.target.value); if (isNaN(value) || value < 0.1 || value > 1.5) setUserSettings({ ...userSettings, volumeOfDistribution: defaultSettings.volumeOfDistribution }); }} min="0.1" max="1.5" step="0.1" placeholder={defaultSettings.volumeOfDistribution.toString()} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>用于估算浓度，典型值约为 0.6 L/kg。</p></div>
                <div><label htmlFor="safeSleepThresholdConcentration" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Moon size={14} className="inline mr-1"/>睡前安全浓度阈值 (mg/L):</label><input id="safeSleepThresholdConcentration" type="number" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.safeSleepThresholdConcentration} onChange={(e) => setUserSettings({ ...userSettings, safeSleepThresholdConcentration: e.target.value === '' ? '' : parseFloat(e.target.value) })} onBlur={(e) => { const value = parseFloat(e.target.value); if (isNaN(value) || value < 0 || value > 10) setUserSettings({ ...userSettings, safeSleepThresholdConcentration: defaultSettings.safeSleepThresholdConcentration }); }} min="0" max="10" step="0.1" placeholder={defaultSettings.safeSleepThresholdConcentration.toString()} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>当体内咖啡因浓度低于此值时，对睡眠影响较小（估算）。建议 1 mg/L 左右，敏感者可降低。</p></div>
                <div><label htmlFor="plannedSleepTime" className="block mb-1 font-medium text-sm" style={{ color: COFFEE_COLORS.textSecondary }}><Moon size={14} className="inline mr-1"/>计划睡眠时间:</label><input id="plannedSleepTime" type="time" className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500 bg-amber-50`} value={userSettings.plannedSleepTime} onChange={(e) => setUserSettings({ ...userSettings, plannedSleepTime: e.target.value || defaultSettings.plannedSleepTime })} /><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>用于提供更个性化的睡眠建议。</p></div>
              </div>
            </div>


            {/* Drink Management Card */}
            <div className="mb-5 rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Coffee size={20} className="mr-2" /> 饮品管理</h2>
              {showDrinkEditor ? (
                <div className="mb-4 p-4 border rounded-lg" style={{ backgroundColor: COFFEE_COLORS.bgBase, borderColor: COFFEE_COLORS.borderSubtle }}>
                  <h3 className="font-semibold mb-3 text-base" style={{ color: COFFEE_COLORS.espresso }}>{editingDrink ? '编辑饮品' : '添加新饮品'}</h3>
                  <div className="mb-3"><label htmlFor="newDrinkName" className="block mb-1 text-sm font-medium" style={{ color: COFFEE_COLORS.textSecondary }}>饮品名称:</label><input id="newDrinkName" type="text" className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`} value={newDrinkName} onChange={(e) => setNewDrinkName(e.target.value)} placeholder="例如：自制冷萃 (大杯)" /></div>
                  <div className="mb-3"><label htmlFor="newDrinkCaffeine" className="block mb-1 text-sm font-medium" style={{ color: COFFEE_COLORS.textSecondary }}>咖啡因含量 (mg/100ml):</label><input id="newDrinkCaffeine" type="number" className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`} value={newDrinkCaffeine} onChange={(e) => setNewDrinkCaffeine(e.target.value)} placeholder="每100ml的咖啡因毫克数" min="0" step="1" /></div>
                  <div className="mb-3"><label htmlFor="newDrinkVolume" className="block mb-1 text-sm font-medium" style={{ color: COFFEE_COLORS.textSecondary }}>默认容量 (ml, 可选):</label><input id="newDrinkVolume" type="number" className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`} value={newDrinkVolume} onChange={(e) => setNewDrinkVolume(e.target.value)} placeholder="例如: 350 (留空则无默认)" min="1" step="1" /></div>
                  {/* Category Selector for Adding/Editing Drinks */}
                  <div className="mb-4">
                    <label htmlFor="newDrinkCategory" className="block mb-1 text-sm font-medium" style={{ color: COFFEE_COLORS.textSecondary }}>分类:</label>
                    <select
                      id="newDrinkCategory"
                      className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-1 text-sm appearance-none ${COFFEE_COLORS.borderStrong} focus:ring-amber-500`}
                      value={newDrinkCategory}
                      onChange={(e) => setNewDrinkCategory(e.target.value)}
                      // Allow changing category unless it's an *original* preset
                      disabled={editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id)}
                    >
                      {DRINK_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id) && <p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>原始预设饮品的分类不可更改。</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button onClick={handleAddOrUpdateDrink} className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium"><Save size={16} className="mr-1.5" /> {editingDrink ? '保存修改' : '添加饮品'}</button>
                    <button onClick={resetDrinkForm} className="flex-1 py-2 px-3 border rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm flex items-center justify-center font-medium" style={{ borderColor: COFFEE_COLORS.borderStrong, color: COFFEE_COLORS.textSecondary }}><X size={16} className="mr-1.5" /> 取消</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowDrinkEditor(true)} className="w-full py-2.5 mb-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center text-sm shadow font-medium"><Plus size={16} className="mr-1.5" /> 添加自定义饮品</button>
              )}
              <div className="divide-y" style={{ borderColor: COFFEE_COLORS.borderSubtle }}>
                <h3 className="font-medium mb-2 text-base pt-3" style={{ color: COFFEE_COLORS.espresso }}>饮品列表:</h3>
                <p className="text-xs mb-3 flex items-center pt-2" style={{ color: COFFEE_COLORS.textMuted }}><HelpCircle size={14} className="mr-1 flex-shrink-0" />品牌饮品数据为公开信息整理或估算值，可能存在误差，仅供参考。您可以编辑这些预设值或添加自定义饮品。</p>
                <ul className="pt-2 space-y-2 max-h-72 overflow-y-auto text-sm pr-1">
                  {/* Sort drinks: by category order, then custom before preset, then alphabetically */}
                  {drinks
                    .sort((a, b) => {
                      const catA = a.category || DEFAULT_CATEGORY;
                      const catB = b.category || DEFAULT_CATEGORY;
                      const indexA = DRINK_CATEGORIES.indexOf(catA);
                      const indexB = DRINK_CATEGORIES.indexOf(catB);

                      if (indexA !== indexB) {
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      }
                      if (!a.isPreset && b.isPreset) return -1;
                      if (a.isPreset && !b.isPreset) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(drink => {
                      const isOriginalPreset = originalPresetDrinkIds.has(drink.id);
                      return (
                        <li key={drink.id} className={`flex justify-between items-center p-3 rounded-lg border ${!drink.isPreset ? COFFEE_COLORS.customDrinkBg : COFFEE_COLORS.bgBase}`} style={{ borderColor: !drink.isPreset ? COFFEE_COLORS.customDrinkBorder : COFFEE_COLORS.borderSubtle }}>
                          <div className="flex-1 overflow-hidden mr-2">
                            <div className="font-medium truncate" title={drink.name} style={{ color: !drink.isPreset ? COFFEE_COLORS.customDrinkText : COFFEE_COLORS.espresso }}>{drink.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: !drink.isPreset ? COFFEE_COLORS.customDrinkText : COFFEE_COLORS.textMuted }}>
                              <span className="inline-flex items-center mr-2"><Tag size={12} className="mr-0.5" />{drink.category || DEFAULT_CATEGORY}</span>
                              <span>{drink.caffeineContent}mg/100ml</span>
                              {drink.defaultVolume && <span className="ml-1">({drink.defaultVolume}ml)</span>}
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0 space-x-1 ml-2">
                            {/* Allow editing all drinks */}
                            <button onClick={() => editDrink(drink)} className="p-1.5 rounded-full hover:bg-amber-100 transition-colors duration-150" style={{ color: COFFEE_COLORS.textSecondary }} aria-label="Edit drink"><Edit size={14} /></button>
                            {/* Only allow deleting non-original presets (custom or user-added) */}
                            {!isOriginalPreset ? (
                              <button onClick={() => deleteDrink(drink.id)} className="p-1.5 text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150" aria-label="Delete drink"><Trash2 size={14} /></button>
                            ) : (
                              <span className="p-1.5 text-gray-400 cursor-not-allowed" title="原始预设饮品不可删除"><Trash2 size={14} /></span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>

            {/* Data Management Card */}
            <div className="rounded-xl p-6 shadow-lg border" style={{ backgroundColor: COFFEE_COLORS.bgCard, borderColor: COFFEE_COLORS.borderSubtle }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: COFFEE_COLORS.espresso }}><Sliders size={20} className="mr-2" /> 数据管理</h2>
              <div className="space-y-4">
                <div><h3 className="font-medium mb-1 text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>导出数据:</h3><button onClick={() => { try { const exportData = { records, userSettings, drinks, exportTimestamp: new Date().toISOString(), version: '2.4' }; const dataStr = JSON.stringify(exportData, null, 2); const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`; const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); document.body.appendChild(linkElement); linkElement.click(); document.body.removeChild(linkElement); } catch (error) { console.error("导出数据失败:", error); alert("导出数据时发生错误。"); } }} className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"><Download size={16} className="mr-1.5" /> 导出所有数据 (.json)</button><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>将所有记录、设置和饮品列表导出为 JSON 文件备份。</p></div>
                <div><h3 className="font-medium mb-1 text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>导入数据:</h3><label className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow text-sm font-medium"><Upload size={16} className="mr-1.5" /> 选择文件导入数据<input type="file" accept=".json" className="hidden" onChange={(e) => {
                  const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target.result); // Check for V2.4 format (or compatible)
                      if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.drinks)) {
                        const firstDrink = data.drinks[0];
                        // Basic validation of drink structure
                        if (data.drinks.length > 0 && (!firstDrink || typeof firstDrink.id === 'undefined' || typeof firstDrink.name === 'undefined' || typeof firstDrink.caffeineContent === 'undefined')) {
                          throw new Error("饮品列表格式不正确。");
                        }
                          // Check settings structure more thoroughly
                        let validSettings = true;
                        for (const key in defaultSettings) {
                            if (!data.userSettings.hasOwnProperty(key) || typeof data.userSettings[key] !== typeof defaultSettings[key]) {
                                console.warn(`Imported settings missing or incorrect type for key: ${key}. Using default.`);
                                // Allow import but use default for this key
                                // validSettings = false; break; // Or reject entirely
                            }
                        }

                        if (window.confirm('导入数据将覆盖当前所有记录、设置和饮品列表。确定要继续吗？')) {
                          // Merge settings carefully, applying defaults for missing/invalid ones
                          const importedSettings = { ...defaultSettings };
                            for (const key in defaultSettings) {
                                if (data.userSettings.hasOwnProperty(key) && typeof data.userSettings[key] === typeof defaultSettings[key]) {
                                    importedSettings[key] = data.userSettings[key];
                                }
                            }
                          // Validate numeric ranges after merging
                          if (importedSettings.weight < 20 || importedSettings.weight > 300) importedSettings.weight = defaultSettings.weight;
                          if (importedSettings.maxDailyCaffeine < 0 || importedSettings.maxDailyCaffeine > 2000) importedSettings.maxDailyCaffeine = defaultSettings.maxDailyCaffeine;
                          if (importedSettings.recommendedDosePerKg < 1 || importedSettings.recommendedDosePerKg > 10) importedSettings.recommendedDosePerKg = defaultSettings.recommendedDosePerKg;
                          if (importedSettings.safeSleepThresholdConcentration < 0 || importedSettings.safeSleepThresholdConcentration > 10) importedSettings.safeSleepThresholdConcentration = defaultSettings.safeSleepThresholdConcentration;
                          if (importedSettings.volumeOfDistribution < 0.1 || importedSettings.volumeOfDistribution > 1.5) importedSettings.volumeOfDistribution = defaultSettings.volumeOfDistribution;
                          if (importedSettings.caffeineHalfLifeHours < 1 || importedSettings.caffeineHalfLifeHours > 24) importedSettings.caffeineHalfLifeHours = defaultSettings.caffeineHalfLifeHours;

                          // Validate and sanitize imported drinks
                          const validatedDrinks = data.drinks.map(d => ({
                            id: d.id || `imported-${Date.now()}`,
                            name: d.name || '未知饮品',
                            caffeineContent: typeof d.caffeineContent === 'number' ? d.caffeineContent : 0,
                            defaultVolume: typeof d.defaultVolume === 'number' ? d.defaultVolume : null,
                            category: DRINK_CATEGORIES.includes(d.category) ? d.category : DEFAULT_CATEGORY,
                            isPreset: d.isPreset === true, // Keep isPreset flag from import
                          }));
                          setRecords(data.records.sort((a, b) => b.timestamp - a.timestamp));
                          setUserSettings(importedSettings);
                          setDrinks(validatedDrinks);
                          alert('数据导入成功！');
                          setViewMode('current');
                        }
                      }
                      // Handle older formats if needed (example from previous version)
                      // else if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.customDrinks)) { ... }
                      else {
                        alert('导入失败：数据格式不正确或缺少必要部分 (需要 records, userSettings, drinks)。');
                      }
                    } catch (error) { alert(`导入失败：无法解析文件或文件格式错误。错误: ${error.message}`); console.error('导入错误:', error); } finally { e.target.value = null; }
                  }; reader.onerror = () => { alert('读取文件时出错。'); console.error('File reading error:', reader.error); e.target.value = null; }; reader.readAsText(file);
                }} /></label><p className="text-xs mt-1" style={{ color: COFFEE_COLORS.textMuted }}>从之前导出的 JSON 文件恢复数据。注意：这将覆盖当前所有数据。</p></div>
                <div><h3 className="font-medium mb-1 text-sm" style={{ color: COFFEE_COLORS.textSecondary }}>清除数据:</h3><button onClick={() => { if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) { setRecords([]); setUserSettings(defaultSettings); setDrinks([...initialPresetDrinks]); setCurrentCaffeineAmount(0); setCurrentCaffeineConcentration(0); setOptimalSleepTime(''); setHoursUntilSafeSleep(null); localStorage.removeItem('caffeineRecords'); localStorage.removeItem('caffeineSettings'); localStorage.removeItem('caffeineDrinks'); alert('所有本地数据已清除！'); } }} className="w-full py-2.5 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"><RotateCcw size={16} className="mr-1.5" /> 清除所有本地数据</button><p className="text-xs text-red-500 mt-1">警告：此操作将永久删除所有记录、设置和自定义饮品，并重置为初始预设。</p></div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs" style={{ color: COFFEE_COLORS.textMuted }}>
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议基于科学模型估算，仅供参考，不能替代专业医疗意见。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Caffeine Tracker App v2.4.0</p> {/* Version bump */}
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;
