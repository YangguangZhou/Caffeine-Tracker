// 导入 React 相关模块
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Coffee, Sun, Moon, RefreshCw, Code, Laptop, Loader2, TrendingUp, BarChart2, Settings as SettingsIcon, Info } from 'lucide-react'; // Renamed Settings to SettingsIcon
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'; // 导入 StatusBar
import { SplashScreen } from '@capacitor/splash-screen';

// 导入工具函数
import { getTotalCaffeineAtTime, estimateConcentration, estimateAmountFromConcentration, calculateHoursToReachTarget, generateMetabolismChartData } from './utils/caffeineCalculations';
import { getStartOfDay, getEndOfDay, isToday, formatTime, formatDate } from './utils/timeUtils';
// 导入常量和预设
import { defaultSettings, initialPresetDrinks, originalPresetDrinkIds, COFFEE_COLORS, NIGHT_COLORS } from './utils/constants';
// 导入WebDAV客户端
import WebDAVClient from './utils/webdavSync';

// --- 使用 React.lazy 动态导入视图组件 ---
const CurrentStatusView = lazy(() => import('./views/CurrentStatusView'));
const StatisticsView = lazy(() => import('./views/StatisticsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const AboutView = lazy(() => import('./views/AboutView'));

const UMAMI_SCRIPT_ID = 'umami-analytics-script';
const ADSENSE_SCRIPT_ID = 'google-adsense-script';
const UMAMI_SRC = "https://umami.jerryz.com.cn/script.js";
const UMAMI_WEBSITE_ID = "81f97aba-b11b-44f1-890a-9dc588a0d34d";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2597042766299857";
const ADSENSE_CLIENT = "ca-pub-2597042766299857";

const schemaData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "咖啡因追踪器",
  "description": "科学追踪和管理您的每日咖啡因摄入量，提供代谢预测和健康建议。",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web Browser",
  "browserRequirements": "Requires JavaScript. Modern browsers recommended.",
  "url": "https://ct.jerryz.com.cn", // Will be dynamic if appConfig is used for canonical URL
  "image": "https://ct.jerryz.com.cn/og-image.png", // General OG image
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "CNY"
  },
  "author": {
    "@type": "Person",
    "name": "Jerry Zhou",
    "url": "https://jerryz.com.cn"
  }
};


/**
 * 应用主组件
 */
