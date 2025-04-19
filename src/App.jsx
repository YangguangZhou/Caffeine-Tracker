import React, { useState, useEffect } from 'react';
import { Coffee, Clock, Edit, Trash2, Plus, X, Info, Activity, Settings, BarChart2, Calendar, ChevronLeft, ChevronRight, AlertCircle, Save, Award, Heart, PieChart, Sliders, Thermometer } from 'lucide-react';

// Define default settings outside the component for reuse
const defaultSettings = {
  weight: 60, // 默认体重（kg）
  gender: 'male', // 默认性别
  maxDailyCaffeine: 400, // 默认每日最大咖啡因摄入量（mg）
  safeBeforeSleepCaffeine: 50, // 默认睡前安全咖啡因水平（mg）
  plannedSleepTime: '22:00', // 默认计划睡眠时间
  defaultCupSize: 250, // 默认杯子容量（ml）
};

const CaffeineTracker = () => {
  // 用户设置状态
  const [userSettings, setUserSettings] = useState(defaultSettings);

  // 摄入记录状态
  const [records, setRecords] = useState([]);
  const [currentCaffeine, setCurrentCaffeine] = useState(0);
  const [optimalSleepTime, setOptimalSleepTime] = useState('');

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  // const [showSettings, setShowSettings] = useState(false); // Note: Not used directly for viewMode control
  const [editingId, setEditingId] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState('');
  const [drinkVolume, setDrinkVolume] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // 使用本地时区格式化时间
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
        return now.toISOString().slice(0,16);
    }
  };

  const [intakeTime, setIntakeTime] = useState(formatDatetimeLocal(new Date()));

  // 自定义数据状态
  const [customDrinks, setCustomDrinks] = useState([]);
  const [showDrinkEditor, setShowDrinkEditor] = useState(false);
  const [editingDrink, setEditingDrink] = useState(null);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');

  // 统计和视图状态
  const [viewMode, setViewMode] = useState('current'); // 'current', 'stats', 'settings'
  const [statsView, setStatsView] = useState('day'); // 'day', 'week', 'month'
  const [statsDate, setStatsDate] = useState(new Date());

  // 常见饮品的咖啡因含量 (mg/100ml)
  const [caffeinePresets, setCaffeinePresets] = useState({
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
    '黑巧克力(100g)': 43 // Note: This unit might be inconsistent (mg/100g vs mg/100ml) -> Consider standardizing or clarifying in UI
  });

  // 初始化 - 从本地存储加载数据
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
          loadedSettings = {...defaultSettings, ...parsedSettings}; // Merge with defaults
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


  // 保存数据到本地存储 (with error handling)
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

  // 计算当前体内咖啡因含量（考虑代谢）
  useEffect(() => {
    const calculateCaffeine = () => {
      let total = 0;
      const now = Date.now();
      const halfLifeHours = 5; // Caffeine half-life in hours

      records.forEach(record => {
        // Basic check for valid record structure
        if (!record || typeof record.timestamp !== 'number' || typeof record.amount !== 'number') {
            console.warn('Skipping invalid record in calculation:', record);
            return;
        }
        // Calculate hours elapsed since intake
        const hoursElapsed = (now - record.timestamp) / (1000 * 60 * 60);

        // Apply caffeine half-life formula: Amount * (0.5 ^ (hoursElapsed / halfLife))
        // Ensure remaining amount is non-negative
        const remaining = Math.max(0, record.amount * Math.pow(0.5, hoursElapsed / halfLifeHours));

        // Only add if remaining caffeine is significant (e.g., > 0.1 mg)
        if (remaining > 0.1) {
            total += remaining;
        }
      });

      setCurrentCaffeine(Math.round(total));

      // Calculate optimal sleep time based on when caffeine drops below safe level
      const safeLevel = userSettings.safeBeforeSleepCaffeine;
      if (total > safeLevel && safeLevel > 0) { // Ensure safeLevel is positive to avoid log2(<=0)
        // Calculate hours needed for caffeine to decay to safe level
        const hoursToSleep = halfLifeHours * Math.log2(total / safeLevel);
        // Ensure hoursToSleep is a valid number
        if (isFinite(hoursToSleep)) {
            const sleepTime = new Date(now + hoursToSleep * 60 * 60 * 1000);
            setOptimalSleepTime(sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
             setOptimalSleepTime('计算中...'); // Indicate calculation issue
        }

      } else {
        setOptimalSleepTime('现在'); // 'Now' if caffeine is already below safe level or safeLevel is 0
      }
    };

    calculateCaffeine(); // Initial calculation

    // Update every minute
    const timer = setInterval(calculateCaffeine, 60000);
    return () => clearInterval(timer); // Cleanup timer on component unmount
  }, [records, userSettings.safeBeforeSleepCaffeine]); // Recalculate when records or safe level changes

  // 添加新的咖啡因摄入记录
  const addRecord = () => {
    let caffeineAmount = 0;
    let name = '';
    let volume = null;

    if (selectedDrink && drinkVolume) {
      // Calculate based on selected drink and volume
      const caffeineContent = getSelectedDrinkCaffeineContent();
      const parsedVolume = parseFloat(drinkVolume);
      if (!isNaN(parsedVolume) && parsedVolume > 0 && caffeineContent >= 0) { // Allow 0 content
        caffeineAmount = Math.round((caffeineContent * parsedVolume) / 100);
        name = selectedDrink;
        volume = parsedVolume;
      } else {
         alert("请输入有效的容量 (必须大于 0)。"); // Provide user feedback
         return;
      }
    } else if (customAmount) {
      // Use custom entered amount
      const parsedAmount = parseFloat(customAmount);
       if (!isNaN(parsedAmount) && parsedAmount > 0) {
         caffeineAmount = parsedAmount;
         name = '自定义'; // 'Custom'
       } else {
         alert("请输入有效的自定义咖啡因摄入量 (必须大于 0)。"); // Provide user feedback
         return;
       }
    } else {
       alert("请选择饮品并输入容量，或直接输入自定义摄入量。"); // Provide user feedback
      return; // No valid data entered
    }

    // Although we check > 0 above, double check caffeineAmount before proceeding
    // Allow recording 0mg entries if needed? For now, enforce > 0
    if (caffeineAmount <= 0) {
        alert("计算出的咖啡因摄入量必须大于 0。如果您想记录无咖啡因饮品，请使用自定义摄入量并输入一个非常小的值（例如 1mg）。");
        return;
    }


    // Parse the input time string
    let timestamp;
    try {
        timestamp = new Date(intakeTime).getTime();
        if (isNaN(timestamp)) {
            throw new Error("Invalid date format");
        }
    } catch (e) {
        alert("请输入有效的摄入时间。");
        console.error("Invalid date/time value:", intakeTime);
        return; // Invalid date/time
    }


    const newRecord = {
      id: editingId || Date.now(), // Use existing ID if editing, otherwise generate new one
      name,
      amount: caffeineAmount,
      volume: volume,
      timestamp
    };

    if (editingId) {
      // Update existing record
      setRecords(records.map(record =>
        record.id === editingId ? newRecord : record
      ));
      setEditingId(null); // Clear editing state
    } else {
      // Add new record
      setRecords(prevRecords => [...prevRecords, newRecord]);
    }

    // Reset form fields
    resetForm();
  };

  // 获取选中饮品的咖啡因含量 (mg/100ml)
  const getSelectedDrinkCaffeineContent = () => {
    // Check preset drinks
    if (caffeinePresets[selectedDrink]) {
      return caffeinePresets[selectedDrink];
    }

    // Check custom drinks
    const customDrink = customDrinks.find(drink => drink.name === selectedDrink);
    if (customDrink) {
      return customDrink.caffeineContent;
    }

    console.warn(`Caffeine content not found for drink: ${selectedDrink}`);
    return 0; // Return 0 if drink not found
  };

  // 删除记录
  const deleteRecord = (id) => {
    // Optional: Add confirmation dialog
     if (window.confirm('确定要删除这条记录吗？')) {
       setRecords(records.filter(record => record.id !== id));
     }
  };

  // 开始编辑记录
  const editRecord = (record) => {
    setEditingId(record.id);
    setSelectedDrink(record.name !== '自定义' ? record.name : '');
    setDrinkVolume(record.volume ? record.volume.toString() : '');
    setCustomAmount(record.name === '自定义' ? record.amount.toString() : '');

    // Set time using local timezone format
    try {
        const recordDate = new Date(record.timestamp);
        setIntakeTime(formatDatetimeLocal(recordDate));
    } catch (e) {
        console.error("Error formatting record date for editing:", record.timestamp, e);
        // Fallback to current time if formatting fails
        setIntakeTime(formatDatetimeLocal(new Date()));
    }


    setShowForm(true); // Open the form for editing
  };

  // 重置表单
  const resetForm = () => {
    setSelectedDrink('');
    setDrinkVolume(userSettings.defaultCupSize.toString()); // Reset to default cup size
    setCustomAmount('');
    setEditingId(null); // Clear editing state
    setShowForm(false); // Close the form

    // Reset time to current time (using local timezone)
    setIntakeTime(formatDatetimeLocal(new Date()));
  };

  // 添加/编辑自定义饮品
  const addCustomDrink = () => {
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
      id: editingDrink?.id || Date.now(), // Use existing ID if editing
      name: name,
      caffeineContent: caffeine
    };

    if (editingDrink) {
      // Update existing custom drink
      setCustomDrinks(customDrinks.map(drink =>
        drink.id === editingDrink.id ? newDrink : drink
      ));
      setEditingDrink(null); // Clear editing state
    } else {
      // Add new custom drink
      setCustomDrinks(prevDrinks => [...prevDrinks, newDrink]);
    }

    // Reset custom drink form
    setNewDrinkName('');
    setNewDrinkCaffeine('');
    setShowDrinkEditor(false); // Close editor
  };

  // 删除自定义饮品
  const deleteCustomDrink = (id) => {
     // Optional: Add confirmation dialog
      if (window.confirm('确定要删除这个自定义饮品吗？')) {
        setCustomDrinks(customDrinks.filter(drink => drink.id !== id));
      }
  };

  // 开始编辑自定义饮品
  const editCustomDrink = (drink) => {
    setEditingDrink(drink);
    setNewDrinkName(drink.name);
    setNewDrinkCaffeine(drink.caffeineContent.toString());
    setShowDrinkEditor(true); // Open editor
  };

  // 格式化时间戳为可读时间 (HH:MM)
  const formatTime = (timestamp) => {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
        console.error("Error formatting time:", timestamp, e);
        return "无效时间";
    }
  };

  // 格式化日期为可读格式 (Locale default)
  const formatDate = (timestamp) => {
     try {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
     } catch (e) {
         console.error("Error formatting date:", timestamp, e);
         return "无效日期";
     }
  };

  // --- Time Calculation Helpers ---

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

  // --- Data Aggregation Helpers ---

  // Get total caffeine intake for today
  const getTodayTotal = () => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());

    return records
      .filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd) // Added check for record validity
      .reduce((sum, record) => sum + record.amount, 0);
  };

  // Get total caffeine intake for a specific date
  const getDayTotal = (date) => {
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);

    return records
      .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  };

  // Get total caffeine intake for the week containing a specific date
  const getWeekTotal = (date) => {
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);

    return records
      .filter(record => record && record.timestamp >= weekStart && record.timestamp <= weekEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  };

  // Get total caffeine intake for the month containing a specific date
  const getMonthTotal = (date) => {
    const monthStart = getStartOfMonth(date);
    const monthEnd = getEndOfMonth(date);

    return records
      .filter(record => record && record.timestamp >= monthStart && record.timestamp <= monthEnd)
      .reduce((sum, record) => sum + record.amount, 0);
  };

  // Get daily caffeine totals for the week containing statsDate
  const getWeekDailyTotals = () => {
    const weekStart = getStartOfWeek(statsDate);
    const totals = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(currentDay.getDate() + i);
      const dayStart = getStartOfDay(currentDay);
      const dayEnd = getEndOfDay(currentDay);

      const dayTotal = records
        .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
        .reduce((sum, record) => sum + record.amount, 0);

      totals.push({
        day: currentDay.toLocaleDateString([], { weekday: 'short' }), // Short day name (e.g., 'Mon')
        date: currentDay, // Keep the full date object
        total: dayTotal
      });
    }

    return totals;
  };

  // Get daily caffeine totals for the month containing statsDate
  const getMonthDailyTotals = () => {
    const monthStart = getStartOfMonth(statsDate);
    const monthEnd = getEndOfMonth(statsDate);
    const totals = [];
    const endDate = new Date(monthEnd); // Use date object for comparison

    // Ensure the loop doesn't run excessively if dates are invalid
     if (isNaN(monthStart) || isNaN(monthEnd) || monthEnd < monthStart) {
        console.error("Invalid date range for getMonthDailyTotals");
        return [];
    }

    let currentDay = new Date(monthStart);
    while (currentDay <= endDate) {
        const dayStart = getStartOfDay(currentDay);
        const dayEnd = getEndOfDay(currentDay);

        const dayTotal = records
            .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
            .reduce((sum, record) => sum + record.amount, 0);

        totals.push({
            day: currentDay.getDate(), // Day number (1-31)
            date: new Date(currentDay), // Keep the full date object
            total: dayTotal
        });

        // Move to the next day
        currentDay.setDate(currentDay.getDate() + 1);
    }


    return totals;
  };

   // Get weekly caffeine totals for the month containing statsDate
  const getMonthWeeklyTotals = () => {
    const monthStartTimestamp = getStartOfMonth(statsDate);
    const monthEndTimestamp = getEndOfMonth(statsDate);
    const weeklyTotals = [];
    let currentWeekStartTimestamp = getStartOfWeek(new Date(monthStartTimestamp));

    // Iterate through weeks that overlap with the month
    while (currentWeekStartTimestamp <= monthEndTimestamp) {
      const currentWeekEndTimestamp = getEndOfWeek(new Date(currentWeekStartTimestamp));

      // Filter records within the current week AND within the current month
      const weekTotal = records
        .filter(record =>
          record && // Check record validity
          record.timestamp >= currentWeekStartTimestamp &&
          record.timestamp <= currentWeekEndTimestamp &&
          record.timestamp >= monthStartTimestamp && // Ensure record is within the month
          record.timestamp <= monthEndTimestamp
         )
        .reduce((sum, record) => sum + record.amount, 0);

      // Only add the week if it has overlap with the month and starts within or before it
      if (currentWeekEndTimestamp >= monthStartTimestamp && currentWeekStartTimestamp <= monthEndTimestamp) {
          const weekStartDate = new Date(currentWeekStartTimestamp);
          const weekEndDate = new Date(currentWeekEndTimestamp);

          // Format week label (e.g., "4/15") - Use start date
          const weekLabel = weekStartDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' });

          weeklyTotals.push({
            weekLabel: weekLabel, // Simplified label
            weekStart: weekStartDate,
            weekEnd: weekEndDate,
            total: weekTotal
          });
      }


      // Move to the start of the next week
      const nextWeekDate = new Date(currentWeekStartTimestamp);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      currentWeekStartTimestamp = nextWeekDate.getTime();
    }

    return weeklyTotals;
  };


  // --- Status and Advice Helpers ---

  // Get user status based on current caffeine level
  const getUserStatus = () => {
    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400; // Use default if max is 0
    if (currentCaffeine < maxDaily * 0.1) { // Less than 10% of max
      return {
        status: '咖啡因含量极低',
        recommendation: '可以安全地摄入咖啡因。',
        color: 'text-green-600'
      };
    } else if (currentCaffeine < maxDaily * 0.5) { // Less than 50%
      return {
        status: '咖啡因含量低',
        recommendation: '如有需要，可以适量摄入更多。',
        color: 'text-green-500'
      };
    } else if (currentCaffeine < maxDaily) { // Less than 100%
      return {
        status: '咖啡因含量中等',
        recommendation: '请注意避免过量摄入。',
        color: 'text-yellow-500'
      };
    } else { // At or above max
      return {
        status: '咖啡因含量高',
        recommendation: '建议暂时避免摄入更多咖啡因。',
        color: 'text-red-500'
      };
    }
  };

  // Get health advice based on recent intake patterns
  const getHealthAdvice = () => {
    const dailyTotal = getTodayTotal();
    const weekData = getWeekDailyTotals(); // Use current date for week calculation
    const weekTotal = weekData.reduce((sum, day) => sum + day.total, 0);
    const weeklyAvg = weekTotal > 0 ? weekTotal / 7 : 0; // Avoid division by zero

    const maxDaily = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;

    if (dailyTotal > maxDaily) {
      return {
        advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过推荐上限 (${maxDaily}mg)，建议减少摄入。`,
        color: 'text-red-500'
      };
    } else if (weeklyAvg > maxDaily * 0.9) {
      return {
        advice: `您本周的日均咖啡因摄入量 (${Math.round(weeklyAvg)}mg) 较高，建议适当减少以避免产生耐受性。`,
        color: 'text-yellow-500'
      };
    } else if (currentCaffeine > 100 && new Date().getHours() >= 16) { // After 4 PM
      return {
        advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。',
        color: 'text-yellow-500'
      };
    } else {
      return {
        advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。',
        color: 'text-green-500'
      };
    }
  };

  // Get caffeine distribution by source (drink name)
  const getCaffeineDistribution = () => {
    const sourceData = {};
    let totalIntake = 0;

    records.forEach(record => {
      // Ensure record and name are valid before processing
      if (!record || typeof record.name !== 'string' || typeof record.amount !== 'number') return;
      const name = record.name || '未知来源'; // Handle potential undefined names
      if (!sourceData[name]) {
        sourceData[name] = 0;
      }
      sourceData[name] += record.amount;
      totalIntake += record.amount;
    });

    if (totalIntake === 0) return []; // Avoid division by zero

    return Object.entries(sourceData).map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      percentage: Math.round((amount / totalIntake) * 100)
    })).sort((a, b) => b.amount - a.amount); // Sort descending by amount
  };

  // --- Navigation and Formatting Helpers ---

  // Navigate stats view forward or backward in time
  const navigateStats = (direction) => {
    const newDate = new Date(statsDate);

    if (statsView === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (statsView === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else if (statsView === 'month') {
      // Ensure navigation goes to the *previous* or *next* month correctly
      newDate.setMonth(newDate.getMonth() + direction, 1); // Set day to 1 to avoid month skipping issues
    }

    // Prevent navigating to future dates beyond today
     const today = new Date();
     today.setHours(23, 59, 59, 999); // Allow navigating up to the end of today
     if (newDate > today && direction > 0) {
       // Optionally, set to today instead of doing nothing
       // setStatsDate(new Date());
       return; // Don't navigate into the future
     }


    setStatsDate(newDate);
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

  // Format the time period label for the stats view
  const formatStatsPeriod = () => {
    try {
        if (statsView === 'day') {
        return isToday(statsDate) ? '今天' : statsDate.toLocaleDateString();
        } else if (statsView === 'week') {
        const weekStart = new Date(getStartOfWeek(statsDate));
        const weekEnd = new Date(getEndOfWeek(statsDate));
        // Format as MM/DD - MM/DD
        const startStr = weekStart.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        return `${startStr} - ${endStr}`;
        } else if (statsView === 'month') {
        return statsDate.toLocaleDateString([], { year: 'numeric', month: 'long' });
        }
    } catch (e) {
        console.error("Error formatting stats period:", e);
        return "日期错误";
    }
  };

  // --- Render Variables ---
  const status = getUserStatus();
  const healthAdvice = getHealthAdvice();
  const dailyTotal = getTodayTotal();
  // Calculate percentage for progress bar, ensuring it doesn't exceed 100% and handles max 0
  const maxDailyCaffeineForProgress = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
  const percentFilled = Math.min(Math.max(0, (currentCaffeine / maxDailyCaffeineForProgress) * 100), 100);

  // --- Chart Rendering Logic ---
  const renderChart = () => {
    let chartData = [];
    let maxValue = 1;
    let hasData = false;
    let errorInData = false;
    let title = '';

    try {
        if (statsView === 'day') {
            title = '每小时摄入量 (mg)';
            const dayStart = getStartOfDay(statsDate);
            const dayEnd = getEndOfDay(statsDate);
            const dayRecords = records.filter(
                record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd
            );

            const hourlyData = Array(24).fill(0);
            dayRecords.forEach(record => {
                const hour = new Date(record.timestamp).getHours();
                if (hour >= 0 && hour < 24) {
                    hourlyData[hour] += record.amount;
                }
            });

            // Display hours 6 AM to 10 PM (indices 6 to 22)
            chartData = hourlyData.slice(6, 23).map((amount, index) => ({
                label: `${index + 6}:00`,
                value: amount,
                displayLabel: (index % 2 === 0) // Show label every 2 hours
            }));
            maxValue = Math.max(...hourlyData.slice(6, 23), 1); // Max value only within the displayed range
            hasData = chartData.some(d => d.value > 0); // Check if displayed range has data

        } else if (statsView === 'week') {
            title = '每日摄入量 (mg)';
            const dailyTotals = getWeekDailyTotals();
            chartData = dailyTotals.map(dayData => ({
                label: dayData.day,
                value: dayData.total,
                displayLabel: true
            }));
            maxValue = Math.max(...dailyTotals.map(d => d.total), 1);
            hasData = dailyTotals.some(d => d.total > 0);

        } else if (statsView === 'month') {
            title = '每日摄入量 (mg)'; // Changed title
            const dailyTotals = getMonthDailyTotals(); // Use daily totals
            chartData = dailyTotals.map(dayData => ({
                label: dayData.day.toString(), // Use day number as label
                value: dayData.total,
                // Display label for every 5th day for clarity, or if value > 0? Let's try every 5th.
                displayLabel: (dayData.day % 5 === 0 || dayData.day === 1)
            }));
            maxValue = Math.max(...dailyTotals.map(d => d.total), 1);
            hasData = dailyTotals.some(d => d.total > 0);
        }
    } catch (error) {
        console.error("Error preparing chart data:", error);
        errorInData = true;
    }

    // --- Render Chart or Messages ---
    if (errorInData) {
        return (
            <div key="chart-error" className="flex items-center justify-center h-48 text-red-600 text-sm">
                图表数据加载失败
            </div>
        );
    }

    if (!hasData) {
        return (
            <div key="chart-no-data" className="flex items-center justify-center h-48 text-yellow-700 text-sm">
                {statsView === 'day' ? '该日期没有数据' : statsView === 'week' ? '本周没有数据' : '本月没有数据'}
            </div>
        );
    }

    // --- Render Actual Chart Bars ---
    return (
        <>
            <h3 className="text-center text-sm font-medium text-yellow-800 mb-3">{title}</h3>
            {/* Chart Container - Establishes height and baseline */}
            <div className="w-full h-48 flex items-end justify-around px-1"> {/* Reduced px */}
                {chartData.map((data, i) => {
                    const safeMaxValue = (!isNaN(maxValue) && maxValue > 0) ? maxValue : 1;
                    const heightPercentage = data.value === 0
                        ? 0
                        : Math.max(1, Math.min(100, (data.value / safeMaxValue) * 100)); // Min height 1%

                    let barColor = 'bg-amber-500';
                    const dailyMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
                    if ((statsView === 'day' || statsView === 'week' || statsView === 'month') && data.value > dailyMax * 0.75) barColor = 'bg-yellow-500';
                    if ((statsView === 'day' || statsView === 'week' || statsView === 'month') && data.value > dailyMax) barColor = 'bg-red-500';

                    // Label rotation class for month view
                    const labelRotationClass = statsView === 'month' ? 'transform -rotate-45 origin-right translate-x-1 translate-y-1' : '';
                    const labelPositionClass = statsView === 'month' ? '-bottom-8' : '-bottom-6'; // Adjust position for rotated labels

                    return (
                        // Bar Wrapper
                        <div key={i} className="relative flex-1 h-full mx-px text-center">
                            {/* Value Label (Top) */}
                            {data.value > 0 && (
                                <div className="text-xs text-yellow-700 absolute -top-5 left-0 right-0 z-10">
                                    {Math.round(data.value)}
                                </div>
                            )}

                            {/* Bar Element */}
                            {heightPercentage > 0 && (
                                <div
                                    className={`absolute bottom-0 left-[15%] right-[15%] mx-auto ${barColor} rounded-t-sm transition-all duration-300 ease-out origin-bottom`} // Width 70%
                                    style={{ height: `${heightPercentage}%` }}
                                    title={`${data.label}: ${Math.round(data.value)} mg`}
                                ></div>
                            )}

                            {/* X-axis Label (Bottom) */}
                            {data.displayLabel && (
                                <div className={`text-[10px] md:text-xs text-yellow-700 absolute ${labelPositionClass} left-0 right-0 w-full whitespace-nowrap ${labelRotationClass}`}>
                                    {data.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Spacer for X-axis labels - Increased for rotated labels */}
            <div className={`${statsView === 'month' ? 'h-12' : 'h-8'} w-full`}></div>
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
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 ${viewMode === 'current' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <Thermometer size={18} className="mr-1" />
            当前状态
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 ${viewMode === 'stats' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <BarChart2 size={18} className="mr-1" />
            数据统计
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 ${viewMode === 'settings' ? 'bg-amber-800 text-white' : 'text-yellow-700 hover:bg-amber-100'}`}
          >
            <Settings size={18} className="mr-1" />
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
                    stroke="url(#caffeine-gradient)"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeDasharray="314.16" // Circumference of semi-circle (pi * r)
                    strokeDashoffset={314.16 - (314.16 * percentFilled / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} // Add transition
                  />

                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="caffeine-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4ade80" /> {/* green-400 */}
                      <stop offset="50%" stopColor="#facc15" /> {/* yellow-400 */}
                      <stop offset="100%" stopColor="#f87171" /> {/* red-400 */}
                    </linearGradient>
                  </defs>

                  {/* Labels */}
                  <text x="20" y="155" fontSize="12" fill="#78716c" textAnchor="start">0</text>
                  <text x="120" y="155" fontSize="12" fill="#78716c" textAnchor="middle">{Math.round(maxDailyCaffeineForProgress / 2)}</text>
                  <text x="220" y="155" fontSize="12" fill="#78716c" textAnchor="end">{maxDailyCaffeineForProgress}+</text>

                  {/* Current Caffeine Amount Text */}
                  <text x="120" y="105" fontSize="28" fontWeight="bold" fill="#78716c" textAnchor="middle">{currentCaffeine} mg</text>
                  <text x="120" y="125" fontSize="12" fill="#a1a1aa" textAnchor="middle">当前体内含量</text>
                </svg>
              </div>

              {/* Status Text */}
              <div className="text-center mb-4 mt-2">
                <h3 className={`text-lg font-semibold ${status.color}`}>
                  {status.status}
                </h3>
                <p className="text-yellow-700 mt-1">{status.recommendation}</p>

                {/* Health Advice */}
                <div className={`mt-3 text-sm p-2 rounded-lg bg-opacity-80 ${healthAdvice.color.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100')} ${healthAdvice.color}`}>
                    <div className="flex items-center justify-center">
                        <AlertCircle size={16} className="inline-block mr-1 flex-shrink-0" />
                        <span>{healthAdvice.advice}</span>
                    </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex justify-between text-sm text-yellow-700 mt-4 pt-4 border-t border-amber-100">
                <div>今日总摄入: <span className="font-semibold">{dailyTotal} mg</span></div>
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
                    <label className="block mb-2 font-medium">选择饮品:</label>
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
                              onClick={() => setSelectedDrink(name)}
                            >
                              {name}
                            </button>
                          ))}

                          {/* Custom Drink Tags */}
                          {customDrinks.map(drink => (
                            <button
                              key={drink.id}
                              className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-full text-sm transition-colors duration-150"
                              onClick={() => setSelectedDrink(drink.name)}
                            >
                              {drink.name}
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    {!selectedDrink && (
                      <div className="text-sm text-yellow-600 mt-1">
                        或输入自定义数值 (mg)
                      </div>
                    )}
                  </div>

                  {/* Intake Time Input */}
                  <div className="mb-4">
                    <label htmlFor="intakeTime" className="block mb-2 font-medium">摄入时间:</label>
                    <input
                      id="intakeTime"
                      type="datetime-local"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={intakeTime}
                      onChange={(e) => setIntakeTime(e.target.value)}
                      max={formatDatetimeLocal(new Date())} // Prevent future dates
                    />
                  </div>

                  {/* Volume Input (Conditional) */}
                  {selectedDrink && (
                    <div className="mb-4">
                      <label htmlFor="drinkVolume" className="block mb-2 font-medium">容量 (ml):</label>
                      <input
                        id="drinkVolume"
                        type="number"
                        className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        value={drinkVolume}
                        onChange={(e) => setDrinkVolume(e.target.value)}
                        placeholder={`例如: ${userSettings.defaultCupSize}`}
                        min="1"
                      />
                      {selectedDrink && drinkVolume && !isNaN(parseFloat(drinkVolume)) && parseFloat(drinkVolume) > 0 && (
                        <div className="mt-2 text-sm text-yellow-700">
                          预计咖啡因摄入量: {Math.round((getSelectedDrinkCaffeineContent() * parseFloat(drinkVolume)) / 100)} mg
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Amount Input (Conditional) */}
                  {!selectedDrink && (
                    <div className="mb-4">
                      <label htmlFor="customAmount" className="block mb-2 font-medium">自定义摄入量 (mg):</label>
                      <input
                        id="customAmount"
                        type="number"
                        className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="输入咖啡因摄入量 (mg)"
                        min="1"
                      />
                    </div>
                  )}

                  {/* Form Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button
                      onClick={addRecord}
                      className="flex-1 py-2 px-4 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors duration-200 flex items-center justify-center shadow"
                    >
                      <Save size={18} className="mr-1" />
                      {editingId ? '保存修改' : '添加记录'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="py-2 px-4 border border-amber-800 text-amber-800 rounded-md hover:bg-amber-100 transition-colors duration-200 flex items-center justify-center"
                    >
                      <X size={18} className="mr-1" />
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
                <ul className="divide-y divide-amber-100 max-h-96 overflow-y-auto"> {/* Added max height and scroll */}
                  {[...records] // Create a copy before sorting
                    .sort((a, b) => b.timestamp - a.timestamp) // Sort descending by time
                    .map(record => (
                      <li key={record.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {record.name} - {record.amount} mg
                          </div>
                          <div className="text-sm text-yellow-700 flex items-center flex-wrap gap-x-3 gap-y-1 mt-1"> {/* Use gap for spacing */}
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" /> {formatDate(record.timestamp)}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" /> {formatTime(record.timestamp)}
                            </span>
                            {record.volume && (
                              <span className="flex items-center">
                                <Coffee size={14} className="mr-1" /> {record.volume} ml
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1 flex-shrink-0"> {/* Reduce spacing */}
                          <button
                            onClick={() => editRecord(record)}
                            className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100 transition-colors duration-150"
                            aria-label="Edit record"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150"
                             aria-label="Delete record"
                          >
                            <Trash2 size={18} />
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
                  disabled={isFuture(statsDate) && statsView !== 'month'} // Disable future navigation for day/week
                  aria-label="Next period"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => { setStatsView('day'); setStatsDate(new Date()); }} // Reset date when changing view
                  className={`px-4 py-1 rounded-md text-sm transition-colors duration-200 ${statsView === 'day' ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                >
                  日
                </button>
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
              </div>
            </div>

            {/* Intake Overview Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart2 size={20} className="mr-2" />
                摄入总览
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                  <div className="text-sm text-yellow-700">
                    {statsView === 'day' ? '当日总摄入' : statsView === 'week' ? '本周总摄入' : '本月总摄入'}
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-1">
                    {statsView === 'day'
                      ? getDayTotal(statsDate)
                      : statsView === 'week'
                        ? getWeekTotal(statsDate)
                        : getMonthTotal(statsDate)
                    } mg
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg text-center shadow-inner">
                   <div className="text-sm text-yellow-700">
                    {statsView === 'day' ? '日均 (本周)' : statsView === 'week' ? '日均 (本周)' : '日均 (本月)'}
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-1">
                    {(() => {
                        if (statsView === 'day' || statsView === 'week') {
                            const weekTotal = getWeekTotal(statsDate);
                            return weekTotal > 0 ? Math.round(weekTotal / 7) : 0;
                        } else { // month view
                            const monthTotal = getMonthTotal(statsDate);
                            const daysInMonth = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate();
                            return daysInMonth > 0 && monthTotal > 0 ? Math.round(monthTotal / daysInMonth) : 0;
                        }
                    })()} mg
                  </div>
                </div>
              </div>

              {/* Statistics Chart Area - Refactored */}
              <div className="bg-amber-50 p-4 rounded-lg mt-4 min-h-[250px]">
                 {/* Call the renderChart function */}
                 {renderChart()}
              </div>
              {/* --- END CHART RENDERING --- */}
            </div>

            {/* Intake Source Analysis Card */}
            <div className="mb-4 bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <PieChart size={20} className="mr-2" />
                摄入来源分析
              </h2>

              <div className="space-y-3">
                {getCaffeineDistribution().length > 0 ? (
                    getCaffeineDistribution().slice(0, 5).map((item, index) => ( // Show top 5 sources
                    <div key={index} className="flex items-center text-sm">
                        <div className="w-24 truncate pr-2" title={item.name}>{item.name}</div> {/* Truncate long names */}
                        <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                            <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${item.percentage}%`,
                                // Generate distinct colors, e.g., based on HSL
                                backgroundColor: `hsl(${43 + index * 30}, 70%, 60%)`
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
                健康分析
              </h2>

              <div className="space-y-4 text-sm text-yellow-800">
                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Award size={16} className="mr-1 text-amber-700" />
                    摄入模式
                  </h3>
                  <p>
                    {records.length > 0 ?
                      `根据您的记录，您的咖啡因主要来源是 ${getCaffeineDistribution()[0]?.name || "多种饮品"}。` :
                      "您还没有添加任何摄入记录。"
                    }
                    {records.length > 0 &&
                     ` 相比于健康推荐的每日最大摄入量 ${userSettings.maxDailyCaffeine}mg，您本周的日均摄入量为 ${Math.round(getWeekTotal(new Date()) / 7)}mg，处于${Math.round(getWeekTotal(new Date()) / 7) > userSettings.maxDailyCaffeine ? "较高" : "安全"}范围。`
                    }
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Clock size={16} className="mr-1 text-amber-700" />
                    摄入时间分布
                  </h3>
                  <p>
                    {/* Basic time analysis - could be more sophisticated */}
                    记录显示您通常在不同时间段摄入咖啡因。请注意，下午摄入的咖啡因（尤其是在下午2点后）可能会影响睡眠质量。
                    如果您存在睡眠问题，建议限制晚间咖啡因摄入。
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg text-green-800 shadow-inner">
                  <h3 className="font-semibold mb-1 flex items-center">
                    <Info size={16} className="mr-1 text-green-700" />
                    科学研究建议
                  </h3>
                  <p>
                    研究显示，健康成年人每日摄入咖啡因不超过 400mg 通常是安全的。
                    咖啡因的半衰期因人而异，通常在 3-7 小时之间。
                    适量饮用咖啡可能与某些健康益处相关，但过量摄入可能导致焦虑、失眠等问题。
                  </p>
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
                <Sliders size={20} className="mr-2" /> {/* Changed Icon */}
                数据管理
              </h2>

              <div className="space-y-4">
                {/* Export Data */}
                <div>
                  <h3 className="font-medium mb-2">导出数据:</h3>
                  <button
                    onClick={() => {
                      try {
                         // Prepare data for export
                        const exportData = {
                          records,
                          userSettings,
                          customDrinks,
                          exportTimestamp: new Date().toISOString(),
                          version: '1.1' // Add versioning
                        };

                        // Create JSON string and data URI
                        const dataStr = JSON.stringify(exportData, null, 2); // Pretty print JSON
                        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

                        // Create download link and trigger click
                        const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportFileDefaultName);
                        document.body.appendChild(linkElement); // Required for Firefox
                        linkElement.click();
                        document.body.removeChild(linkElement); // Clean up
                      } catch (error) {
                          console.error("导出数据失败:", error);
                          alert("导出数据时发生错误。");
                      }
                    }}
                    className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow"
                  >
                    导出所有数据 (.json)
                  </button>
                  <p className="text-xs text-yellow-700 mt-1">
                    将所有记录、设置和自定义饮品导出为 JSON 文件。
                  </p>
                </div>

                {/* Import Data */}
                <div>
                  <h3 className="font-medium mb-2">导入数据:</h3>
                  <label className="w-full py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow">
                    <input
                      type="file"
                      accept=".json" // Only accept JSON files
                      className="hidden" // Hide the default file input
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target.result);

                            // Basic validation of imported data structure
                            if (data && Array.isArray(data.records) && typeof data.userSettings === 'object' && Array.isArray(data.customDrinks)) {

                                // Confirmation before overwriting
                                if (window.confirm('导入数据将覆盖当前所有记录和设置。确定要继续吗？')) {
                                    // Merge imported settings with defaults to ensure all keys exist
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
                              // Reset file input to allow importing the same file again if needed
                              e.target.value = null;
                          }
                        };
                         reader.onerror = () => {
                            alert('读取文件时出错。');
                            console.error('File reading error:', reader.error);
                            e.target.value = null; // Reset input
                        };
                        reader.readAsText(file);
                      }}
                    />
                    选择文件导入数据
                  </label>
                  <p className="text-xs text-yellow-700 mt-1">
                    从 JSON 文件导入数据。注意：这将覆盖当前所有数据。
                  </p>
                </div>

                {/* Clear Data */}
                <div>
                  <h3 className="font-medium mb-2">清除数据:</h3>
                  <button
                    onClick={() => {
                      if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) {
                        // Clear state
                        setRecords([]);
                        setUserSettings(defaultSettings); // Reset to defaults
                        setCustomDrinks([]);
                        setCurrentCaffeine(0); // Reset current caffeine
                        setOptimalSleepTime('');

                        // Clear localStorage
                        localStorage.removeItem('caffeineRecords');
                        localStorage.removeItem('caffeineSettings');
                        localStorage.removeItem('caffeineCustomDrinks');

                        alert('所有本地数据已清除！');
                      }
                    }}
                    className="w-full py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow"
                  >
                    清除所有本地数据
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
                  <label htmlFor="userWeight" className="block mb-2 font-medium">体重 (kg):</label>
                  <input
                    id="userWeight"
                    type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.weight}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      // Allow empty input temporarily, but update state with valid number or default on blur
                      setUserSettings({...userSettings, weight: value });
                    }}
                     onBlur={(e) => {
                       const value = parseInt(e.target.value);
                       if (isNaN(value) || value < 20 || value > 300) {
                         // Reset to default if invalid or out of reasonable range
                         setUserSettings({...userSettings, weight: defaultSettings.weight});
                       } else {
                         setUserSettings({...userSettings, weight: value});
                       }
                     }}
                    min="20"
                    max="300" // Increased max range
                    placeholder={defaultSettings.weight.toString()}
                  />
                </div>

                {/* Gender Selection */}
                <div>
                  <label htmlFor="userGender" className="block mb-2 font-medium">性别:</label>
                  <select
                    id="userGender"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.gender}
                    onChange={(e) => setUserSettings({...userSettings, gender: e.target.value})}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                    <p className="text-xs text-yellow-700 mt-1">
                        性别可能影响咖啡因代谢速率（仅供参考）。
                    </p>
                </div>

                {/* Max Daily Caffeine Input */}
                <div>
                  <label htmlFor="maxDailyCaffeine" className="block mb-2 font-medium">每日最大咖啡因摄入量 (mg):</label>
                  <input
                    id="maxDailyCaffeine"
                    type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.maxDailyCaffeine}
                     onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setUserSettings({...userSettings, maxDailyCaffeine: value });
                    }}
                     onBlur={(e) => {
                       const value = parseInt(e.target.value);
                       if (isNaN(value) || value < 0 || value > 1000) { // Allow 0
                         setUserSettings({...userSettings, maxDailyCaffeine: defaultSettings.maxDailyCaffeine});
                       } else {
                         setUserSettings({...userSettings, maxDailyCaffeine: value});
                       }
                     }}
                    min="0" // Allow 0
                    max="1000" // Reasonable maximum
                    placeholder={defaultSettings.maxDailyCaffeine.toString()}
                  />
                  <div className="text-xs text-yellow-700 mt-1">
                    健康成年人的推荐最大摄入量通常为 400mg/天。设为 0 将使用默认值 400 进行进度计算。
                  </div>
                </div>

                {/* Safe Before Sleep Caffeine Input */}
                <div>
                  <label htmlFor="safeBeforeSleepCaffeine" className="block mb-2 font-medium">睡前安全咖啡因水平 (mg):</label>
                  <input
                    id="safeBeforeSleepCaffeine"
                    type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.safeBeforeSleepCaffeine}
                     onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setUserSettings({...userSettings, safeBeforeSleepCaffeine: value });
                    }}
                     onBlur={(e) => {
                       const value = parseInt(e.target.value);
                       if (isNaN(value) || value < 0 || value > 200) {
                         setUserSettings({...userSettings, safeBeforeSleepCaffeine: defaultSettings.safeBeforeSleepCaffeine});
                       } else {
                          setUserSettings({...userSettings, safeBeforeSleepCaffeine: value});
                       }
                     }}
                    min="0"
                    max="200"
                     placeholder={defaultSettings.safeBeforeSleepCaffeine.toString()}
                  />
                   <p className="text-xs text-yellow-700 mt-1">
                        当体内咖啡因低于此值时，对睡眠影响较小（估算值）。设为 0 将禁用睡眠时间建议。
                    </p>
                </div>

                {/* Planned Sleep Time Input */}
                <div>
                  <label htmlFor="plannedSleepTime" className="block mb-2 font-medium">计划睡眠时间:</label>
                  <input
                    id="plannedSleepTime"
                    type="time"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.plannedSleepTime}
                    onChange={(e) => setUserSettings({...userSettings, plannedSleepTime: e.target.value || defaultSettings.plannedSleepTime})}
                  />
                   <p className="text-xs text-yellow-700 mt-1">
                        用于提供更个性化的睡眠建议。
                    </p>
                </div>

                {/* Default Cup Size Input */}
                <div>
                  <label htmlFor="defaultCupSize" className="block mb-2 font-medium">默认杯量 (ml):</label>
                  <input
                    id="defaultCupSize"
                    type="number"
                    className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={userSettings.defaultCupSize}
                     onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setUserSettings({...userSettings, defaultCupSize: value });
                    }}
                     onBlur={(e) => {
                       const value = parseInt(e.target.value);
                       if (isNaN(value) || value < 10 || value > 1000) { // Min 10ml
                         setUserSettings({...userSettings, defaultCupSize: defaultSettings.defaultCupSize});
                       } else {
                         setUserSettings({...userSettings, defaultCupSize: value});
                       }
                     }}
                    min="10" // Min 10ml
                    max="1000"
                     placeholder={defaultSettings.defaultCupSize.toString()}
                  />
                   <p className="text-xs text-yellow-700 mt-1">
                        添加记录时，将预先填入此容量。
                    </p>
                </div>
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
                  <h3 className="font-medium mb-3">
                    {editingDrink ? '编辑自定义饮品' : '添加新饮品'}
                  </h3>

                  <div className="mb-3">
                    <label htmlFor="newDrinkName" className="block mb-1 text-sm font-medium">饮品名称:</label>
                    <input
                      id="newDrinkName"
                      type="text"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                      placeholder="例如：星巴克冰美式 (大杯)"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="newDrinkCaffeine" className="block mb-1 text-sm font-medium">咖啡因含量 (mg/100ml):</label>
                    <input
                      id="newDrinkCaffeine"
                      type="number"
                      className="w-full p-2 border border-amber-300 rounded-md bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={newDrinkCaffeine}
                      onChange={(e) => setNewDrinkCaffeine(e.target.value)}
                      placeholder="每100ml的咖啡因毫克数"
                      min="0"
                      step="1" // Allow integer steps
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={addCustomDrink}
                      className="flex-1 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow"
                    >
                      <Save size={16} className="mr-1" />
                      {editingDrink ? '保存修改' : '添加饮品'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDrinkEditor(false);
                        setEditingDrink(null);
                        setNewDrinkName('');
                        setNewDrinkCaffeine('');
                      }}
                      className="py-2 px-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm"
                    >
                       <X size={16} className="mr-1" />
                      取消
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
                    <ul className="pt-2 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(caffeinePresets).map(([name, content]) => (
                        <li key={name} className="flex justify-between items-center py-1 text-sm">
                          <span className="truncate pr-2">{name}</span>
                          <span className="text-yellow-700 flex-shrink-0">{content} mg/100ml</span>
                        </li>
                      ))}
                    </ul>

                    {/* Custom Drinks List */}
                    {customDrinks.length > 0 && (
                      <>
                        <h3 className="font-medium mb-2 text-base pt-4">自定义饮品:</h3>
                        <ul className="pt-2 space-y-1 max-h-40 overflow-y-auto">
                          {customDrinks.map(drink => (
                            <li key={drink.id} className="flex justify-between items-center py-1 text-sm">
                              <span className="truncate pr-2">{drink.name}</span>
                              <div className="flex items-center flex-shrink-0">
                                <span className="text-yellow-700 mr-2">{drink.caffeineContent} mg/100ml</span>
                                <button
                                  onClick={() => editCustomDrink(drink)}
                                  className="p-1 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100 transition-colors duration-150"
                                  aria-label="Edit custom drink"
                                >
                                  <Edit size={16} /> {/* Slightly larger icon */}
                                </button>
                                <button
                                  onClick={() => deleteCustomDrink(drink.id)}
                                  className="p-1 text-amber-700 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150"
                                   aria-label="Delete custom drink"
                                >
                                  <Trash2 size={16} />
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

            {/* Caffeine Knowledge Card */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Info size={20} className="mr-2" /> 咖啡因知识
              </h2>

              <ul className="space-y-2 text-sm text-yellow-800 list-disc list-inside"> {/* Use list for better readability */}
                <li>健康成年人每日咖啡因摄入量建议不超过 <strong>400mg</strong>。</li>
                <li>咖啡因在成人体内的平均半衰期约为 <strong>3-7 小时</strong>，个体差异较大。</li>
                <li>咖啡因在摄入后 <strong>15-45 分钟</strong> 开始发挥作用，峰值效应通常在 <strong>30-60 分钟</strong>。</li>
                <li>适量咖啡因可以提高警觉性、专注力和运动表现。</li>
                <li>下午或晚上摄入咖啡因可能会干扰睡眠，建议在睡前 <strong>6 小时</strong> 避免摄入。</li>
                <li>个体对咖啡因的敏感度受基因（如 CYP1A2 酶活性）、习惯、年龄等多种因素影响。</li>
                <li>吸烟会加速咖啡因代谢，而某些药物（如口服避孕药）可能减缓代谢。</li>
                <li>长期大量摄入可能导致耐受性增加和依赖性。</li>
                <li>过量摄入可能导致焦虑、心悸、失眠、胃部不适等副作用。</li>
              </ul>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-yellow-700">
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议仅供参考，不能替代专业医疗意见。</p>
           <p>&copy; {new Date().getFullYear()} Caffeine Tracker</p>
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;
