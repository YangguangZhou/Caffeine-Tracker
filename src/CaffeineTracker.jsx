import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coffee, Moon, Sun, TrendingUp, BarChart2, Settings, RefreshCw, Laptop, Code // Added Code icon
} from 'lucide-react';

// 导入工具函数
import {
  formatTime,
  formatDate,
  getStartOfDay,
  getEndOfDay,
  formatDatetimeLocal,
  isToday // Assuming isToday is in timeUtils
} from './utils/timeUtils'; // Make sure isToday is exported if used

import {
  getTotalCaffeineAtTime,
  calculateHoursToReachTarget,
  estimateConcentration,
  estimateAmountFromConcentration,
  generateMetabolismChartData
} from './utils/caffeineCalculations';

// 导入常量和预设
import {
  COFFEE_COLORS,
  NIGHT_COLORS,
  defaultSettings,
  initialPresetDrinks,
  originalPresetDrinkIds
} from './utils/constants';

// 导入WebDAV客户端
import WebDAVClient from './utils/webdavSync';

// 导入视图组件
import CurrentStatusView from './views/CurrentStatusView';
import StatisticsView from './views/StatisticsView';
import SettingsView from './views/SettingsView';

// --- 新增: 脚本加载相关常量 ---
const UMAMI_SCRIPT_ID = 'umami-analytics-script';
const ADSENSE_SCRIPT_ID = 'google-adsense-script';
const UMAMI_SRC = "https://umami.jerryz.com.cn/script.js";
const UMAMI_WEBSITE_ID = "e2b198b9-ec7e-436d-b6d0-925e7f5f96f3";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2597042766299857";
const ADSENSE_CLIENT = "ca-pub-2597042766299857";

/**
 * 应用主组件
 */
