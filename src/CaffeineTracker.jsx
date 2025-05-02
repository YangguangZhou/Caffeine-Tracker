// 导入 React 相关模块，包括 lazy 和 Suspense
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
// 导入 react-helmet-async 用于管理 head 标签
import { Helmet, HelmetProvider } from 'react-helmet-async';
import {
  Coffee, Moon, Sun, TrendingUp, BarChart2, Settings, RefreshCw, Laptop, Code, Loader2 // 添加 Loader2 用于 Suspense fallback
} from 'lucide-react';

// 导入工具函数
import {
  formatTime,
  formatDate,
  getStartOfDay,
  getEndOfDay,
  formatDatetimeLocal,
  isToday
} from './utils/timeUtils';

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

// --- 代码分割：懒加载视图组件 ---
const CurrentStatusView = lazy(() => import('./views/CurrentStatusView'));
const StatisticsView = lazy(() => import('./views/StatisticsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

// 脚本加载相关常量 (保持不变)
const UMAMI_SCRIPT_ID = 'umami-analytics-script';
const ADSENSE_SCRIPT_ID = 'google-adsense-script';
const UMAMI_SRC = "https://umami.jerryz.com.cn/script.js";
const UMAMI_WEBSITE_ID = "e2b198b9-ec7e-436d-b6d0-925e7f5f96f3";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2597042766299857";
const ADSENSE_CLIENT = "ca-pub-2597042766299857";

// --- 新增: JSON-LD 结构化数据 ---
const schemaData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "咖啡因追踪器",
  "description": "科学追踪和管理您的每日咖啡因摄入量，提供代谢预测和健康建议。",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web Browser",
  "browserRequirements": "Requires JavaScript. Modern browsers recommended.",
  "url": "https://ct.jerryz.com.cn"
};


/**
 * 应用主组件
 */
const CaffeineTracker = () => {
  // --- 状态变量 (保持不变) ---
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [effectiveTheme, setEffectiveTheme] = useState('light');
  const [records, setRecords] = useState([]);
  const [currentCaffeineAmount, setCurrentCaffeineAmount] = useState(0);
  const [currentCaffeineConcentration, setCurrentCaffeineConcentration] = useState(0);
  const [optimalSleepTime, setOptimalSleepTime] = useState('');
  const [hoursUntilSafeSleep, setHoursUntilSafeSleep] = useState(null);
  const [drinks, setDrinks] = useState([]);
  const [viewMode, setViewMode] = useState('current');
  const [statsView, setStatsView] = useState('week');
  const [statsDate, setStatsDate] = useState(new Date());
  const [metabolismChartData, setMetabolismChartData] = useState([]);
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    lastSyncTime: null,
    lastSyncResult: null
  });
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  // --- 主题和颜色 (保持不变) ---
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
    updateEffectiveTheme();
    mediaQuery.addEventListener('change', updateEffectiveTheme);
    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
  }, [userSettings.themeMode]);

  const colors = useMemo(() =>
    effectiveTheme === 'dark' ? NIGHT_COLORS : COFFEE_COLORS,
    [effectiveTheme]
  );

  // --- 效果 (大部分保持不变) ---

  // 加载数据 (保持不变)
  useEffect(() => {
    // ... (加载 localStorage 数据的逻辑不变) ...
    let loadedRecords = [];
    let loadedSettings = { ...defaultSettings };
    let loadedDrinks = [];

    try {
      // 加载记录
      const savedRecords = localStorage.getItem('caffeineRecords');
      if (savedRecords) {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          loadedRecords = parsedRecords.filter(r => r && typeof r.id !== 'undefined' && typeof r.amount === 'number' && typeof r.timestamp === 'number' && typeof r.name === 'string');
        } else {
          localStorage.removeItem('caffeineRecords');
        }
      }

      // 加载设置 (确保 develop 字段被正确加载)
      const savedSettings = localStorage.getItem('caffeineSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings === 'object' && parsedSettings !== null) {
          const mergedSettings = { ...defaultSettings };
          if (parsedSettings.hasOwnProperty('nightMode') && !parsedSettings.hasOwnProperty('themeMode')) {
            mergedSettings.themeMode = parsedSettings.nightMode ? 'dark' : 'light';
            delete parsedSettings.nightMode;
          }
          for (const key in defaultSettings) {
            if (parsedSettings.hasOwnProperty(key)) {
              if (typeof parsedSettings[key] === typeof defaultSettings[key] || key === 'develop') {
                if (key === 'themeMode' && !['auto', 'light', 'dark'].includes(parsedSettings[key])) continue;
                if (key === 'develop' && typeof parsedSettings[key] !== 'boolean') {
                  mergedSettings[key] = defaultSettings[key];
                } else {
                  mergedSettings[key] = parsedSettings[key];
                }
              }
            }
          }
          // Validate numerical ranges
          if (mergedSettings.weight < 20 || mergedSettings.weight > 300) mergedSettings.weight = defaultSettings.weight;
          // ... (其他数值验证)
           if (mergedSettings.maxDailyCaffeine < 0 || mergedSettings.maxDailyCaffeine > 2000) mergedSettings.maxDailyCaffeine = defaultSettings.maxDailyCaffeine;
           if (mergedSettings.recommendedDosePerKg < 1 || mergedSettings.recommendedDosePerKg > 10) mergedSettings.recommendedDosePerKg = defaultSettings.recommendedDosePerKg;
           if (mergedSettings.safeSleepThresholdConcentration < 0 || mergedSettings.safeSleepThresholdConcentration > 10) mergedSettings.safeSleepThresholdConcentration = defaultSettings.safeSleepThresholdConcentration;
           if (mergedSettings.volumeOfDistribution < 0.1 || mergedSettings.volumeOfDistribution > 1.5) mergedSettings.volumeOfDistribution = defaultSettings.volumeOfDistribution;
           if (mergedSettings.caffeineHalfLifeHours < 1 || mergedSettings.caffeineHalfLifeHours > 24) mergedSettings.caffeineHalfLifeHours = defaultSettings.caffeineHalfLifeHours;

          loadedSettings = mergedSettings;
        } else {
          localStorage.removeItem('caffeineSettings');
        }
      }

      // 加载饮品
      const savedDrinks = localStorage.getItem('caffeineDrinks');
      if (savedDrinks) {
        const parsedDrinks = JSON.parse(savedDrinks);
        if (Array.isArray(parsedDrinks)) {
          const validDrinks = parsedDrinks.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string' && typeof d.caffeineContent === 'number');
          const savedDrinkIds = new Set(validDrinks.map(d => d.id));
          const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));
          const validatedSavedDrinks = validDrinks.map(d => {
            const isOriginalPreset = originalPresetDrinkIds.has(d.id);
            const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : {};
            return { ...d, category: d.category || (isOriginalPreset ? originalPresetData.category : '其他'), isPreset: d.isPreset ?? isOriginalPreset };
          });
          loadedDrinks = [...validatedSavedDrinks, ...newPresetsToAdd];
        } else {
          loadedDrinks = [...initialPresetDrinks];
          localStorage.removeItem('caffeineDrinks');
        }
      } else {
        loadedDrinks = [...initialPresetDrinks];
      }

    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      loadedRecords = [];
      loadedSettings = { ...defaultSettings };
      loadedDrinks = [...initialPresetDrinks];
    } finally {
      setRecords(loadedRecords.sort((a, b) => b.timestamp - a.timestamp));
      setUserSettings(loadedSettings);
      setDrinks(loadedDrinks);
      if (loadedSettings.webdavEnabled && loadedSettings.webdavSyncFrequency === 'startup') {
        setTimeout(() => {
          performWebDAVSync(loadedSettings, loadedRecords, loadedDrinks);
        }, 1000);
      }
    }
  }, []); // 确保 performWebDAVSync 在 useCallback 或 useMemo 中定义，或者作为依赖项添加

  // 计算当前状态 (保持不变)
  useEffect(() => {
    // ... (计算逻辑不变) ...
     const calculateCurrentStatus = () => {
       const now = Date.now();
       const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;
       const totalAmount = getTotalCaffeineAtTime(records, now, caffeineHalfLifeHours);
       setCurrentCaffeineAmount(totalAmount);
       const concentration = estimateConcentration(totalAmount, weight, volumeOfDistribution);
       setCurrentCaffeineConcentration(concentration ?? 0);
       const safeTargetAmount = estimateAmountFromConcentration(safeSleepThresholdConcentration, weight, volumeOfDistribution);
       if (safeTargetAmount !== null && safeTargetAmount >= 0) {
         const hoursNeeded = calculateHoursToReachTarget(totalAmount, safeTargetAmount, caffeineHalfLifeHours);
         setHoursUntilSafeSleep(hoursNeeded);
         if (hoursNeeded !== null && hoursNeeded > 0) {
           const sleepTime = new Date(now + hoursNeeded * 60 * 60 * 1000);
           setOptimalSleepTime(sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
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

  // 生成图表数据 (保持不变)
  useEffect(() => {
    // ... (逻辑不变) ...
     const chartData = generateMetabolismChartData(records, userSettings.caffeineHalfLifeHours);
     setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]);

  // 保存数据 (保持不变)
  useEffect(() => {
    // ... (保存 records 逻辑不变) ...
     if (records.length > 0 || localStorage.getItem('caffeineRecords') !== null) {
       try {
         localStorage.setItem('caffeineRecords', JSON.stringify(records));
       } catch (error) {
         console.error('Error saving records to localStorage:', error);
       }
     }
  }, [records]);
  useEffect(() => {
    // ... (保存 settings 逻辑不变) ...
     try {
       const settingsToSave = { ...userSettings };
       localStorage.setItem('caffeineSettings', JSON.stringify(settingsToSave));
     } catch (error) {
       console.error('Error saving settings to localStorage:', error);
     }
  }, [userSettings]);
  useEffect(() => {
    // ... (保存 drinks 逻辑不变) ...
     if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
       try {
         const drinksToSave = drinks.map(({ id, name, caffeineContent, defaultVolume, category, isPreset }) => ({ id, name, caffeineContent, defaultVolume, category, isPreset }));
         localStorage.setItem('caffeineDrinks', JSON.stringify(drinksToSave));
       } catch (error) {
         console.error('Error saving drinks list to localStorage:', error);
       }
     }
  }, [drinks]);

  // 管理外部脚本 (保持不变)
  useEffect(() => {
    // ... (管理 Umami 和 Adsense 脚本的逻辑不变) ...
     const isDevelopMode = userSettings.develop === true;
     console.log(`开发模式状态: ${isDevelopMode}`);
     const addScript = (id, src, attributes = {}) => {
       if (document.getElementById(id)) return;
       const script = document.createElement('script');
       script.id = id; script.src = src; script.async = true;
       if (attributes.defer) { script.defer = true; delete attributes.defer; }
       for (const key in attributes) { script.setAttribute(key, attributes[key]); }
       document.head.appendChild(script);
       console.log(`脚本 ${id} 已添加.`);
     };
     const removeScript = (id) => {
       const script = document.getElementById(id);
       if (script) { script.remove(); console.log(`脚本 ${id} 已移除.`); }
     };
     if (isDevelopMode) {
       removeScript(UMAMI_SCRIPT_ID); removeScript(ADSENSE_SCRIPT_ID);
     } else {
       addScript(UMAMI_SCRIPT_ID, UMAMI_SRC, { defer: true, 'data-website-id': UMAMI_WEBSITE_ID });
       addScript(ADSENSE_SCRIPT_ID, ADSENSE_SRC, { crossorigin: 'anonymous', 'data-ad-client': ADSENSE_CLIENT });
     }
  }, [userSettings.develop]);

  // --- 数据聚合和派生状态 (保持不变) ---
  const getTodayTotal = useCallback(() => {
    // ... (逻辑不变) ...
     const todayStart = getStartOfDay(new Date());
     const todayEnd = getEndOfDay(new Date());
     return Math.round(records.filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd).reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const personalizedRecommendation = useMemo(() => {
    // ... (逻辑不变) ...
     const { weight, recommendedDosePerKg } = userSettings;
     if (weight > 0 && recommendedDosePerKg > 0) return Math.round(weight * recommendedDosePerKg);
     return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  const effectiveMaxDaily = useMemo(() => {
    // ... (逻辑不变) ...
     const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
     if (personalizedRecommendation !== null) return Math.min(generalMax, personalizedRecommendation);
     return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  const userStatus = useMemo(() => {
    // ... (逻辑不变) ...
     const currentRounded = Math.round(currentCaffeineAmount);
     const maxDaily = effectiveMaxDaily;
     if (currentRounded < maxDaily * 0.1) return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
     if (currentRounded < maxDaily * 0.5) return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
     if (currentRounded < maxDaily) return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-amber-500` };
     return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const healthAdvice = useMemo(() => {
    // ... (逻辑不变) ...
     const dailyTotal = getTodayTotal();
     const maxDaily = effectiveMaxDaily;
     const currentRounded = Math.round(currentCaffeineAmount);
     if (dailyTotal > maxDaily) return { advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过您的个性化或通用上限 (${maxDaily}mg)，建议减少摄入。`, color: `text-red-700`, bgColor: `bg-red-100` };
     if (currentRounded > 100 && new Date().getHours() >= 16) return { advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。', color: `text-amber-700`, bgColor: `bg-amber-100` };
     return { advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。', color: 'text-emerald-700', bgColor: 'bg-emerald-100' };
  }, [getTodayTotal, effectiveMaxDaily, currentCaffeineAmount]);

  const percentFilled = useMemo(() => {
    // ... (逻辑不变) ...
     const maxDailyCaffeineForProgress = effectiveMaxDaily;
     if (maxDailyCaffeineForProgress <= 0) return 0;
     return Math.min(Math.max(0, (currentCaffeineAmount / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- WebDAV同步 (保持不变) ---
  // 将 performWebDAVSync 定义移到 useCallback 或组件外部，或将其依赖项添加到 useEffect
  const performWebDAVSync = useCallback(async (settings, currentRecords, currentDrinks) => {
    // ... (同步逻辑不变, 确保处理 develop 字段) ...
    if (!settings.webdavEnabled || !settings.webdavServer || !settings.webdavUsername || !settings.webdavPassword) {
        console.log("WebDAV sync not configured or disabled");
        setSyncStatus(prev => ({ ...prev, inProgress: false, lastSyncResult: { success: false, message: "WebDAV未配置" } }));
        setShowSyncBadge(true); setTimeout(() => setShowSyncBadge(false), 3000); return;
    }
    setSyncStatus(prev => ({ ...prev, inProgress: true })); setShowSyncBadge(true);
    try {
        const webdavClient = new WebDAVClient(settings.webdavServer, settings.webdavUsername, settings.webdavPassword);
        const localData = { records: currentRecords, drinks: currentDrinks, userSettings: { ...settings, webdavPassword: '' }, version: "1.0.2" };
        const result = await webdavClient.performSync(localData);
        if (result.success) {
            let updatedSettings = { ...settings };
            if (result.data) {
                if (result.data.records && Array.isArray(result.data.records)) setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
                if (result.data.drinks && Array.isArray(result.data.drinks)) setDrinks(result.data.drinks);
                if (result.data.userSettings) {
                    const syncedDevelop = result.data.userSettings.develop;
                    updatedSettings = { ...settings, ...result.data.userSettings, webdavPassword: settings.webdavPassword, develop: typeof syncedDevelop === 'boolean' ? syncedDevelop : settings.develop };
                    console.log("同步后合并的设置:", updatedSettings);
                }
            }
            updatedSettings.lastSyncTimestamp = result.timestamp;
            setUserSettings(updatedSettings);
            setSyncStatus({ inProgress: false, lastSyncTime: new Date(result.timestamp), lastSyncResult: { success: true, message: result.message } });
        } else { throw new Error(result.message); }
    } catch (error) {
        console.error("WebDAV sync failed:", error);
        setSyncStatus({ inProgress: false, lastSyncTime: new Date(), lastSyncResult: { success: false, message: error.message || "同步时发生未知错误" } });
    }
    setTimeout(() => { setShowSyncBadge(false); }, 5000);
  }, []); // 添加空依赖数组，因为此函数不依赖组件状态（它接收参数）

  // 定时同步 (保持不变, 但依赖 performWebDAVSync)
  useEffect(() => {
    // ... (定时同步逻辑不变) ...
     let syncTimer = null; let dailyCheckTimeout = null;
     const clearTimers = () => { if (syncTimer) clearInterval(syncTimer); if (dailyCheckTimeout) clearTimeout(dailyCheckTimeout); };
     if (userSettings.webdavEnabled) {
       if (userSettings.webdavSyncFrequency === 'hourly') {
         syncTimer = setInterval(() => { performWebDAVSync(userSettings, records, drinks); }, 3600000);
       } else if (userSettings.webdavSyncFrequency === 'daily') {
         const checkDailySync = () => {
           const lastSync = userSettings.lastSyncTimestamp ? new Date(userSettings.lastSyncTimestamp) : null;
           if (!lastSync || !isToday(lastSync)) { performWebDAVSync(userSettings, records, drinks); }
           dailyCheckTimeout = setTimeout(checkDailySync, 3600000);
         }; checkDailySync();
       }
     }
     return () => clearTimers();
  }, [userSettings.webdavEnabled, userSettings.webdavSyncFrequency, userSettings.lastSyncTimestamp, records, drinks, performWebDAVSync]); // 添加 performWebDAVSync 作为依赖


  // --- 事件处理程序 (保持不变) ---
  const handleAddRecord = useCallback((record) => {
    // ... (逻辑不变) ...
     setRecords(prevRecords => [...prevRecords, record].sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleEditRecord = useCallback((updatedRecord) => {
    // ... (逻辑不变) ...
     setRecords(prevRecords => prevRecords.map(record => record.id === updatedRecord.id ? updatedRecord : record).sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleDeleteRecord = useCallback((id) => {
    // ... (逻辑不变) ...
     if (window.confirm('确定要删除这条记录吗？')) {
       setRecords(prevRecords => prevRecords.filter(record => record.id !== id));
     }
  }, []);

  const handleUpdateSettings = useCallback((newSettings) => {
    // ... (逻辑不变, 包含 develop 验证) ...
     if (newSettings.hasOwnProperty('develop') && typeof newSettings.develop !== 'boolean') {
         console.warn("尝试更新 'develop' 设置为非布尔值，已阻止。");
         delete newSettings.develop;
     }
     setUserSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }, []);

  const toggleThemeMode = useCallback(() => {
    // ... (逻辑不变) ...
     setUserSettings(prev => {
       let nextMode;
       if (prev.themeMode === 'auto') nextMode = 'light';
       else if (prev.themeMode === 'light') nextMode = 'dark';
       else nextMode = 'auto';
       return { ...prev, themeMode: nextMode };
     });
  }, []);

  const handleManualSync = useCallback(() => {
    // ... (逻辑不变) ...
     performWebDAVSync(userSettings, records, drinks);
  }, [userSettings, records, drinks, performWebDAVSync]); // 添加 performWebDAVSync 作为依赖

  // --- 渲染 ---
  return (
    // 使用 HelmetProvider (已移至 main.jsx)
    // 使用语义化 div 和动态背景/文本颜色
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        effectiveTheme === 'dark' ? 'dark' : ''
      }`}
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >
      {/* --- SEO: 添加默认 Helmet 配置 --- */}
      <Helmet>
        <title>咖啡因追踪器 - 科学管理您的咖啡因摄入</title>
        <meta name="description" content="使用咖啡因追踪器科学管理您的每日咖啡因摄入量，获取代谢预测、健康建议和睡眠时间优化。" />
        {/* 添加 JSON-LD 结构化数据 */}
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
        {/* 可以添加其他全局 meta 标签，如 keywords (虽然其重要性已降低) */}
        <meta name="keywords" content="咖啡因, 追踪器, 计算器, 代谢, 睡眠, 健康, 咖啡, 茶" />
      </Helmet>

      {/* 使用 header 语义标签 */}
      <header className="max-w-md mx-auto px-4 pt-6 pb-2 text-center relative">
        <h1
          className="text-3xl font-bold flex justify-center items-center transition-colors"
          style={{ color: colors.espresso, marginTop: '4%' }}
        >
          <Coffee className="mr-2" size={30} aria-hidden="true" /> {/* 图标通常是装饰性的 */}
          咖啡因追踪器
        </h1>
        <p
          className="mt-1 transition-colors"
          style={{ color: colors.textSecondary }}
        >
          科学管理 · 健康生活
        </p>

        {/* Header Buttons Container */}
        <div className="absolute top-4 right-4 flex items-center space-x-2" style={{ marginTop: '5%' }}>
          {/* Sync Button */}
          {userSettings.webdavEnabled && (
            <button
              onClick={handleManualSync}
              disabled={syncStatus.inProgress}
              className={`p-2 rounded-full transition-all duration-300 ${
                syncStatus.inProgress ? 'animate-spin text-blue-500' : ''
              }`}
              style={{ color: colors.textSecondary }}
              aria-label="手动同步 WebDAV 数据" // SEO & A11y: 添加 aria-label
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleThemeMode}
            className="p-2 rounded-full transition-colors"
            style={{ color: colors.textSecondary }}
            aria-label={`切换主题模式 (当前: ${userSettings.themeMode})`} // SEO & A11y: 添加 aria-label
          >
            {userSettings.themeMode === 'auto' ? <Laptop size={20} /> :
             userSettings.themeMode === 'light' ? <Sun size={20} /> :
             <Moon size={20} />}
          </button>
        </div>

        {/* Sync Status Badge (保持不变) */}
        {showSyncBadge && (
           <div
             className={`absolute top-14 right-4 mt-1 py-1 px-2 rounded-full text-xs z-10 ${
               syncStatus.lastSyncResult?.success ? 'bg-green-100 text-green-700 border border-green-200' :
               syncStatus.lastSyncResult?.message === "WebDAV未配置" ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
               'bg-red-100 text-red-700 border border-red-200'
             } flex items-center shadow-sm`}
             style={{ marginTop: '5%' }}
           >
              {syncStatus.inProgress ? '同步中...' : syncStatus.lastSyncResult?.success ? '同步成功' : syncStatus.lastSyncResult?.message || '同步失败'}
           </div>
        )}
      </header>

      {/* 使用 main 语义标签包裹主要内容 */}
      <main className="max-w-md mx-auto px-4 pb-6">
        {/* 使用 nav 语义标签包裹导航 */}
        <nav
          className="rounded-xl mb-5 flex overflow-hidden shadow-md border transition-colors"
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.borderSubtle
          }}
          aria-label="主导航" // A11y: 为导航添加标签
        >
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${
              viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
            }`}
            style={viewMode === 'current'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent, ':hover': { backgroundColor: colors.accentHover } }
            }
            aria-current={viewMode === 'current' ? 'page' : undefined} // A11y: 指示当前页面
          >
            <TrendingUp size={16} className="mr-1.5" aria-hidden="true" /> 当前状态
          </button>
           <button
            onClick={() => setViewMode('stats')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${
              viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
            }`}
            style={viewMode === 'stats'
              ? { backgroundColor: colors.accent, borderColor: colors.borderSubtle }
              : { color: colors.accent, borderColor: colors.borderSubtle, ':hover': { backgroundColor: colors.accentHover } }
            }
             aria-current={viewMode === 'stats' ? 'page' : undefined} // A11y: 指示当前页面
          >
            <BarChart2 size={16} className="mr-1.5" aria-hidden="true" /> 数据统计
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
             aria-current={viewMode === 'settings' ? 'page' : undefined} // A11y: 指示当前页面
          >
            <Settings size={16} className="mr-1.5" aria-hidden="true" /> 设置
          </button>
        </nav>

        {/* --- 使用 Suspense 包裹懒加载的视图 --- */}
        <Suspense fallback={
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8" style={{ color: colors.accent }} />
            <span className="ml-2" style={{ color: colors.textSecondary }}>加载中...</span>
          </div>
        }>
          {/* 当前状态视图 */}
          {viewMode === 'current' && (
            <CurrentStatusView
              // TODO: 在 CurrentStatusView.jsx 内部添加 <Helmet> 来设置此视图特定的 title 和 description
              currentCaffeineAmount={currentCaffeineAmount}
              currentCaffeineConcentration={currentCaffeineConcentration}
              optimalSleepTime={optimalSleepTime}
              hoursUntilSafeSleep={hoursUntilSafeSleep}
              userStatus={userStatus}
              healthAdvice={healthAdvice}
              records={records}
              drinks={drinks}
              metabolismChartData={metabolismChartData}
              userSettings={userSettings}
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
              colors={colors}
            />
          )}

          {/* 统计视图 */}
          {viewMode === 'stats' && (
            <StatisticsView
              // TODO: 在 StatisticsView.jsx 内部添加 <Helmet> 来设置此视图特定的 title 和 description
              records={records}
              statsView={statsView}
              setStatsView={setStatsView}
              statsDate={statsDate}
              setStatsDate={setStatsDate}
              effectiveMaxDaily={effectiveMaxDaily}
              userSettings={userSettings}
              drinks={drinks}
              colors={colors}
            />
          )}

          {/* 设置视图 */}
          {viewMode === 'settings' && (
            <SettingsView
              // TODO: 在 SettingsView.jsx 内部添加 <Helmet> 来设置此视图特定的 title 和 description
              userSettings={userSettings}
              onUpdateSettings={handleUpdateSettings}
              drinks={drinks}
              setDrinks={setDrinks}
              originalPresetDrinkIds={originalPresetDrinkIds}
              onManualSync={handleManualSync}
              syncStatus={syncStatus}
              records={records}
              setRecords={setRecords}
              colors={colors}
            />
          )}
        </Suspense>

        {/* 使用 footer 语义标签 */}
        <footer className="mt-8 text-center text-xs transition-colors" style={{ color: colors.textMuted }}>
          {/* 开发模式指示器 (保持不变) */}
          {userSettings.develop === true && (
            <p className="mb-2 font-semibold text-orange-500 flex items-center justify-center">
              <Code size={14} className="mr-1" aria-hidden="true" /> 开发模式已启用
            </p>
          )}
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议基于科学模型估算，仅供参考，不能替代专业医疗意见。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} 咖啡因追踪器 App v1.0.1</p>
        </footer>
      </main> {/* 结束 main 标签 */}
    </div>
  );
};

export default CaffeineTracker;