const CaffeineTracker = () => {
  // --- 状态变量 ---
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
  const [appConfig, setAppConfig] = useState({ latest_version: "loading...", download_url: "#" });
  const [isNativePlatform, setIsNativePlatform] = useState(false);


  // --- 获取应用配置 (version.json) 和检查平台 ---
  useEffect(() => {
    setIsNativePlatform(Capacitor.isNativePlatform());

    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        setAppConfig(data);
        // 更新 schemaData 中的版本信息 (如果需要)
        // schemaData.version = data.latest_version; // Example
      })
      .catch(error => console.error('Error fetching version.json:', error));
  }, []);


  // --- 主题和颜色 ---
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
    
    // 无论是原生平台还是Web平台，都监听系统主题变化
    mediaQuery.addEventListener('change', updateEffectiveTheme);
    
    return () => {
      mediaQuery.removeEventListener('change', updateEffectiveTheme);
    };
  }, [userSettings.themeMode]);

  // --- Capacitor 状态栏设置 ---
  useEffect(() => {
    if (isNativePlatform) {
      const setStatusBar = async () => {
        try {
          await StatusBar.show();
          await StatusBar.setOverlaysWebView({ overlay: true }); // 内容显示在透明状态栏下

          if (effectiveTheme === 'dark') {
            await StatusBar.setStyle({ style: StatusBarStyle.Dark });
          } else {
            await StatusBar.setStyle({ style: StatusBarStyle.Light });
          }
        } catch (error) {
          console.error("Failed to set status bar style:", error);
        }
      };

      setStatusBar();

      // iOS only: statusTap event listener
      if (Capacitor.getPlatform() === 'ios') {
        const statusTapListener = window.addEventListener('statusTap', function () {
          console.log('statusbar tapped');
          // 您可以在此处添加滚动到顶部的逻辑
        });
        return () => {
          window.removeEventListener('statusTap', statusTapListener);
        };
      }
    }
  }, [effectiveTheme, isNativePlatform]);


  const colors = useMemo(() =>
    effectiveTheme === 'dark' ? NIGHT_COLORS : COFFEE_COLORS,
    [effectiveTheme]
  );

  // 加载数据
  useEffect(() => {
    let loadedRecords = [];
    let loadedSettings = { ...defaultSettings };
    let loadedDrinks = [];

    const processLoadedDrinks = (drinksToProcess) => {
      if (!Array.isArray(drinksToProcess)) return [...initialPresetDrinks];
      const validDrinks = drinksToProcess.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string' && typeof d.caffeineContent === 'number');
      const savedDrinkIds = new Set(validDrinks.map(d => d.id));
      const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));
      const validatedSavedDrinks = validDrinks.map(d => {
        const isOriginalPreset = originalPresetDrinkIds.has(d.id);
        const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : {};
        return { ...d, category: d.category || (isOriginalPreset ? originalPresetData.category : '其他'), isPreset: d.isPreset ?? isOriginalPreset, defaultVolume: d.defaultVolume !== undefined ? d.defaultVolume : (originalPresetData?.defaultVolume ?? null) };
      });
      return [...validatedSavedDrinks, ...newPresetsToAdd].sort((a, b) => a.name.localeCompare(b.name));
    };

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
              if (typeof parsedSettings[key] === typeof defaultSettings[key] || key === 'develop') { // Allow develop to be loaded even if type differs initially
                if (key === 'develop' && typeof parsedSettings[key] !== 'boolean') {
                  mergedSettings[key] = defaultSettings[key]; // Fallback for develop if not boolean
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
      } else if (isNativePlatform) { // Default to light for native on first load
        loadedSettings.themeMode = 'light';
      }

      // 加载饮品
      const savedDrinks = localStorage.getItem('caffeineDrinks');
      if (savedDrinks) {
        const parsedDrinks = JSON.parse(savedDrinks);
        loadedDrinks = processLoadedDrinks(parsedDrinks);
      } else {
        loadedDrinks = [...initialPresetDrinks];
      }

    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      loadedRecords = [];
      loadedSettings = { ...defaultSettings };
      // 移除这行代码，让原生平台默认使用 auto 模式
      // if (isNativePlatform) loadedSettings.themeMode = 'light';
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
  }, [isNativePlatform]); // Add isNativePlatform dependency

  useEffect(() => {
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

  useEffect(() => {
    const chartData = generateMetabolismChartData(records, userSettings.caffeineHalfLifeHours);
    setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]);

  useEffect(() => {
    if (records.length > 0 || localStorage.getItem('caffeineRecords') !== null) {
      try {
        localStorage.setItem('caffeineRecords', JSON.stringify(records));
      } catch (error) {
        console.error('Error saving records to localStorage:', error);
      }
    }
  }, [records]);
  useEffect(() => {
    try {
      const settingsToSave = { ...userSettings };
      localStorage.setItem('caffeineSettings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [userSettings]);
  useEffect(() => {
    if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
      try {
        const drinksToSave = drinks.map(({ id, name, caffeineContent, defaultVolume, category, isPreset }) => ({ id, name, caffeineContent, defaultVolume, category, isPreset }));
        localStorage.setItem('caffeineDrinks', JSON.stringify(drinksToSave));
      } catch (error) {
        console.error('Error saving drinks list to localStorage:', error);
      }
    }
  }, [drinks]);

  useEffect(() => {
    const isDomainLocal = () => {
      if (isNativePlatform) return false;
      const hostname = window.location.hostname;
      return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.test') ||
        hostname.endsWith('.localhost');
    };

    const isDevelopMode = userSettings.develop === true || isDomainLocal();
    console.log(`开发模式状态: ${isDevelopMode}，域名: ${window.location.hostname}`);
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
  const getTodayTotal = useCallback(() => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    return Math.round(records.filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd).reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  const personalizedRecommendation = useMemo(() => {
    const { weight, recommendedDosePerKg } = userSettings;
    if (weight > 0 && recommendedDosePerKg > 0) return Math.round(weight * recommendedDosePerKg);
    return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  const effectiveMaxDaily = useMemo(() => {
    const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (personalizedRecommendation !== null) return Math.min(generalMax, personalizedRecommendation);
    return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  const userStatus = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    const maxDaily = effectiveMaxDaily;
    if (currentRounded < maxDaily * 0.1) return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
    if (currentRounded < maxDaily * 0.5) return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
    if (currentRounded < maxDaily) return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-amber-500` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const maxDaily = effectiveMaxDaily;
    const currentRounded = Math.round(currentCaffeineAmount);

    if (dailyTotal > maxDaily) {
      return {
        advice: `您今日的咖啡因摄入量 (${dailyTotal}mg) 已超过您的个性化或通用上限 (${maxDaily}mg)，建议减少摄入。`,
        type: 'danger'
      };
    }
    if (currentRounded > 100 && new Date().getHours() >= 16) {
      return {
        advice: '下午体内咖啡因含量较高可能影响睡眠，建议限制晚间摄入。',
        type: 'warning'
      };
    }
    return {
      advice: '您的咖啡因摄入量处于健康范围内，继续保持良好习惯。',
      type: 'success'
    };
  }, [getTodayTotal, effectiveMaxDaily, currentCaffeineAmount]);

  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = effectiveMaxDaily;
    if (maxDailyCaffeineForProgress <= 0) return 0;
    return Math.min(Math.max(0, (currentCaffeineAmount / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- WebDAV同步 ---
  const performWebDAVSync = useCallback(async (settings, currentRecords, currentDrinks) => {
    if (!settings.webdavEnabled || !settings.webdavServer || !settings.webdavUsername || !settings.webdavPassword) {
      console.log("WebDAV sync not configured or disabled");
      setSyncStatus(prev => ({ ...prev, inProgress: false, lastSyncResult: { success: false, message: "WebDAV未配置" } }));
      setShowSyncBadge(true); setTimeout(() => setShowSyncBadge(false), 3000); return;
    }
    setSyncStatus(prev => ({ ...prev, inProgress: true })); setShowSyncBadge(true);
    try {
      const webdavClient = new WebDAVClient(settings.webdavServer, settings.webdavUsername, settings.webdavPassword);
      const localData = {
        records: currentRecords,
        drinks: currentDrinks,
        userSettings: { ...settings, webdavPassword: '' }, // Don't sync password to server
        version: appConfig.latest_version // Use app version from state
      };
      const result = await webdavClient.performSync(localData, initialPresetDrinks, originalPresetDrinkIds); // Pass presets for merge logic if needed there
      if (result.success) {
        let updatedSettings = { ...settings }; // Start with current local settings
        if (result.data) {
          const processSyncedDrinks = (drinksToProcess) => {
            if (!Array.isArray(drinksToProcess)) return [...initialPresetDrinks];
            const validDrinks = drinksToProcess.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string' && typeof d.caffeineContent === 'number');
            const savedDrinkIds = new Set(validDrinks.map(d => d.id));
            const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));
            const validatedSavedDrinks = validDrinks.map(d => {
              const isOriginalPreset = originalPresetDrinkIds.has(d.id);
              const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : {};
              return { ...d, category: d.category || (isOriginalPreset ? originalPresetData.category : '其他'), isPreset: d.isPreset ?? isOriginalPreset, defaultVolume: d.defaultVolume !== undefined ? d.defaultVolume : (originalPresetData?.defaultVolume ?? null) };
            });
            return [...validatedSavedDrinks, ...newPresetsToAdd].sort((a, b) => a.name.localeCompare(b.name));
          };

          if (result.data.records && Array.isArray(result.data.records)) {
            setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
          }
          if (result.data.drinks && Array.isArray(result.data.drinks)) {
            setDrinks(processSyncedDrinks(result.data.drinks));
          }
          if (result.data.userSettings) {
            const syncedDevelop = result.data.userSettings.develop;
            // Merge synced settings over local, but keep local password
            updatedSettings = {
              ...settings, // base
              ...result.data.userSettings, // synced settings
              webdavPassword: settings.webdavPassword, // IMPORTANT: retain local password
              develop: typeof syncedDevelop === 'boolean' ? syncedDevelop : settings.develop
            };
            if (isNativePlatform && updatedSettings.themeMode === 'auto') {
              updatedSettings.themeMode = 'light'; // Ensure native doesn't go to auto
            }
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
  }, [appConfig.latest_version, isNativePlatform]); 

  // 添加 SplashScreen 隐藏逻辑
  useEffect(() => {
    // 只在原生平台上处理启动屏幕
    if (isNativePlatform) {
      // 确保所有必要的数据都已加载和应用
      if (records.length >= 0 && drinks.length >= 0 && Object.keys(userSettings).length > 0 && effectiveTheme) {
        // 添加一个短暂延迟，确保UI已经完全渲染
        const timer = setTimeout(() => {
          console.log('页面加载完成，隐藏启动屏幕');
          SplashScreen.hide().catch(err => console.error('隐藏启动屏幕时出错:', err));
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isNativePlatform, records, drinks, userSettings, effectiveTheme]);

  // 定时同步
  useEffect(() => {
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


  // --- 事件处理程序 ---
  const handleAddRecord = useCallback((record) => {
    const newRecord = { ...record };
    // Ensure volume is saved, even if null
    if (!newRecord.hasOwnProperty('volume')) {
      newRecord.volume = null;
    } else if (newRecord.volume === '') {
      newRecord.volume = null;
    } else {
      newRecord.volume = parseFloat(newRecord.volume);
    }
    setRecords(prevRecords => [...prevRecords, newRecord].sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleEditRecord = useCallback((updatedRecord) => {
    const newRecord = { ...updatedRecord };
    if (!newRecord.hasOwnProperty('volume')) {
      newRecord.volume = null;
    } else if (newRecord.volume === '') {
      newRecord.volume = null;
    } else {
      newRecord.volume = parseFloat(newRecord.volume);
    }
    setRecords(prevRecords => prevRecords.map(record => record.id === newRecord.id ? newRecord : record).sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const handleDeleteRecord = useCallback((id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setRecords(prevRecords => prevRecords.filter(record => record.id !== id));
    }
  }, []);

  const handleUpdateSettings = useCallback((newSettings) => {
    if (newSettings.hasOwnProperty('develop') && typeof newSettings.develop !== 'boolean') {
      console.warn("尝试更新 'develop' 设置为非布尔值，已阻止。");
      delete newSettings.develop;
    }
    setUserSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }, []);

  const toggleThemeMode = useCallback(() => {
    setUserSettings(prev => {
      let nextMode;
      // 修改切换主题逻辑，让原生平台也支持三种模式
      if (prev.themeMode === 'auto') nextMode = 'light';
      else if (prev.themeMode === 'light') nextMode = 'dark';
      else nextMode = 'auto';
      return { ...prev, themeMode: nextMode };
    });
  }, []);

  const handleManualSync = useCallback(() => {
    performWebDAVSync(userSettings, records, drinks);
  }, [userSettings, records, drinks, performWebDAVSync]); // 添加 performWebDAVSync 作为依赖

  // --- 渲染 ---
  return (
    // 使用 HelmetProvider (已移至 main.jsx)
    // 使用语义化 div 和动态背景/文本颜色
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${effectiveTheme === 'dark' ? 'dark' : ''
        }`}
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >
      {/* --- SEO: 添加默认 Helmet 配置 --- */}
      <Helmet>
        <title>咖啡因追踪器 - 科学管理您的咖啡因摄入</title>
        <meta name="description" content="使用咖啡因追踪器科学管理您的每日咖啡因摄入量，获取代谢预测、健康建议和睡眠时间优化。" />
        <script type="application/ld+json">
          {JSON.stringify({ ...schemaData, url: window.location.origin, image: `${window.location.origin}/og-image.png` })}
        </script>
        <meta name="keywords" content="咖啡因, 追踪器, 计算器, 代谢, 睡眠, 健康, 咖啡, 茶" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ct.jerryz.com.cn" />
        <meta name="author" content="Jerry Zhou" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="咖啡因追踪器 - 科学管理您的咖啡因摄入" />
        <meta property="og:description" content="使用咖啡因追踪器科学管理您的每日咖啡因摄入量，获取代谢预测、健康建议和睡眠时间优化。" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:image" content={`${window.location.origin}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="咖啡因追踪器 - 科学管理您的咖啡因摄入" />
        <meta name="twitter:description" content="使用咖啡因追踪器科学管理您的每日咖啡因摄入量，获取代谢预测、健康建议和睡眠时间优化。" />
        <meta name="twitter:image" content="https://ct.jerryz.com.cn/og-image.png" />
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
              className={`p-2 rounded-full transition-all duration-300 ${syncStatus.inProgress ? 'animate-spin text-blue-500' : ''
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

        {showSyncBadge && (
          <div
            className={`absolute top-14 right-4 mt-1 py-1 px-2 rounded-full text-xs z-10 ${syncStatus.lastSyncResult?.success ? 'bg-green-100 text-green-700 border border-green-200' :
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
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
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
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
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
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${viewMode === 'settings' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'settings'
              ? { backgroundColor: colors.accent, borderColor: colors.borderSubtle }
              : { color: colors.accent, borderColor: colors.borderSubtle, ':hover': { backgroundColor: colors.accentHover } }
            }
            aria-current={viewMode === 'settings' ? 'page' : undefined} // A11y: 指示当前页面
          >
            <SettingsIcon size={16} className="mr-1.5" aria-hidden="true" /> 设置
          </button>
          <button
            onClick={() => setViewMode('about')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'about' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'about'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent, ':hover': { backgroundColor: colors.accentHover } }
            }
            aria-current={viewMode === 'about' ? 'page' : undefined} // A11y: 指示当前页面
          >
            <Info size={16} className="mr-1.5" aria-hidden="true" /> 关于
          </button>
        </nav>

        {/* --- 视图渲染 (使用 Suspense 包裹懒加载组件) --- */}
        <Suspense fallback={
          <div className="flex justify-center items-center py-10">
            <Loader2 size={32} className="animate-spin" style={{ color: colors.accent }} />
            <p className="ml-3 text-lg" style={{ color: colors.textSecondary }}>加载中...</p>
          </div>
        }>
          {viewMode === 'current' && (
            <CurrentStatusView
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

          {viewMode === 'stats' && (
            <StatisticsView
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

          {viewMode === 'settings' && (
            <SettingsView
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
              appConfig={appConfig} // Pass appConfig
              isNativePlatform={isNativePlatform} // Pass platform info
            />
          )}

          {viewMode === 'about' && (
            <AboutView
              colors={colors}
              appConfig={appConfig} // Pass appConfig
              isNativePlatform={isNativePlatform} // Pass platform info
            />
          )}
        </Suspense>

        {/* 使用 footer 语义标签 */}
        <footer className="mt-8 text-center text-xs transition-colors" style={{ color: colors.textMuted }}>
          {userSettings.develop === true && (
            <p className="mb-2 font-semibold text-orange-500 flex items-center justify-center">
              <Code size={14} className="mr-1" aria-hidden="true" /> 开发模式已启用
            </p>
          )}
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议基于科学模型估算，仅供参考，不能替代专业医疗意见。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} 咖啡因追踪器 App v{appConfig.latest_version}</p>
          <p className="mt-1">
            Copyright &copy; 2025 <a href="https://jerryz.com.cn" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: colors.accent }}>Jerry Zhou</a>. All Rights Reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CaffeineTracker;