const CaffeineTracker = () => {
  // --- 状态变量 ---

  // 用户设置
  const [userSettings, setUserSettings] = useState(defaultSettings);
  // Effective theme state based on settings and system preference
  const [effectiveTheme, setEffectiveTheme] = useState('light'); // 'light' or 'dark'

  // 摄入记录
  const [records, setRecords] = useState([]);
  const [currentCaffeineAmount, setCurrentCaffeineAmount] = useState(0);
  const [currentCaffeineConcentration, setCurrentCaffeineConcentration] = useState(0);
  const [optimalSleepTime, setOptimalSleepTime] = useState('');
  const [hoursUntilSafeSleep, setHoursUntilSafeSleep] = useState(null);

  // 饮品状态（预设和自定义组合）
  const [drinks, setDrinks] = useState([]);

  // 视图和统计状态
  const [viewMode, setViewMode] = useState('current'); // 'current', 'stats', 'settings'
  const [statsView, setStatsView] = useState('week'); // 'week', 'month', 'year'
  const [statsDate, setStatsDate] = useState(new Date());

  // 代谢图表状态
  const [metabolismChartData, setMetabolismChartData] = useState([]);

  // WebDAV同步状态
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    lastSyncTime: null,
    lastSyncResult: null
  });

  // --- 徽章显示状态 ---
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  // --- 主题和颜色 ---

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateEffectiveTheme = () => {
      const systemPrefersDark = mediaQuery.matches;
      if (userSettings.themeMode === 'auto') {
        setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setEffectiveTheme(userSettings.themeMode);
      }
    };

    // Initial check
    updateEffectiveTheme();

    // Add listener for changes
    mediaQuery.addEventListener('change', updateEffectiveTheme);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
  }, [userSettings.themeMode]); // Re-run when themeMode setting changes

  // Calculate colors based on the effective theme
  const colors = useMemo(() =>
    effectiveTheme === 'dark' ? NIGHT_COLORS : COFFEE_COLORS,
    [effectiveTheme]
  );

  // --- 效果 ---

  // 从localStorage加载数据
  useEffect(() => {
    let loadedRecords = [];
    let loadedSettings = { ...defaultSettings }; // Start with potentially modified defaults
    let loadedDrinks = [];

    try {
      // 加载记录 (No change needed here)
      const savedRecords = localStorage.getItem('caffeineRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          const validRecords = parsedRecords.filter(r =>
            r && typeof r.id !== 'undefined' &&
            typeof r.amount === 'number' &&
            typeof r.timestamp === 'number' &&
            typeof r.name === 'string'
          );
          loadedRecords = validRecords;
        } else {
          console.error('Invalid records format in localStorage. Clearing.');
          localStorage.removeItem('caffeineRecords');
        }
      }

      // 加载设置 (Updated for themeMode, develop, and backward compatibility)
      const savedSettings = localStorage.getItem('caffeineSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings === 'object' && parsedSettings !== null) {
          const mergedSettings = { ...defaultSettings }; // Start with defaults

          // Migrate nightMode to themeMode if necessary
          if (parsedSettings.hasOwnProperty('nightMode') && !parsedSettings.hasOwnProperty('themeMode')) {
            mergedSettings.themeMode = parsedSettings.nightMode ? 'dark' : 'light';
            delete parsedSettings.nightMode; // Remove old key
          }

          // Merge valid saved settings
          for (const key in defaultSettings) {
            if (parsedSettings.hasOwnProperty(key)) {
                // 检查类型是否匹配，或者对于 develop 键，允许任何类型（稍后验证）
                if (typeof parsedSettings[key] === typeof defaultSettings[key] || key === 'develop') {
                    // 特殊检查 themeMode 有效性
                    if (key === 'themeMode' && !['auto', 'light', 'dark'].includes(parsedSettings[key])) {
                        continue; // 跳过无效的 themeMode 值
                    }
                    // --- 新增: 验证 develop 类型 ---
                    if (key === 'develop' && typeof parsedSettings[key] !== 'boolean') {
                        console.warn(`从 localStorage 加载的 'develop' 设置类型无效 (${typeof parsedSettings[key]})，将使用默认值 false。`);
                        mergedSettings[key] = defaultSettings[key]; // 使用默认值
                    } else {
                        mergedSettings[key] = parsedSettings[key];
                    }
                }
            }
          }

          // Validate numerical ranges (No change needed here)
          if (mergedSettings.weight < 20 || mergedSettings.weight > 300)
            mergedSettings.weight = defaultSettings.weight;
          if (mergedSettings.maxDailyCaffeine < 0 || mergedSettings.maxDailyCaffeine > 2000)
            mergedSettings.maxDailyCaffeine = defaultSettings.maxDailyCaffeine;
          if (mergedSettings.recommendedDosePerKg < 1 || mergedSettings.recommendedDosePerKg > 10)
            mergedSettings.recommendedDosePerKg = defaultSettings.recommendedDosePerKg;
          if (mergedSettings.safeSleepThresholdConcentration < 0 || mergedSettings.safeSleepThresholdConcentration > 10)
            mergedSettings.safeSleepThresholdConcentration = defaultSettings.safeSleepThresholdConcentration;
          if (mergedSettings.volumeOfDistribution < 0.1 || mergedSettings.volumeOfDistribution > 1.5)
            mergedSettings.volumeOfDistribution = defaultSettings.volumeOfDistribution;
          if (mergedSettings.caffeineHalfLifeHours < 1 || mergedSettings.caffeineHalfLifeHours > 24)
            mergedSettings.caffeineHalfLifeHours = defaultSettings.caffeineHalfLifeHours;

          loadedSettings = mergedSettings;
        } else {
          console.error('Invalid settings format in localStorage. Clearing.');
          localStorage.removeItem('caffeineSettings');
        }
      }

      // 加载饮品 (No change needed here)
      const savedDrinks = localStorage.getItem('caffeineDrinks');
      if (savedDrinks) {
        const parsedDrinks = JSON.parse(savedDrinks);
        if (Array.isArray(parsedDrinks)) {
          const validDrinks = parsedDrinks.filter(d =>
            d && typeof d.id !== 'undefined' &&
            typeof d.name === 'string' &&
            typeof d.caffeineContent === 'number'
          );

          const savedDrinkIds = new Set(validDrinks.map(d => d.id));
          const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));

          const validatedSavedDrinks = validDrinks.map(d => {
            const isOriginalPreset = originalPresetDrinkIds.has(d.id);
            const originalPresetData = isOriginalPreset
              ? initialPresetDrinks.find(p => p.id === d.id)
              : {};

            return {
              ...d,
              category: d.category || (isOriginalPreset ? originalPresetData.category : '其他'),
              isPreset: d.isPreset ?? isOriginalPreset,
            };
          });

          loadedDrinks = [...validatedSavedDrinks, ...newPresetsToAdd];
        } else {
          console.error('Invalid drinks format in localStorage. Using initial presets.');
          loadedDrinks = [...initialPresetDrinks];
          localStorage.removeItem('caffeineDrinks');
        }
      } else {
        loadedDrinks = [...initialPresetDrinks];
      }

    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      loadedRecords = [];
      loadedSettings = { ...defaultSettings }; // Reset to defaults on error
      loadedDrinks = [...initialPresetDrinks];
    } finally {
      setRecords(loadedRecords.sort((a, b) => b.timestamp - a.timestamp));
      setUserSettings(loadedSettings);
      setDrinks(loadedDrinks);

      // Trigger initial sync if configured (No change needed here)
      if (loadedSettings.webdavEnabled &&
          loadedSettings.webdavSyncFrequency === 'startup') {
        setTimeout(() => {
          performWebDAVSync(loadedSettings, loadedRecords, loadedDrinks);
        }, 1000);
      }
    }
  }, []); // Run once on mount

  // 计算当前咖啡因水平 (No change needed here)
  useEffect(() => {
    const calculateCurrentStatus = () => {
      const now = Date.now();
      const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;

      const totalAmount = getTotalCaffeineAtTime(records, now, caffeineHalfLifeHours);
      setCurrentCaffeineAmount(totalAmount);

      const concentration = estimateConcentration(totalAmount, weight, volumeOfDistribution);
      setCurrentCaffeineConcentration(concentration ?? 0);

      const safeTargetAmount = estimateAmountFromConcentration(
        safeSleepThresholdConcentration, weight, volumeOfDistribution
      );

      if (safeTargetAmount !== null && safeTargetAmount >= 0) {
        const hoursNeeded = calculateHoursToReachTarget(
          totalAmount, safeTargetAmount, caffeineHalfLifeHours
        );
        setHoursUntilSafeSleep(hoursNeeded);

        if (hoursNeeded !== null && hoursNeeded > 0) {
          const sleepTime = new Date(now + hoursNeeded * 60 * 60 * 1000);
          setOptimalSleepTime(sleepTime.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', hour12: false
          }));
        } else if (hoursNeeded === 0) {
          setOptimalSleepTime('现在');
        } else {
          setOptimalSleepTime('N/A');
        }
      } else {
        setHoursUntilSafeSleep(null);
        setOptimalSleepTime('N/A');
      }
    };

    calculateCurrentStatus();
    const timer = setInterval(calculateCurrentStatus, 60000);
    return () => clearInterval(timer);
  }, [records, userSettings]);

  // 生成代谢图表数据 (No change needed here)
  useEffect(() => {
    const chartData = generateMetabolismChartData(
      records,
      userSettings.caffeineHalfLifeHours
    );
    setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]);

  // 将数据保存到localStorage (Updated for settings)
  useEffect(() => {
    if (records.length > 0 || localStorage.getItem('caffeineRecords') !== null) {
      try {
        localStorage.setItem('caffeineRecords', JSON.stringify(records));
      } catch (error) {
        console.error('Error saving records to localStorage:', error);
        // Consider a less intrusive way to notify user if needed
      }
    }
  }, [records]);

  useEffect(() => {
    try {
      // Ensure only valid settings are saved, exclude sensitive or large data if necessary
      const settingsToSave = { ...userSettings };
      // delete settingsToSave.webdavPassword; // Example: Don't save password directly if not needed
      localStorage.setItem('caffeineSettings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [userSettings]);

  useEffect(() => {
    if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
      try {
        const drinksToSave = drinks.map(({ id, name, caffeineContent, defaultVolume, category, isPreset }) => ({
          id, name, caffeineContent, defaultVolume, category, isPreset
        }));
        localStorage.setItem('caffeineDrinks', JSON.stringify(drinksToSave));
      } catch (error) {
        console.error('Error saving drinks list to localStorage:', error);
      }
    }
  }, [drinks]);

  // --- 新增: Effect for managing external scripts ---
  useEffect(() => {
    const isDevelopMode = userSettings.develop === true; // 显式检查布尔值 true
    console.log(`开发模式状态: ${isDevelopMode}`);

    const addScript = (id, src, attributes = {}) => {
      if (document.getElementById(id)) {
        console.log(`脚本 ${id} 已存在.`);
        return; // 如果脚本已存在，则不添加
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true; // 默认异步加载
      if (attributes.defer) {
        script.defer = true;
        delete attributes.defer; // defer 是布尔属性
      }
      for (const key in attributes) {
        script.setAttribute(key, attributes[key]);
      }
      document.head.appendChild(script);
      console.log(`脚本 ${id} 已添加.`);
    };

    const removeScript = (id) => {
      const script = document.getElementById(id);
      if (script) {
        script.remove();
        console.log(`脚本 ${id} 已移除.`);
      } else {
         console.log(`尝试移除脚本 ${id}，但未找到.`);
      }
    };

    if (isDevelopMode) {
      // 开发模式：移除脚本
      removeScript(UMAMI_SCRIPT_ID);
      removeScript(ADSENSE_SCRIPT_ID);
    } else {
      // 非开发模式：添加脚本
      // 添加 Umami
      addScript(UMAMI_SCRIPT_ID, UMAMI_SRC, {
        defer: true, // Umami 使用 defer
        'data-website-id': UMAMI_WEBSITE_ID,
      });
      // 添加 Adsense
      addScript(ADSENSE_SCRIPT_ID, ADSENSE_SRC, {
        crossorigin: 'anonymous',
        'data-ad-client': ADSENSE_CLIENT, // 也可以用 data-ad-client
      });
    }

    // 清理函数：组件卸载时确保脚本被移除（如果需要）
    // 在这个场景下，我们希望脚本根据模式持久存在，所以卸载时不移除
    // return () => {
    //   removeScript(UMAMI_SCRIPT_ID);
    //   removeScript(ADSENSE_SCRIPT_ID);
    // };
  }, [userSettings.develop]); // 依赖于 develop 设置的变化

  // --- 数据聚合函数 (No change needed here) ---

  const getTodayTotal = useCallback(() => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    return Math.round(records
      .filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // --- 派生状态和计算 (No change needed here) ---

  const personalizedRecommendation = useMemo(() => {
    const { weight, recommendedDosePerKg } = userSettings;
    if (weight > 0 && recommendedDosePerKg > 0) {
      return Math.round(weight * recommendedDosePerKg);
    }
    return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  const effectiveMaxDaily = useMemo(() => {
    const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (personalizedRecommendation !== null) {
      return Math.min(generalMax, personalizedRecommendation);
    }
    return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  const userStatus = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    const maxDaily = effectiveMaxDaily;

    if (currentRounded < maxDaily * 0.1)
      return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
    if (currentRounded < maxDaily * 0.5)
      return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
    if (currentRounded < maxDaily)
      return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-amber-500` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const maxDaily = effectiveMaxDaily;
    const currentRounded = Math.round(currentCaffeineAmount);

    if (dailyTotal > maxDaily)
      return {
        advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过您的个性化或通用上限 (${maxDaily}mg)，建议减少摄入。`,
        color: `text-red-700`,
        bgColor: `bg-red-100`
      };

    if (currentRounded > 100 && new Date().getHours() >= 16)
      return {
        advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。',
        color: `text-amber-700`,
        bgColor: `bg-amber-100`
      };

    return {
      advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100'
    };
  }, [getTodayTotal, effectiveMaxDaily, currentCaffeineAmount]);

  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = effectiveMaxDaily;
    if (maxDailyCaffeineForProgress <= 0) return 0;
    return Math.min(Math.max(0, (currentCaffeineAmount / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- WebDAV同步 (Updated to handle 'develop' setting) ---

  const performWebDAVSync = async (settings, currentRecords, currentDrinks) => {
    if (!settings.webdavEnabled || !settings.webdavServer ||
        !settings.webdavUsername || !settings.webdavPassword) {
      console.log("WebDAV sync not configured or disabled");
      setSyncStatus({ // Update status even if not syncing
        inProgress: false,
        lastSyncTime: syncStatus.lastSyncTime, // Keep last sync time
        lastSyncResult: { success: false, message: "WebDAV未配置" }
      });
      setShowSyncBadge(true); // Show badge briefly
      setTimeout(() => setShowSyncBadge(false), 3000);
      return;
    }

    setSyncStatus(prev => ({ ...prev, inProgress: true }));
    setShowSyncBadge(true);

    try {
      const webdavClient = new WebDAVClient(
        settings.webdavServer,
        settings.webdavUsername,
        settings.webdavPassword
      );

      // Prepare data to sync (include current settings, including 'develop')
      const localData = {
        records: currentRecords,
        drinks: currentDrinks,
        // Send a version of settings *without* the password but *with* develop flag
        userSettings: { ...settings, webdavPassword: '' },
        // --- 更新版本号 (可选) ---
        version: "1.0.2" // Increment version if structure changes significantly
      };

      const result = await webdavClient.performSync(localData);

      if (result.success) {
        let updatedSettings = { ...settings }; // Start with current settings

        // Apply synced data if available
        if (result.data) {
          if (result.data.records && Array.isArray(result.data.records)) {
            setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
          }

          if (result.data.drinks && Array.isArray(result.data.drinks)) {
            setDrinks(result.data.drinks);
          }

          // Merge synced settings, preserving local password and last sync time
          if (result.data.userSettings) {
             // --- 更新: 确保 develop 字段被正确合并 ---
             const syncedDevelop = result.data.userSettings.develop;
             updatedSettings = {
               ...settings, // Keep local settings like password
               ...result.data.userSettings, // Apply synced settings
               webdavPassword: settings.webdavPassword, // Ensure local password is kept
               // 显式检查并设置 develop，以防合并逻辑出错或类型错误
               develop: typeof syncedDevelop === 'boolean' ? syncedDevelop : settings.develop,
             };
             console.log("同步后合并的设置:", updatedSettings);
          }
        }

        // Update settings with the new sync timestamp
        updatedSettings.lastSyncTimestamp = result.timestamp;
        setUserSettings(updatedSettings); // Update state with potentially merged settings and new timestamp

        setSyncStatus({
          inProgress: false,
          lastSyncTime: new Date(result.timestamp), // Use timestamp from server if available
          lastSyncResult: { success: true, message: result.message }
        });
      } else {
        // Don't update settings on sync failure, just report error
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("WebDAV sync failed:", error);
      setSyncStatus({
        inProgress: false,
        lastSyncTime: new Date(), // Mark time of failure attempt
        lastSyncResult: { success: false, message: error.message || "同步时发生未知错误" }
      });
    }

    // Hide badge after 5 seconds regardless of outcome
    setTimeout(() => {
      setShowSyncBadge(false);
    }, 5000);
  };

  // 处理定时同步 (No change needed here, uses userSettings state)
  useEffect(() => {
    let syncTimer = null;
    let dailyCheckTimeout = null;

    const clearTimers = () => {
      if (syncTimer) clearInterval(syncTimer);
      if (dailyCheckTimeout) clearTimeout(dailyCheckTimeout);
    };

    if (userSettings.webdavEnabled) {
      if (userSettings.webdavSyncFrequency === 'hourly') {
        syncTimer = setInterval(() => {
          performWebDAVSync(userSettings, records, drinks);
        }, 60 * 60 * 1000);
      } else if (userSettings.webdavSyncFrequency === 'daily') {
        const checkDailySync = () => {
          const now = new Date();
          const lastSync = userSettings.lastSyncTimestamp
            ? new Date(userSettings.lastSyncTimestamp)
            : null;

          if (!lastSync || !isToday(lastSync)) { // Assumes isToday utility function exists
            performWebDAVSync(userSettings, records, drinks);
          }

          // Schedule next check for roughly an hour later
          dailyCheckTimeout = setTimeout(checkDailySync, 60 * 60 * 1000);
        };
        checkDailySync(); // Initial check
      }
    }

    // Cleanup function to clear timers when settings change or component unmounts
    return () => clearTimers();

  }, [
      userSettings.webdavEnabled,
      userSettings.webdavSyncFrequency,
      userSettings.lastSyncTimestamp,
      // Include records and drinks if performWebDAVSync needs the absolute latest
      // but this might cause excessive timer resets. Usually settings are enough.
      // records,
      // drinks
  ]);


  // --- 事件处理程序 ---

  // 记录处理 (No change needed here)
  const handleAddRecord = useCallback((record) => {
    setRecords(prevRecords => [...prevRecords, record].sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleEditRecord = useCallback((updatedRecord) => {
    setRecords(prevRecords => prevRecords.map(record =>
      record.id === updatedRecord.id ? updatedRecord : record
    ).sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleDeleteRecord = useCallback((id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setRecords(prevRecords => prevRecords.filter(record => record.id !== id));
    }
  }, []);

  // 设置处理 (Updated to handle 'develop' potentially)
  const handleUpdateSettings = useCallback((newSettings) => {
    // --- 新增: 验证传入的 develop 类型 ---
    if (newSettings.hasOwnProperty('develop') && typeof newSettings.develop !== 'boolean') {
        console.warn("尝试更新 'develop' 设置为非布尔值，已阻止。");
        // 可以选择忽略该键或抛出错误
        delete newSettings.develop; // 忽略无效的 develop 更新
    }
    setUserSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }, []);

  // 切换主题模式 (Updated)
  const toggleThemeMode = useCallback(() => {
    setUserSettings(prev => {
      let nextMode;
      if (prev.themeMode === 'auto') {
        nextMode = 'light';
      } else if (prev.themeMode === 'light') {
        nextMode = 'dark';
      } else { // 'dark'
        nextMode = 'auto';
      }
      return { ...prev, themeMode: nextMode };
    });
  }, []);

  // 手动触发WebDAV同步 (No change needed here)
  const handleManualSync = useCallback(() => {
    // Pass the *current* state values directly
    performWebDAVSync(userSettings, records, drinks);
  }, [userSettings, records, drinks]); // Dependencies ensure the latest state is used

  // --- 渲染 ---
  return (
    // Apply dynamic background and text color based on the *effective* theme
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        effectiveTheme === 'dark' ? 'dark' : '' // Add 'dark' class for Tailwind dark mode variants if needed
      }`}
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 页眉 */}
        <header className="mb-6 text-center relative">
          {/* Title */}
          <h1
            className="text-3xl font-bold flex justify-center items-center transition-colors"
            style={{ color: colors.espresso }}
          >
            <Coffee className="mr-2" size={30} />
            咖啡因追踪器
          </h1>
          <p
            className="mt-1 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            科学管理 · 健康生活
          </p>

          {/* Header Buttons Container */}
          <div className="absolute top-0 right-0 flex items-center space-x-2">
            {/* Sync Button (Conditional) */}
            {userSettings.webdavEnabled && (
              <button
                onClick={handleManualSync}
                disabled={syncStatus.inProgress}
                className={`p-2 rounded-full transition-all duration-300 ${
                  syncStatus.inProgress ? 'animate-spin text-blue-500' : ''
                }`}
                style={{ color: colors.textSecondary }}
                aria-label="手动同步"
              >
                <RefreshCw size={20} />
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleThemeMode}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              aria-label={`切换主题 (当前: ${userSettings.themeMode})`}
            >
              {userSettings.themeMode === 'auto' ? <Laptop size={20} /> :
               userSettings.themeMode === 'light' ? <Sun size={20} /> :
               <Moon size={20} />}
            </button>
          </div>

          {/* Sync Status Badge (Position adjusted slightly if needed) */}
          {showSyncBadge && (
            <div
              className={`absolute top-12 right-0 mt-1 py-1 px-2 rounded-full text-xs z-10 ${
                syncStatus.lastSyncResult?.success
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : syncStatus.lastSyncResult?.message === "WebDAV未配置"
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
              } flex items-center shadow-sm`}
            >
              {syncStatus.inProgress
                ? '同步中...'
                : syncStatus.lastSyncResult?.success
                  ? '同步成功'
                  : syncStatus.lastSyncResult?.message || '同步失败'}
            </div>
          )}
        </header>

        {/* 导航标签 (No change needed here) */}
        <div
          className="rounded-xl mb-5 flex overflow-hidden shadow-md border transition-colors"
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.borderSubtle
          }}
        >
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${
              viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
            }`}
            style={viewMode === 'current'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent, ':hover': { backgroundColor: colors.accentHover } } // Example hover style
            }
          >
            <TrendingUp size={16} className="mr-1.5" /> 当前状态
          </button>
           <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${
              viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
            }`}
            style={viewMode === 'stats'
              ? {
                backgroundColor: colors.accent,
                borderColor: colors.borderSubtle
              }
              : {
                color: colors.accent,
                borderColor: colors.borderSubtle,
                 ':hover': { backgroundColor: colors.accentHover }
              }
            }
          >
            <BarChart2 size={16} className="mr-1.5" /> 数据统计
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${
              viewMode === 'settings' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
            }`}
            style={viewMode === 'settings'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent, ':hover': { backgroundColor: colors.accentHover } }
            }
          >
            <Settings size={16} className="mr-1.5" /> 设置
          </button>
        </div>

        {/* --- Views (Pass updated props if necessary) --- */}

        {/* 当前状态视图 */}
        {viewMode === 'current' && (
          <CurrentStatusView
            // Pass necessary props, including updated colors
            currentCaffeineAmount={currentCaffeineAmount}
            currentCaffeineConcentration={currentCaffeineConcentration}
            optimalSleepTime={optimalSleepTime}
            hoursUntilSafeSleep={hoursUntilSafeSleep}
            userStatus={userStatus}
            healthAdvice={healthAdvice}
            records={records}
            drinks={drinks}
            metabolismChartData={metabolismChartData}
            userSettings={userSettings} // Pass full settings
            percentFilled={percentFilled}
            todayTotal={todayTotal}
            effectiveMaxDaily={effectiveMaxDaily}
            personalizedRecommendation={personalizedRecommendation}
            onAddRecord={handleAddRecord}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            estimateAmountFromConcentration={estimateAmountFromConcentration}
            formatTime={formatTime}
            formatDate={formatDate}
            colors={colors} // Pass calculated colors
          />
        )}

        {/* 统计视图 */}
        {viewMode === 'stats' && (
          <StatisticsView
            // Pass necessary props, including updated colors
            records={records}
            statsView={statsView}
            setStatsView={setStatsView}
            statsDate={statsDate}
            setStatsDate={setStatsDate}
            effectiveMaxDaily={effectiveMaxDaily}
            userSettings={userSettings} // Pass full settings
            drinks={drinks}
            colors={colors} // Pass calculated colors
          />
        )}

        {/* 设置视图 */}
        {viewMode === 'settings' && (
          <SettingsView
            // Pass necessary props, including updated colors and sync status
            userSettings={userSettings} // Pass full settings
            onUpdateSettings={handleUpdateSettings}
            drinks={drinks}
            setDrinks={setDrinks}
            originalPresetDrinkIds={originalPresetDrinkIds}
            onManualSync={handleManualSync} // Pass manual sync handler
            syncStatus={syncStatus} // Pass sync status
            records={records} // Pass records if needed for export/import
            setRecords={setRecords} // Pass setRecords if needed for import
            colors={colors} // Pass calculated colors
          />
        )}

        {/* 页脚 (Updated to show develop mode) */}
        <footer className="mt-8 text-center text-xs transition-colors" style={{ color: colors.textMuted }}>
          {/* --- 新增: 开发模式指示器 --- */}
          {userSettings.develop === true && (
            <p className="mb-2 font-semibold text-orange-500 flex items-center justify-center">
              <Code size={14} className="mr-1" /> 开发模式已启用
            </p>
          )}
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议基于科学模型估算，仅供参考，不能替代专业医疗意见。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Caffeine Tracker App v1.0.1</p>
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;