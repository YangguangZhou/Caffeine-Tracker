import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Importing Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
// Importing icons
import { Coffee, Clock, Edit, Trash2, Plus, X, Info, Activity, Settings, BarChart2, Calendar, ChevronLeft, ChevronRight, AlertCircle, Save, Award, Heart, PieChart, Sliders, Thermometer, Download, Upload, RotateCcw } from 'lucide-react'; // Added Download, Upload, RotateCcw

// --- Constants and Defaults ---

// Define default settings outside the component for reuse
const defaultSettings = {
  weight: 60, // 默认体重（kg）
  gender: 'male', // 默认性别
  maxDailyCaffeine: 400, // 默认每日最大咖啡因摄入量（mg）
  safeBeforeSleepCaffeine: 50, // 默认睡前安全咖啡因水平（mg）
  plannedSleepTime: '22:00', // 默认计划睡眠时间
  defaultCupSize: 250, // 默认杯子容量（ml）
  caffeineHalfLifeHours: 5, // 默认咖啡因半衰期（小时）- Can be adjusted in settings later if needed
};

// Coffee-themed color palette for charts
const COFFEE_COLORS = {
  espresso: '#4a2c2a', // Dark brown
  latte: '#c69c6d',   // Light brown/beige
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
  const [editingId, setEditingId] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState('');
  const [drinkVolume, setDrinkVolume] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customName, setCustomName] = useState(''); // New state for custom entry name
  const [intakeTime, setIntakeTime] = useState(formatDatetimeLocal(new Date()));

  // Custom Drinks State
  const [customDrinks, setCustomDrinks] = useState([]);
  const [showDrinkEditor, setShowDrinkEditor] = useState(false);
  const [editingDrink, setEditingDrink] = useState(null);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');

  // View and Statistics State
  const [viewMode, setViewMode] = useState('current'); // 'current', 'stats', 'settings'
  const [statsView, setStatsView] = useState('week'); // 'week', 'month', 'year' (Removed 'day')
  const [statsDate, setStatsDate] = useState(new Date());

  // Preset Caffeine Data (mg/100ml) - Kept as fallback/example
  const [caffeinePresets] = useState({
    '浓缩咖啡': 212,
    '滴滤咖啡': 95,
    '速溶咖啡': 62,
    '美式咖啡': 80,
    '拿铁咖啡': 55,
    '卡布奇诺': 60,
    '红茶': 47,
    '绿茶': 28,
    '可乐': 10,
    '能量饮料': 32,
    '黑巧克力(100g)': 43 // Note: Unit inconsistency (mg/100g). Keep for now, clarify if used.
  });

  // --- Effects ---

  // Load data from localStorage on initial mount
  useEffect(() => {
    let loadedRecords = [];
    let loadedSettings = defaultSettings;
    let loadedCustomDrinks = [];

    try {
      const savedRecords = localStorage.getItem('caffeineRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          const validRecords = parsedRecords.filter(r => r && typeof r.id !== 'undefined' && typeof r.amount === 'number' && typeof r.timestamp === 'number');
          if (validRecords.length !== parsedRecords.length) {
            console.warn("Some invalid records were filtered out during loading.");
          }
          loadedRecords = validRecords;
        } else {
          console.error('Invalid format for records data in localStorage. Clearing.');
          localStorage.removeItem('caffeineRecords');
        }
      }

      const savedSettings = localStorage.getItem('caffeineSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings === 'object' && parsedSettings !== null) {
          loadedSettings = { ...defaultSettings, ...parsedSettings }; // Merge with defaults
        } else {
          console.error('Invalid format for settings data in localStorage. Clearing.');
          localStorage.removeItem('caffeineSettings');
        }
      }

      const savedCustomDrinks = localStorage.getItem('caffeineCustomDrinks');
      if (savedCustomDrinks) {
        const parsedCustomDrinks = JSON.parse(savedCustomDrinks);
        if (Array.isArray(parsedCustomDrinks)) {
          const validCustomDrinks = parsedCustomDrinks.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string' && typeof d.caffeineContent === 'number');
          if (validCustomDrinks.length !== parsedCustomDrinks.length) {
            console.warn("Some invalid custom drinks were filtered out during loading.");
          }
          loadedCustomDrinks = validCustomDrinks;
        } else {
          console.error('Invalid format for custom drinks data in localStorage. Clearing.');
          localStorage.removeItem('caffeineCustomDrinks');
        }
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      // Consider clearing potentially corrupted data on error
      // localStorage.clear();
    } finally {
      // Set state after loading and validation
      setRecords(loadedRecords);
      setUserSettings(loadedSettings);
      setCustomDrinks(loadedCustomDrinks);
      // Initialize form volume based on loaded settings
      setDrinkVolume(loadedSettings.defaultCupSize.toString());
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Update default cup size in form when settings change, only if not editing/selecting
  useEffect(() => {
    if (!editingId && !selectedDrink) {
      setDrinkVolume(userSettings.defaultCupSize.toString());
    }
  }, [userSettings.defaultCupSize, editingId, selectedDrink]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    // Avoid saving empty initial state if nothing existed before
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
    // Avoid saving empty initial state if nothing existed before
    if (customDrinks.length > 0 || localStorage.getItem('caffeineCustomDrinks') !== null) {
      try {
        localStorage.setItem('caffeineCustomDrinks', JSON.stringify(customDrinks));
      } catch (error) {
        console.error('Error saving custom drinks to localStorage:', error);
        alert("保存自定义饮品时出错。");
      }
    }
  }, [customDrinks]);

  // Calculate current caffeine level (considering metabolism) and optimal sleep time
  useEffect(() => {
    const calculateCaffeine = () => {
      let total = 0;
      const now = Date.now();
      const halfLifeHours = userSettings.caffeineHalfLifeHours || 5; // Use setting or default

      records.forEach(record => {
        if (!record || typeof record.timestamp !== 'number' || typeof record.amount !== 'number') {
          console.warn('Skipping invalid record in calculation:', record);
          return;
        }
        const hoursElapsed = (now - record.timestamp) / (1000 * 60 * 60);
        const remaining = Math.max(0, record.amount * Math.pow(0.5, hoursElapsed / halfLifeHours));
        if (remaining > 0.1) {
          total += remaining;
        }
      });

      setCurrentCaffeine(Math.round(total));

      // Calculate optimal sleep time
      const safeLevel = userSettings.safeBeforeSleepCaffeine;
      if (total > safeLevel && safeLevel > 0 && halfLifeHours > 0) { // Added check for halfLifeHours > 0
        const hoursToSleep = halfLifeHours * Math.log2(total / safeLevel);
        if (isFinite(hoursToSleep) && hoursToSleep >= 0) { // Ensure non-negative hours
          const sleepTime = new Date(now + hoursToSleep * 60 * 60 * 1000);
          setOptimalSleepTime(sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setOptimalSleepTime('计算中...'); // Indicate calculation issue or long decay time
        }
      } else {
        setOptimalSleepTime('现在'); // 'Now' if caffeine is already below safe level or safeLevel is 0
      }
    };

    calculateCaffeine(); // Initial calculation
    const timer = setInterval(calculateCaffeine, 60000); // Update every minute
    return () => clearInterval(timer); // Cleanup timer
  }, [records, userSettings.safeBeforeSleepCaffeine, userSettings.caffeineHalfLifeHours]); // Recalculate when relevant state changes

  // --- Data Aggregation Functions (useCallback for optimization) ---

  // Get total caffeine intake for today
  const getTodayTotal = useCallback(() => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    return records
      .filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  // Get total caffeine intake for a specific date
  const getDayTotal = useCallback((date) => {
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    return records
      .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  // Get total caffeine intake for the week containing a specific date
  const getWeekTotal = useCallback((date) => {
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);
    return records
      .filter(record => record && record.timestamp >= weekStart && record.timestamp <= weekEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  // Get total caffeine intake for the month containing a specific date
  const getMonthTotal = useCallback((date) => {
    const monthStart = getStartOfMonth(date);
    const monthEnd = getEndOfMonth(date);
    return records
      .filter(record => record && record.timestamp >= monthStart && record.timestamp <= monthEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  // Get total caffeine intake for the year containing a specific date
  const getYearTotal = useCallback((date) => {
    const yearStart = getStartOfYear(date);
    const yearEnd = getEndOfYear(date);
    return records
        .filter(record => record && record.timestamp >= yearStart && record.timestamp <= yearEnd)
        .reduce((sum, record) => sum + record.amount, 0);
  }, [records]);


  // Get daily caffeine totals for the week containing statsDate
  const getWeekDailyTotals = useCallback(() => {
    const weekStart = getStartOfWeek(statsDate);
    const totals = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(currentDay.getDate() + i);
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        // Use short weekday name (e.g., 'Mon') - ensure locale consistency if needed
        name: currentDay.toLocaleDateString(undefined, { weekday: 'short' }),
        value: dayTotal,
        date: currentDay, // Keep the full date object
      });
    }
    return totals;
  }, [statsDate, getDayTotal]); // Depend on statsDate and getDayTotal

  // Get daily caffeine totals for the month containing statsDate
  const getMonthDailyTotals = useCallback(() => {
    const monthStart = getStartOfMonth(statsDate);
    const monthEnd = getEndOfMonth(statsDate);
    const totals = [];
    const endDate = new Date(monthEnd);

    if (isNaN(monthStart) || isNaN(monthEnd) || monthEnd < monthStart) {
      console.error("Invalid date range for getMonthDailyTotals");
      return [];
    }

    let currentDay = new Date(monthStart);
    while (currentDay <= endDate) {
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        name: currentDay.getDate().toString(), // Day number (1-31) as string for chart axis
        value: dayTotal,
        date: new Date(currentDay), // Keep the full date object
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return totals;
  }, [statsDate, getDayTotal]); // Depend on statsDate and getDayTotal

  // Get monthly caffeine totals for the year containing statsDate
  const getYearMonthlyTotals = useCallback(() => {
    const year = statsDate.getFullYear();
    const totals = [];
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]; // Chinese month names

    for (let i = 0; i < 12; i++) {
        const monthDate = new Date(year, i, 1); // First day of month i
        const monthTotal = getMonthTotal(monthDate);
        totals.push({
            name: monthNames[i], // Use month name for label
            value: monthTotal,
            monthIndex: i // Keep month index if needed
        });
    }
    return totals;
  }, [statsDate, getMonthTotal]); // Depend on statsDate and getMonthTotal

  // --- Event Handlers ---

  // Get caffeine content (mg/100ml) for the selected drink (preset or custom)
  const getSelectedDrinkCaffeineContent = useCallback(() => {
    if (caffeinePresets[selectedDrink]) {
      return caffeinePresets[selectedDrink];
    }
    const customDrink = customDrinks.find(drink => drink.name === selectedDrink);
    if (customDrink) {
      return customDrink.caffeineContent;
    }
    console.warn(`Caffeine content not found for drink: ${selectedDrink}`);
    return 0;
  }, [selectedDrink, caffeinePresets, customDrinks]);

  // Add or Update Record
  const handleAddOrUpdateRecord = useCallback(() => {
    let caffeineAmount = 0;
    let name = '';
    let volume = null;

    if (selectedDrink && drinkVolume) {
      // Calculate based on selected drink and volume
      const caffeineContent = getSelectedDrinkCaffeineContent();
      const parsedVolume = parseFloat(drinkVolume);
      if (!isNaN(parsedVolume) && parsedVolume > 0 && caffeineContent >= 0) {
        caffeineAmount = Math.round((caffeineContent * parsedVolume) / 100);
        name = selectedDrink;
        volume = parsedVolume;
      } else {
        alert("请输入有效的容量 (必须大于 0)。");
        return;
      }
    } else if (customAmount) {
      // Use custom entered amount and name
      const parsedAmount = parseFloat(customAmount);
      const trimmedName = customName.trim(); // Get custom name
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        caffeineAmount = parsedAmount;
        name = trimmedName || '自定义摄入'; // Use input name or default
      } else {
        alert("请输入有效的自定义咖啡因摄入量 (必须大于 0)。");
        return;
      }
    } else {
      alert("请选择饮品并输入容量，或直接输入自定义摄入量和名称。");
      return;
    }

    // Allow 0mg entries? For now, enforce > 0 for calculated/custom amount
    if (caffeineAmount <= 0 && !(selectedDrink && getSelectedDrinkCaffeineContent() === 0)) { // Allow explicit 0mg/100ml drinks
       alert("计算出的咖啡因摄入量必须大于 0。如果您想记录无咖啡因饮品，请确保其咖啡因含量设置为 0 mg/100ml 或使用自定义摄入量输入一个非常小的值（例如 1mg）。");
       return;
    }

    // Parse the input time string
    let timestamp;
    try {
      timestamp = new Date(intakeTime).getTime();
      if (isNaN(timestamp)) throw new Error("Invalid date format");
    } catch (e) {
      alert("请输入有效的摄入时间。");
      console.error("Invalid date/time value:", intakeTime);
      return;
    }

    const newRecord = {
      id: editingId || Date.now(),
      name,
      amount: caffeineAmount,
      volume: volume, // Store volume only if applicable
      timestamp
    };

    if (editingId) {
      setRecords(records.map(record => record.id === editingId ? newRecord : record));
    } else {
      setRecords(prevRecords => [...prevRecords, newRecord]);
    }

    resetForm();
  }, [editingId, selectedDrink, drinkVolume, customAmount, customName, intakeTime, records, getSelectedDrinkCaffeineContent, userSettings.defaultCupSize]); // Added dependencies

  // Delete Record
  const deleteRecord = useCallback((id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setRecords(records.filter(record => record.id !== id));
    }
  }, [records]); // Depend on records

  // Start Editing Record
  const editRecord = useCallback((record) => {
    setEditingId(record.id);
    const isPresetOrCustom = caffeinePresets[record.name] || customDrinks.some(d => d.name === record.name);
    setSelectedDrink(isPresetOrCustom ? record.name : '');
    setDrinkVolume(record.volume ? record.volume.toString() : '');
    setCustomAmount(!isPresetOrCustom ? record.amount.toString() : '');
    setCustomName(!isPresetOrCustom ? record.name : ''); // Set custom name if it wasn't a preset/custom drink

    try {
      const recordDate = new Date(record.timestamp);
      setIntakeTime(formatDatetimeLocal(recordDate));
    } catch (e) {
      console.error("Error formatting record date for editing:", record.timestamp, e);
      setIntakeTime(formatDatetimeLocal(new Date()));
    }
    setShowForm(true); // Open the form
  }, [caffeinePresets, customDrinks]); // Depend on presets and custom drinks for checking name

  // Reset Form
  const resetForm = useCallback(() => {
    setSelectedDrink('');
    setDrinkVolume(userSettings.defaultCupSize.toString());
    setCustomAmount('');
    setCustomName(''); // Reset custom name
    setEditingId(null);
    setShowForm(false);
    setIntakeTime(formatDatetimeLocal(new Date()));
  }, [userSettings.defaultCupSize]); // Depend on default cup size

  // Add or Update Custom Drink
  const handleAddOrUpdateCustomDrink = useCallback(() => {
    const name = newDrinkName.trim();
    const caffeine = parseFloat(newDrinkCaffeine);

    if (!name || isNaN(caffeine) || caffeine < 0) {
      alert("请输入有效的饮品名称和非负的咖啡因含量 (mg/100ml)。");
      return;
    }

    // Check for duplicate names (case-insensitive), ignoring the one being edited
    const existingPreset = Object.keys(caffeinePresets).find(presetName => presetName.toLowerCase() === name.toLowerCase());
    const existingCustom = customDrinks.find(drink => drink.name.toLowerCase() === name.toLowerCase() && drink.id !== editingDrink?.id);

    if (existingPreset || existingCustom) {
      alert(`名称为 "${name}" 的饮品已存在。请使用不同的名称。`);
      return;
    }

    const newDrink = {
      id: editingDrink?.id || Date.now(),
      name: name,
      caffeineContent: caffeine
    };

    if (editingDrink) {
      setCustomDrinks(customDrinks.map(drink => drink.id === editingDrink.id ? newDrink : drink));
    } else {
      setCustomDrinks(prevDrinks => [...prevDrinks, newDrink]);
    }

    resetCustomDrinkForm();
  }, [newDrinkName, newDrinkCaffeine, editingDrink, customDrinks, caffeinePresets]); // Added dependencies

  // Delete Custom Drink
  const deleteCustomDrink = useCallback((id) => {
    if (window.confirm('确定要删除这个自定义饮品吗？')) {
      setCustomDrinks(customDrinks.filter(drink => drink.id !== id));
      // Also deselect if the deleted drink was selected in the main form
      if (selectedDrink === customDrinks.find(d => d.id === id)?.name) {
          setSelectedDrink('');
      }
    }
  }, [customDrinks, selectedDrink]); // Depend on customDrinks and selectedDrink

  // Start Editing Custom Drink
  const editCustomDrink = useCallback((drink) => {
    setEditingDrink(drink);
    setNewDrinkName(drink.name);
    setNewDrinkCaffeine(drink.caffeineContent.toString());
    setShowDrinkEditor(true);
  }, []); // No dependencies needed

  // Reset Custom Drink Form
  const resetCustomDrinkForm = useCallback(() => {
    setShowDrinkEditor(false);
    setEditingDrink(null);
    setNewDrinkName('');
    setNewDrinkCaffeine('');
  }, []); // No dependencies needed

  // Navigate Stats View
  const navigateStats = useCallback((direction) => {
    const newDate = new Date(statsDate);

    if (statsView === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else if (statsView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction, 1); // Set day to 1
    } else if (statsView === 'year') {
        newDate.setFullYear(newDate.getFullYear() + direction);
    }

    // Prevent navigating to future dates beyond today (allow navigating *to* today/this week/this month/this year)
    const todayEnd = new Date();
    if (statsView === 'week') todayEnd.setDate(todayEnd.getDate() + (7 - todayEnd.getDay())); // End of current week
    if (statsView === 'month') todayEnd.setMonth(todayEnd.getMonth() + 1, 0); // End of current month
    if (statsView === 'year') todayEnd.setMonth(11, 31); // End of current year
    todayEnd.setHours(23, 59, 59, 999);

    if (newDate > todayEnd && direction > 0) {
      // Optionally, set to the latest possible date instead of doing nothing
      // setStatsDate(new Date()); // Or calculate latest valid week/month/year start
      return; // Don't navigate into the future
    }

    setStatsDate(newDate);
  }, [statsDate, statsView]); // Depend on statsDate and statsView

  // Format Stats Period Label
  const formatStatsPeriod = useCallback(() => {
    try {
      if (statsView === 'week') {
        const weekStart = new Date(getStartOfWeek(statsDate));
        const weekEnd = new Date(getEndOfWeek(statsDate));
        const startStr = weekStart.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        return `${startStr} - ${endStr}`;
      } else if (statsView === 'month') {
        return statsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      } else if (statsView === 'year') {
        return statsDate.getFullYear().toString();
      }
    } catch (e) {
      console.error("Error formatting stats period:", e);
      return "日期错误";
    }
    return ''; // Should not happen
  }, [statsDate, statsView]); // Depend on statsDate and statsView

  // --- Derived State and Calculations (useMemo for optimization) ---

  // User status based on current caffeine level
  const userStatus = useMemo(() => {
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (currentCaffeine < maxDaily * 0.1) {
      return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: 'text-green-600' };
    } else if (currentCaffeine < maxDaily * 0.5) {
      return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: 'text-green-500' };
    } else if (currentCaffeine < maxDaily) {
      return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: COFFEE_COLORS.warning }; // Use coffee color
    } else {
      return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: COFFEE_COLORS.danger }; // Use coffee color
    }
  }, [currentCaffeine, userSettings.maxDailyCaffeine]);

  // Health advice based on recent intake patterns
  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const weekData = getWeekDailyTotals(); // Use current date for week calculation
    const weekTotal = weekData.reduce((sum, day) => sum + day.value, 0);
    const weeklyAvg = weekTotal > 0 ? weekTotal / 7 : 0;
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;

    if (dailyTotal > maxDaily) {
      return { advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过推荐上限 (${maxDaily}mg)，建议减少摄入。`, color: COFFEE_COLORS.danger };
    } else if (weeklyAvg > maxDaily * 0.9) {
      return { advice: `您本周的日均咖啡因摄入量 (${Math.round(weeklyAvg)}mg) 较高，建议适当减少以避免产生耐受性。`, color: COFFEE_COLORS.warning };
    } else if (currentCaffeine > 100 && new Date().getHours() >= 16) { // After 4 PM
      return { advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。', color: COFFEE_COLORS.warning };
    } else {
      return { advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。', color: 'text-green-500' };
    }
  }, [getTodayTotal, getWeekDailyTotals, userSettings.maxDailyCaffeine, currentCaffeine]);

  // Caffeine distribution by source (drink name)
  const caffeineDistribution = useMemo(() => {
    const sourceData = {};
    let totalIntake = 0;

    records.forEach(record => {
      if (!record || typeof record.name !== 'string' || typeof record.amount !== 'number') return;
      const name = record.name || '未知来源';
      if (!sourceData[name]) {
        sourceData[name] = 0;
      }
      sourceData[name] += record.amount;
      totalIntake += record.amount;
    });

    if (totalIntake === 0) return [];

    return Object.entries(sourceData).map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      percentage: Math.round((amount / totalIntake) * 100)
    })).sort((a, b) => b.amount - a.amount);
  }, [records]);

  // Calculate percentage for progress gauge
  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    return Math.min(Math.max(0, (currentCaffeine / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeine, userSettings.maxDailyCaffeine]);

  // Today's total caffeine (memoized)
  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- Chart Rendering Logic ---

  // Prepare data for the Recharts component based on statsView
  const chartData = useMemo(() => {
      try {
          if (statsView === 'week') {
              return getWeekDailyTotals(); // Returns [{ name: 'Mon', value: 150, date: ... }, ...]
          } else if (statsView === 'month') {
              return getMonthDailyTotals(); // Returns [{ name: '1', value: 100, date: ... }, ...]
          } else if (statsView === 'year') {
              return getYearMonthlyTotals(); // Returns [{ name: '一月', value: 1200, monthIndex: 0 }, ...]
          }
      } catch (error) {
          console.error("Error preparing chart data:", error);
          return []; // Return empty array on error
      }
      return []; // Default empty array
  }, [statsView, getWeekDailyTotals, getMonthDailyTotals, getYearMonthlyTotals]); // Dependencies

  // Determine max value for Y-axis scaling
  const chartMaxValue = useMemo(() => {
      if (!chartData || chartData.length === 0) return 1; // Default max value if no data
      const maxValue = Math.max(...chartData.map(d => d.value));
      return Math.max(maxValue, 1); // Ensure max value is at least 1
  }, [chartData]);

  // Check if there's any data to display in the chart
  const hasChartData = useMemo(() => chartData && chartData.some(d => d.value > 0), [chartData]);

  // Render the chart using Recharts
  const renderChart = () => {
    if (!hasChartData) {
      return (
        <div key="chart-no-data" className="flex items-center justify-center h-64 text-yellow-700 text-sm">
          {statsView === 'week' ? '本周没有数据' : statsView === 'month' ? '本月没有数据' : '本年没有数据'}
        </div>
      );
    }

    let title = '';
    if (statsView === 'week') title = '每日摄入量 (mg)';
    if (statsView === 'month') title = '每日摄入量 (mg)';
    if (statsView === 'year') title = '每月摄入量 (mg)';

    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    const yAxisDomain = [0, Math.max(chartMaxValue, maxDaily) * 1.1]; // Ensure Y axis covers max daily limit + 10% buffer

    return (
      <>
        <h3 className="text-center text-sm font-medium text-yellow-800 mb-3">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}> {/* Adjusted margins */}
            <CartesianGrid strokeDasharray="3 3" stroke={COFFEE_COLORS.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis domain={yAxisDomain} tick={{ fontSize: 10 }} />
            <Tooltip
                contentStyle={{
                    backgroundColor: COFFEE_COLORS.tooltipBg,
                    border: `1px solid ${COFFEE_COLORS.grid}`,
                    borderRadius: '8px', // Rounded corners for tooltip
                    color: COFFEE_COLORS.tooltipText,
                }}
                formatter={(value) => [`${Math.round(value)} mg`, '摄入量']} // Custom tooltip content
            />
            {/* Optional Legend if needed later
            <Legend /> */}
            <Bar dataKey="value" name="摄入量" barSize={statsView === 'month' ? 10 : 20}>
              {chartData.map((entry, index) => {
                let fillColor = COFFEE_COLORS.cappuccino; // Default bar color
                // Color bars differently if they exceed thresholds (relevant for daily/monthly views)
                if ((statsView === 'week' || statsView === 'month')) {
                    if (entry.value > maxDaily) fillColor = COFFEE_COLORS.danger;
                    else if (entry.value > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                } else if (statsView === 'year') {
                    // Maybe color based on average daily intake for the month?
                    // Example: const daysInMonth = new Date(statsDate.getFullYear(), entry.monthIndex + 1, 0).getDate();
                    // const avgDaily = entry.value / daysInMonth;
                    // if (avgDaily > maxDaily) fillColor = COFFEE_COLORS.danger;
                    // else if (avgDaily > maxDaily * 0.75) fillColor = COFFEE_COLORS.warning;
                    // For simplicity, keep year bars uniform for now.
                    fillColor = COFFEE_COLORS.espresso;
                }
                return <Cell key={`cell-${index}`} fill={fillColor} />;
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
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'current' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <Thermometer size={16} className="mr-1" />
            当前状态
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'stats' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <BarChart2 size={16} className="mr-1" />
            数据统计
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm ${viewMode === 'settings' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <Settings size={16} className="mr-1" />
            设置
          </button>
        </div>

        {/* Current Status View */}
        {viewMode === 'current' && (
          <>
            {/* Current Status Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Activity size={20} className="mr-2" />
                当前状态
              </h2>

              {/* Semi-Circle Progress Gauge */}
              <div className="relative w-full flex justify-center my-6">
                <svg width="240" height="160" viewBox="0 0 240 160">
                  {/* Background Arc */}
                  <path
                    d="M20,130 A100,100 0 0,1 220,130" // Adjusted path for better centering
                    fill="none"
                    stroke="#e5e7eb" // gray-200
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                  {/* Progress Arc */}
                  <path
                    d="M20,130 A100,100 0 0,1 220,130"
                    fill="none"
                    stroke="url(#caffeine-gauge-gradient)" // Use specific ID for gauge gradient
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeDasharray="314.16" // Circumference of semi-circle (pi * r)
                    strokeDashoffset={314.16 - (314.16 * percentFilled / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} // Add transition
                  />
                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="caffeine-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="#4ade80" /> {/* green-400 */}
                       <stop offset="50%" stopColor={COFFEE_COLORS.warning} /> {/* Use coffee warning color */}
                       <stop offset="100%" stopColor={COFFEE_COLORS.danger} /> {/* Use coffee danger color */}
                    </linearGradient>
                  </defs>
                  {/* Labels */}
                  <text x="20" y="155" fontSize="12" fill="#78716c" textAnchor="start">0</text>
                  <text x="120" y="155" fontSize="12" fill="#78716c" textAnchor="middle">{Math.round((userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400) / 2)}</text>
                  <text x="220" y="155" fontSize="12" fill="#78716c" textAnchor="end">{userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400}+</text>
                  {/* Current Caffeine Amount Text */}
                  <text x="120" y="105" fontSize="28" fontWeight="bold" fill="#78716c" textAnchor="middle">{currentCaffeine} mg</text>
                  <text x="120" y="125" fontSize="12" fill="#a1a1aa" textAnchor="middle">当前体内含量</text>
                </svg>
              </div>

              {/* Status Text */}
              <div className="text-center mb-4 mt-2">
                <h3 className={`text-lg font-semibold ${userStatus.color}`}>
                  {userStatus.status}
                </h3>
                <p className="text-yellow-700 mt-1">{userStatus.recommendation}</p>

                {/* Health Advice */}
                <div className={`mt-3 text-sm p-2 rounded-lg bg-opacity-80 ${healthAdvice.color.startsWith('text-') ? healthAdvice.color.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100') : 'bg-gray-100'} ${healthAdvice.color}`}>
                  <div className="flex items-center justify-center">
                    <AlertCircle size={16} className="inline-block mr-1 flex-shrink-0" />
                    <span>{healthAdvice.advice}</span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex justify-between text-sm text-yellow-700 mt-4 pt-4 border-t border-amber-100">
                <div>今日总摄入: <span className="font-semibold">{todayTotal} mg</span></div>
                <div>目标摄入: <span className="font-semibold">{userSettings.maxDailyCaffeine} mg</span></div>
              </div>

              {/* Optimal Sleep Time */}
              <div className="mt-3 text-sm text-center p-2 rounded-lg bg-blue-100 text-blue-700">
                <Clock size={16} className="inline-block mr-1" />
                建议最早睡眠时间: <span className="font-semibold">{optimalSleepTime}</span>
              </div>
            </div>

            {/* Add/Edit Form Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              {showForm ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {editingId ? '编辑咖啡因摄入记录' : '添加咖啡因摄入记录'}
                  </h2>

                  {/* Drink Selection (Tags) */}
                  <div className="mb-4">
                    <label className="block mb-2 font-medium text-sm">选择或自定义:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedDrink ? (
                        <button
                          className="px-3 py-1.5 bg-amber-800 text-white rounded-full text-sm flex items-center shadow"
                          onClick={() => setSelectedDrink('')} // Allow deselecting
                        >
                          {selectedDrink} <X size={16} className="ml-1" />
                        </button>
                      ) : (
                        <>
                          {/* Preset Drink Tags */}
                          {Object.keys(caffeinePresets).map((name) => (
                            <button
                              key={name}
                              className="px-3 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full text-sm transition-colors duration-150"
                              onClick={() => {setSelectedDrink(name); setCustomAmount(''); setCustomName('');}}
                            >
                              {name}
                            </button>
                          ))}
                          {/* Custom Drink Tags */}
                          {customDrinks.map(drink => (
                            <button
                              key={drink.id}
                              className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-full text-sm transition-colors duration-150"
                              onClick={() => {setSelectedDrink(drink.name); setCustomAmount(''); setCustomName('');}}
                            >
                              {drink.name}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Intake Time Input */}
                  <div className="mb-4">
                    <label htmlFor="intakeTime" className="block mb-1 font-medium text-sm">摄入时间:</label>
                    <input
                      id="intakeTime"
                      type="datetime-local"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                      value={intakeTime}
                      onChange={(e) => setIntakeTime(e.target.value)}
                      max={formatDatetimeLocal(new Date())} // Prevent future dates
                    />
                  </div>

                  {/* Volume Input (Conditional) */}
                  {selectedDrink && (
                    <div className="mb-4">
                      <label htmlFor="drinkVolume" className="block mb-1 font-medium text-sm">容量 (ml):</label>
                      <input
                        id="drinkVolume"
                        type="number"
                        className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                        value={drinkVolume}
                        onChange={(e) => setDrinkVolume(e.target.value)}
                        placeholder={`例如: ${userSettings.defaultCupSize}`}
                        min="1"
                      />
                      {drinkVolume && !isNaN(parseFloat(drinkVolume)) && parseFloat(drinkVolume) > 0 && (
                        <div className="mt-1 text-xs text-yellow-700">
                          预计咖啡因摄入量: {Math.round((getSelectedDrinkCaffeineContent() * parseFloat(drinkVolume)) / 100)} mg
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Amount & Name Input (Conditional) */}
                  {!selectedDrink && (
                    <>
                      <div className="mb-4">
                        <label htmlFor="customName" className="block mb-1 font-medium text-sm">名称 (自定义):</label>
                        <input
                          id="customName"
                          type="text"
                          className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="例如：自制冷萃咖啡"
                        />
                      </div>
                      <div className="mb-4">
                        <label htmlFor="customAmount" className="block mb-1 font-medium text-sm">摄入量 (mg):</label>
                        <input
                          id="customAmount"
                          type="number"
                          className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="直接输入咖啡因毫克数"
                          min="1"
                        />
                      </div>
                    </>
                  )}

                  {/* Form Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button
                      onClick={handleAddOrUpdateRecord}
                      className="flex-1 py-2 px-4 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors duration-200 flex items-center justify-center shadow text-sm"
                    >
                      <Save size={16} className="mr-1" />
                      {editingId ? '保存修改' : '添加记录'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="py-2 px-4 border border-amber-800 text-amber-800 rounded-md hover:bg-amber-100 transition-colors duration-200 flex items-center justify-center text-sm"
                    >
                      <X size={16} className="mr-1" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors duration-200 flex items-center justify-center shadow"
                >
                  <Plus size={18} className="mr-1" /> 添加咖啡因摄入记录
                </button>
              )}
            </div>

            {/* Intake History Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Clock size={20} className="mr-2" />
                摄入历史
              </h2>
              {records.length === 0 ? (
                <p className="text-center text-yellow-700 py-4">暂无记录。添加您的第一条咖啡因摄入记录吧！</p>
              ) : (
                <ul className="divide-y divide-amber-100 max-h-96 overflow-y-auto">
                  {[...records] // Create a copy before sorting
                    .sort((a, b) => b.timestamp - a.timestamp) // Sort descending by time
                    .map(record => (
                      <li key={record.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">
                            {record.name} - {record.amount} mg
                          </div>
                          <div className="text-xs text-yellow-700 flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center">
                              <Calendar size={12} className="mr-1" /> {formatDate(record.timestamp)}
                            </span>
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" /> {formatTime(record.timestamp)}
                            </span>
                            {record.volume && (
                              <span className="flex items-center">
                                <Coffee size={12} className="mr-1" /> {record.volume} ml
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1 flex-shrink-0">
                          <button
                            onClick={() => editRecord(record)}
                            className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100 transition-colors duration-150"
                            aria-label="Edit record"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150"
                             aria-label="Delete record"
                          >
                            <Trash2 size={16} />
                          </button>
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
                <button
                  onClick={() => navigateStats(-1)}
                  className="p-2 text-yellow-700 hover:bg-amber-100 rounded-md transition-colors duration-150"
                  aria-label="Previous period"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-center">{formatStatsPeriod()}</h2>
                <button
                  onClick={() => navigateStats(1)}
                  className="p-2 text-yellow-700 hover:bg-amber-100 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isFuture(statsDate) && statsView !== 'year'} // Disable future nav except for year
                  aria-label="Next period"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex justify-center gap-2 mt-3">
                 {/* Removed 'Day' button */}
                <button
                  onClick={() => { setStatsView('week'); setStatsDate(new Date()); }}
                  className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'week' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                >
                  周
                </button>
                <button
                  onClick={() => { setStatsView('month'); setStatsDate(new Date()); }}
                  className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'month' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                >
                  月
                </button>
                 {/* Added 'Year' button */}
                <button
                  onClick={() => { setStatsView('year'); setStatsDate(new Date()); }}
                  className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'year' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                >
                  年
                </button>
              </div>
            </div>

            {/* Intake Overview Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart2 size={20} className="mr-2" />
                摄入总览
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Total Intake */}
                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                  <div className="text-sm text-yellow-700">
                    {statsView === 'week' ? '本周总摄入' : statsView === 'month' ? '本月总摄入' : '本年总摄入'}
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-1">
                    {statsView === 'week'
                      ? Math.round(getWeekTotal(statsDate))
                      : statsView === 'month'
                        ? Math.round(getMonthTotal(statsDate))
                        : Math.round(getYearTotal(statsDate)) // Calculate Year Total
                    } mg
                  </div>
                </div>

                {/* Average Daily Intake */}
                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                   <div className="text-sm text-yellow-700">
                     {statsView === 'week' ? '日均 (本周)' : statsView === 'month' ? '日均 (本月)' : '日均 (本年)'}
                   </div>
                   <div className="text-xl font-bold text-amber-800 mt-1">
                     {(() => {
                       if (statsView === 'week') {
                         const weekTotal = getWeekTotal(statsDate);
                         return weekTotal > 0 ? Math.round(weekTotal / 7) : 0;
                       } else if (statsView === 'month') {
                         const monthTotal = getMonthTotal(statsDate);
                         const daysInMonth = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate();
                         return daysInMonth > 0 && monthTotal > 0 ? Math.round(monthTotal / daysInMonth) : 0;
                       } else { // year view
                           const yearTotal = getYearTotal(statsDate);
                           const year = statsDate.getFullYear();
                           const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365; // Check leap year
                           return daysInYear > 0 && yearTotal > 0 ? Math.round(yearTotal / daysInYear) : 0;
                       }
                     })()} mg
                   </div>
                </div>
              </div>

              {/* Statistics Chart Area - Using Recharts */}
              <div className="bg-amber-50 p-4 rounded-lg mt-4 min-h-[300px]"> {/* Increased min-height */}
                 {renderChart()}
              </div>
            </div>

            {/* Intake Source Analysis Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <PieChart size={20} className="mr-2" />
                摄入来源分析 (所有记录)
              </h2>

              <div className="space-y-3">
                {caffeineDistribution.length > 0 ? (
                  caffeineDistribution.slice(0, 5).map((item, index) => ( // Show top 5 sources from all time
                    <div key={index} className="flex items-center text-sm">
                      <div className="w-24 truncate pr-2" title={item.name}>{item.name}</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${item.percentage}%`,
                              // Use coffee palette shades
                              backgroundColor: [COFFEE_COLORS.espresso, COFFEE_COLORS.latte, COFFEE_COLORS.cappuccino, COFFEE_COLORS.accent, COFFEE_COLORS.grid][index % 5]
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-20 text-right text-yellow-800 font-medium">
                        {item.percentage}% <span className="text-xs text-yellow-600">({item.amount}mg)</span>
                      </div>
                    </div>
                  ))
                ) : (
                   <p className="text-center text-yellow-700 py-3">没有足够的记录进行分析。</p>
                )}
              </div>
            </div>

            {/* Health Analysis Report Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Heart size={20} className="mr-2" />
                健康分析与洞察
              </h2>

              <div className="space-y-4 text-sm text-yellow-800">
                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Award size={16} className="mr-1 text-amber-700" />
                    摄入模式评估
                  </h3>
                  <p>
                    {records.length > 0 ?
                      `根据您的历史记录，${caffeineDistribution[0]?.name ? `您的主要咖啡因来源似乎是 ${caffeineDistribution[0].name} (${caffeineDistribution[0].percentage}%)。` : '您的咖啡因来源较为多样。'}` :
                      "您还没有添加任何摄入记录。"
                    }
                    {records.length > 0 &&
                     ` 您设定的每日最大摄入量为 ${userSettings.maxDailyCaffeine}mg。本周您的日均摄入量约为 ${Math.round(getWeekTotal(new Date()) / 7)}mg。请关注统计图表，了解您是否经常超过推荐量。`
                    }
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Clock size={16} className="mr-1 text-amber-700" />
                    睡眠影响考量
                  </h3>
                  <p>
                    咖啡因的平均半衰期约为 ${userSettings.caffeineHalfLifeHours} 小时，但个体差异显著。当前计算的建议最早睡眠时间为 <strong className="text-blue-700">{optimalSleepTime}</strong>，这是基于当前体内咖啡因降至 ${userSettings.safeBeforeSleepCaffeine}mg 所需的时间估算。
                    如果您计划在 <strong className="text-blue-700">{userSettings.plannedSleepTime}</strong> 左右入睡，请留意当前体内咖啡因含量 (<strong className="text-blue-700">{currentCaffeine}mg</strong>) 是否过高。通常建议睡前 6 小时避免摄入咖啡因。
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg text-green-800 shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Info size={16} className="mr-1 text-green-700" />
                    专业建议与提醒
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                      <li>多数健康指南建议成人每日咖啡因摄入不超过 400mg。</li>
                      <li>个体对咖啡因的敏感度和代谢速度差异很大，受遗传、年龄、健康状况、药物（如避孕药）和生活习惯（如吸烟）等多种因素影响。</li>
                      <li>长期高剂量摄入可能导致耐受性增加（效果减弱）和潜在的依赖性。突然停止可能引起戒断症状（如头痛、疲劳）。</li>
                      <li>关注身体信号，如果您在摄入咖啡因后感到焦虑、心悸、失眠或胃部不适，请考虑减少摄入量或咨询医生。</li>
                      <li>本工具提供估算和一般性建议，不能替代专业的医疗或营养建议。</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Settings View */}
        {viewMode === 'settings' && (
          <>
            {/* Data Management Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Sliders size={20} className="mr-2" />
                数据管理
              </h2>
              <div className="space-y-4">
                {/* Export Data */}
                <div>
                  <h3 className="font-medium mb-1 text-sm">导出数据:</h3>
                  <button
                    onClick={() => {
                      try {
                        const exportData = {
                          records,
                          userSettings,
                          customDrinks,
                          exportTimestamp: new Date().toISOString(),
                          version: '1.2' // Updated version
                        };
                        const dataStr = JSON.stringify(exportData, null, 2);
                        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                        const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportFileDefaultName);
                        document.body.appendChild(linkElement);
                        linkElement.click();
                        document.body.removeChild(linkElement);
                      } catch (error) {
                        console.error("导出数据失败:", error);
                        alert("导出数据时发生错误。");
                      }
                    }}
                    className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow text-sm"
                  >
                   <Download size={16} className="mr-1" /> 导出所有数据 (.json)
                  </button>
                  <p className="text-xs text-yellow-700 mt-1">
                    将所有记录、设置和自定义饮品导出为 JSON 文件备份。
                  </p>
                </div>

                {/* Import Data */}
                <div>
                  <h3 className="font-medium mb-1 text-sm">导入数据:</h3>
                  <label className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow text-sm">
                    <Upload size={16} className="mr-1" /> 选择文件导入数据
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target.result);
                            // Enhanced validation
                            if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && data.userSettings !== null && Array.isArray(data.customDrinks)) {
                               // Further validate record/drink structure if needed
                               if (window.confirm('导入数据将覆盖当前所有记录和设置。确定要继续吗？')) {
                                const mergedSettings = { ...defaultSettings, ...data.userSettings };
                                setRecords(data.records);
                                setUserSettings(mergedSettings);
                                setCustomDrinks(data.customDrinks);
                                alert('数据导入成功！');
                              }
                            } else {
                              alert('导入失败：数据格式不正确或缺少必要部分。');
                            }
                          } catch (error) {
                            alert(`导入失败：无法解析文件。错误: ${error.message}`);
                            console.error('导入错误:', error);
                          } finally {
                            e.target.value = null; // Reset file input
                          }
                        };
                        reader.onerror = () => {
                          alert('读取文件时出错。');
                          console.error('File reading error:', reader.error);
                          e.target.value = null;
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                  <p className="text-xs text-yellow-700 mt-1">
                    从之前导出的 JSON 文件恢复数据。注意：这将覆盖当前所有数据。
                  </p>
                </div>

                {/* Clear Data */}
                <div>
                  <h3 className="font-medium mb-1 text-sm">清除数据:</h3>
                  <button
                    onClick={() => {
                      if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) {
                        setRecords([]);
                        setUserSettings(defaultSettings);
                        setCustomDrinks([]);
                        setCurrentCaffeine(0);
                        setOptimalSleepTime('');
                        localStorage.removeItem('caffeineRecords');
                        localStorage.removeItem('caffeineSettings');
                        localStorage.removeItem('caffeineCustomDrinks');
                        alert('所有本地数据已清除！');
                      }
                    }}
                    className="w-full py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow text-sm"
                  >
                    <RotateCcw size={16} className="mr-1" /> 清除所有本地数据
                  </button>
                  <p className="text-xs text-red-500 mt-1">
                    警告：此操作将永久删除所有记录、设置和自定义饮品。
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Settings Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings size={20} className="mr-2" />
                个人设置
              </h2>
              <div className="space-y-4">
                {/* Weight Input */}
                <div>
                  <label htmlFor="userWeight" className="block mb-1 font-medium text-sm">体重 (kg):</label>
                  <input
                    id="userWeight" type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.weight}
                    onChange={(e) => setUserSettings({...userSettings, weight: e.target.value === '' ? '' : parseInt(e.target.value) })}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 20 || value > 300) {
                        setUserSettings({...userSettings, weight: defaultSettings.weight});
                      }
                    }}
                    min="20" max="300" placeholder={defaultSettings.weight.toString()}
                  />
                </div>
                {/* Gender Selection */}
                <div>
                  <label htmlFor="userGender" className="block mb-1 font-medium text-sm">性别:</label>
                  <select
                    id="userGender"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.gender}
                    onChange={(e) => setUserSettings({...userSettings, gender: e.target.value})}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                   <p className="text-xs text-yellow-700 mt-1">性别可能影响咖啡因代谢速率（仅供参考）。</p>
                </div>
                {/* Max Daily Caffeine Input */}
                <div>
                  <label htmlFor="maxDailyCaffeine" className="block mb-1 font-medium text-sm">每日最大咖啡因摄入量 (mg):</label>
                  <input
                    id="maxDailyCaffeine" type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.maxDailyCaffeine}
                    onChange={(e) => setUserSettings({...userSettings, maxDailyCaffeine: e.target.value === '' ? '' : parseInt(e.target.value) })}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 0 || value > 1000) {
                        setUserSettings({...userSettings, maxDailyCaffeine: defaultSettings.maxDailyCaffeine});
                      }
                    }}
                    min="0" max="1000" placeholder={defaultSettings.maxDailyCaffeine.toString()}
                  />
                   <div className="text-xs text-yellow-700 mt-1">推荐最大摄入量通常为 400mg/天。设为 0 将使用默认值 400 计算进度。</div>
                </div>
                {/* Safe Before Sleep Caffeine Input */}
                <div>
                  <label htmlFor="safeBeforeSleepCaffeine" className="block mb-1 font-medium text-sm">睡前安全咖啡因水平 (mg):</label>
                  <input
                    id="safeBeforeSleepCaffeine" type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.safeBeforeSleepCaffeine}
                     onChange={(e) => setUserSettings({...userSettings, safeBeforeSleepCaffeine: e.target.value === '' ? '' : parseInt(e.target.value) })}
                     onBlur={(e) => {
                       const value = parseInt(e.target.value);
                       if (isNaN(value) || value < 0 || value > 200) {
                         setUserSettings({...userSettings, safeBeforeSleepCaffeine: defaultSettings.safeBeforeSleepCaffeine});
                       }
                     }}
                    min="0" max="200" placeholder={defaultSettings.safeBeforeSleepCaffeine.toString()}
                  />
                   <p className="text-xs text-yellow-700 mt-1">当体内咖啡因低于此值时，对睡眠影响较小（估算）。设为 0 将禁用睡眠时间建议。</p>
                </div>
                 {/* Planned Sleep Time Input */}
                <div>
                  <label htmlFor="plannedSleepTime" className="block mb-1 font-medium text-sm">计划睡眠时间:</label>
                  <input
                    id="plannedSleepTime" type="time"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.plannedSleepTime}
                    onChange={(e) => setUserSettings({...userSettings, plannedSleepTime: e.target.value || defaultSettings.plannedSleepTime})}
                  />
                   <p className="text-xs text-yellow-700 mt-1">用于提供更个性化的睡眠建议。</p>
                </div>
                 {/* Default Cup Size Input */}
                <div>
                  <label htmlFor="defaultCupSize" className="block mb-1 font-medium text-sm">默认杯量 (ml):</label>
                  <input
                    id="defaultCupSize" type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    value={userSettings.defaultCupSize}
                    onChange={(e) => setUserSettings({...userSettings, defaultCupSize: e.target.value === '' ? '' : parseInt(e.target.value) })}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < 10 || value > 1000) {
                        setUserSettings({...userSettings, defaultCupSize: defaultSettings.defaultCupSize});
                      }
                    }}
                    min="10" max="1000" placeholder={defaultSettings.defaultCupSize.toString()}
                  />
                   <p className="text-xs text-yellow-700 mt-1">添加记录时，将预先填入此容量。</p>
                </div>
                 {/* Caffeine Half-Life Input (Optional Advanced Setting) */}
                 {/*
                 <div>
                   <label htmlFor="caffeineHalfLife" className="block mb-1 font-medium text-sm">咖啡因半衰期 (小时):</label>
                   <input
                     id="caffeineHalfLife" type="number"
                     className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                     value={userSettings.caffeineHalfLifeHours}
                     onChange={(e) => setUserSettings({...userSettings, caffeineHalfLifeHours: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                     onBlur={(e) => {
                       const value = parseFloat(e.target.value);
                       if (isNaN(value) || value < 1 || value > 24) { // Reasonable range 1-24h
                         setUserSettings({...userSettings, caffeineHalfLifeHours: defaultSettings.caffeineHalfLifeHours});
                       }
                     }}
                     min="1" max="24" step="0.5" placeholder={defaultSettings.caffeineHalfLifeHours.toString()}
                   />
                    <p className="text-xs text-yellow-700 mt-1">影响体内咖啡因代谢速度估算，平均为 5 小时，个体差异大。</p>
                 </div>
                 */}
              </div>
            </div>

            {/* Custom Drink Management Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Coffee size={20} className="mr-2" />
                饮品管理
              </h2>
              {showDrinkEditor ? (
                <div>
                  <h3 className="font-medium mb-3 text-base">
                    {editingDrink ? '编辑自定义饮品' : '添加新饮品'}
                  </h3>
                  <div className="mb-3">
                    <label htmlFor="newDrinkName" className="block mb-1 text-sm font-medium">饮品名称:</label>
                    <input
                      id="newDrinkName" type="text"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                      value={newDrinkName} onChange={(e) => setNewDrinkName(e.target.value)}
                      placeholder="例如：星巴克冰美式 (大杯)"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="newDrinkCaffeine" className="block mb-1 text-sm font-medium">咖啡因含量 (mg/100ml):</label>
                    <input
                      id="newDrinkCaffeine" type="number"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                      value={newDrinkCaffeine} onChange={(e) => setNewDrinkCaffeine(e.target.value)}
                      placeholder="每100ml的咖啡因毫克数" min="0" step="1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddOrUpdateCustomDrink}
                      className="flex-1 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow"
                    >
                      <Save size={16} className="mr-1" /> {editingDrink ? '保存修改' : '添加饮品'}
                    </button>
                    <button
                      onClick={resetCustomDrinkForm}
                      className="py-2 px-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm"
                    >
                       <X size={16} className="mr-1" /> 取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowDrinkEditor(true)}
                    className="w-full py-2 mb-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center justify-center text-sm shadow"
                  >
                    <Plus size={16} className="mr-1" /> 添加自定义饮品
                  </button>
                  <div className="divide-y divide-amber-100">
                    {/* Preset Drinks List */}
                    <h3 className="font-medium mb-2 text-base pt-2">预设饮品:</h3>
                    <ul className="pt-2 space-y-1 max-h-40 overflow-y-auto text-sm">
                      {Object.entries(caffeinePresets).map(([name, content]) => (
                        <li key={name} className="flex justify-between items-center py-1">
                          <span className="truncate pr-2">{name}</span>
                          <span className="text-yellow-700 flex-shrink-0">{content} mg/100ml</span>
                        </li>
                      ))}
                    </ul>
                    {/* Custom Drinks List */}
                    {customDrinks.length > 0 && (
                      <>
                        <h3 className="font-medium mb-2 text-base pt-4">自定义饮品:</h3>
                        <ul className="pt-2 space-y-1 max-h-40 overflow-y-auto text-sm">
                          {customDrinks.map(drink => (
                            <li key={drink.id} className="flex justify-between items-center py-1">
                              <span className="truncate pr-2">{drink.name}</span>
                              <div className="flex items-center flex-shrink-0">
                                <span className="text-yellow-700 mr-2">{drink.caffeineContent} mg/100ml</span>
                                <button onClick={() => editCustomDrink(drink)} className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100" aria-label="Edit custom drink">
                                  <Edit size={14} />
                                </button>
                                <button onClick={() => deleteCustomDrink(drink.id)} className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100" aria-label="Delete custom drink">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Caffeine Knowledge Card (Updated) */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100">
               <h2 className="text-xl font-semibold mb-4 flex items-center">
                 <Info size={20} className="mr-2" /> 咖啡因知识库
               </h2>
               <ul className="space-y-2 text-sm text-yellow-800 list-disc list-inside">
                 <li><strong>推荐摄入量:</strong> 健康成年人每日咖啡因摄入量建议不超过 <strong>400mg</strong>。孕妇或哺乳期妇女、青少年以及某些健康状况人群的推荐量通常更低。</li>
                 <li><strong>半衰期:</strong> 咖啡因在成人体内的平均半衰期约为 <strong>3-7 小时</strong>，但受遗传 (如CYP1A2基因型)、年龄、肝功能、是否吸烟、是否服用某些药物 (如口服避孕药) 等因素影响，个体差异可达 <strong>1.5 至 9.5 小时</strong>。</li>
                 <li><strong>作用时间:</strong> 咖啡因在摄入后约 <strong>15-45 分钟</strong> 开始显现效果，血浆浓度峰值通常在 <strong>30-120 分钟</strong> 达到。</li>
                 <li><strong>对睡眠的影响:</strong> 由于半衰期较长，下午或晚上摄入咖啡因可能显著干扰夜间睡眠结构和质量。一般建议在计划睡眠时间前至少 <strong>6 小时</strong> 避免摄入。</li>
                 <li><strong>益处与风险:</strong> 适量咖啡因可提高警觉性、专注力、反应速度和运动表现。然而，过量摄入或个体敏感可能导致焦虑、紧张、心悸、失眠、胃肠不适、头痛等副作用。</li>
                 <li><strong>耐受性与依赖:</strong> 长期规律摄入会导致身体产生耐受性，需要更高剂量才能达到相同效果。突然停止摄入可能引发戒断症状，如头痛、疲劳、注意力不集中、易怒等。</li>
                 <li><strong>来源:</strong> 咖啡因天然存在于咖啡豆、茶叶、可可豆中，并被添加到可乐、能量饮料、某些药物（如止痛药）中。不同来源和制备方法的咖啡因含量差异很大。</li>
               </ul>
             </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-yellow-700">
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议仅供参考，不能替代专业医疗意见。</p>
           <p>&copy; {new Date().getFullYear()} Caffeine Tracker App</p>
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;
