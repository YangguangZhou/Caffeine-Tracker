// 导入 React 相关模块
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Coffee, Sun, Moon, RefreshCw, Code, Laptop, Loader2, TrendingUp, BarChart2, Settings as SettingsIcon, Info } from 'lucide-react'; // Renamed Settings to SettingsIcon
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
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
  const [drinks, setDrinks] = useState([]); // Initialize as empty, presets loaded in useEffect
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
  const [isNativePlatform, setIsNativePlatform] = useState(null); // Initialize to null
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // --- 检查平台类型 ---
  useEffect(() => {
    setIsNativePlatform(Capacitor.isNativePlatform());
  }, []);

  // --- 获取应用配置 (version.json) ---
  useEffect(() => {
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        setAppConfig(data);
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

  // 加载数据 - 仅当 isNativePlatform 确定后执行一次
  useEffect(() => {
    if (isNativePlatform === null) {
      return; // 等待平台类型确定
    }

    const loadData = async () => {
      try {
        // --- Capacitor/Storage to Preferences Migration (for native or if _cap_ keys exist) ---
        const capacitorMigrationCheck = await Preferences.get({ key: 'capacitor_storage_migration_complete' });
        if (!capacitorMigrationCheck.value) {
          const result = await Preferences.migrate();
          console.log('Capacitor Storage migration result:', result);
          if (result.migrated.length > 0 || result.existing.length > 0) {
            await Preferences.removeOld();
            console.log('Old Capacitor Storage keys removed after migration.');
          }
          await Preferences.set({ key: 'capacitor_storage_migration_complete', value: 'true' });
        }
        
        // --- Attempt to load from Preferences ---
        let settingsFromStore = null;
        let recordsFromStore = null;
        let drinksFromStore = null;

        const { value: savedSettingsJson } = await Preferences.get({ key: 'caffeineSettings' });
        if (savedSettingsJson) settingsFromStore = JSON.parse(savedSettingsJson);

        const { value: savedRecordsJson } = await Preferences.get({ key: 'caffeineRecords' });
        if (savedRecordsJson) recordsFromStore = JSON.parse(savedRecordsJson);

        const { value: savedDrinksJson } = await Preferences.get({ key: 'caffeineDrinks' });
        if (savedDrinksJson) drinksFromStore = JSON.parse(savedDrinksJson);

        // --- Web localStorage to Preferences Migration (for web platform if data not in Preferences) ---
        if (!isNativePlatform) {
          const webMigrationCheck = await Preferences.get({ key: 'web_localstorage_migration_complete' });
          if (!webMigrationCheck.value) {
            let migratedWebData = false;
            console.log("Web platform: Checking localStorage for legacy data...");

            if (!settingsFromStore) {
              const lsSettings = localStorage.getItem('caffeineSettings');
              if (lsSettings) {
                console.log("Found settings in localStorage, migrating...");
                settingsFromStore = JSON.parse(lsSettings);
                await Preferences.set({ key: 'caffeineSettings', value: lsSettings });
                migratedWebData = true;
              }
            }
            if (!recordsFromStore) {
              const lsRecords = localStorage.getItem('caffeineRecords');
              if (lsRecords) {
                console.log("Found records in localStorage, migrating...");
                recordsFromStore = JSON.parse(lsRecords);
                await Preferences.set({ key: 'caffeineRecords', value: lsRecords });
                migratedWebData = true;
              }
            }
            if (!drinksFromStore) {
              const lsDrinks = localStorage.getItem('caffeineDrinks');
              if (lsDrinks) {
                console.log("Found drinks in localStorage, migrating...");
                drinksFromStore = JSON.parse(lsDrinks);
                await Preferences.set({ key: 'caffeineDrinks', value: lsDrinks });
                migratedWebData = true;
              }
            }
            if (migratedWebData) {
              console.log("Web localStorage data migrated to Preferences. Removing from localStorage.");
              localStorage.removeItem('caffeineSettings');
              localStorage.removeItem('caffeineRecords');
              localStorage.removeItem('caffeineDrinks');
              // Also remove other potential old localStorage items if any
              localStorage.removeItem('lastSyncTimestamp'); // Example if it existed
            }
            await Preferences.set({ key: 'web_localstorage_migration_complete', value: 'true' });
          }
        }

        // --- Apply loaded data or defaults ---
        if (settingsFromStore) {
          // Ensure localLastModifiedTimestamp exists, initialize if not
          const newSettings = { 
            ...defaultSettings, 
            ...settingsFromStore,
            localLastModifiedTimestamp: settingsFromStore.localLastModifiedTimestamp || Date.now()
          };
          setUserSettings(newSettings);
        } else {
          setUserSettings({ ...defaultSettings, localLastModifiedTimestamp: Date.now() });
        }

        if (recordsFromStore) {
          setRecords(recordsFromStore);
        } else {
          setRecords([]);
        }

        if (drinksFromStore) {
          setDrinks(drinksFromStore);
        } else {
          setDrinks(initialPresetDrinks);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to defaults with a fresh localLastModifiedTimestamp
        setUserSettings({ ...defaultSettings, localLastModifiedTimestamp: Date.now() });
        setRecords([]);
        setDrinks(initialPresetDrinks);
      } finally {
        setInitialDataLoaded(true);
      }
    };

    loadData();
  }, [isNativePlatform]);

  // 当 records, userSettings, 或 drinks 变化时保存数据
  useEffect(() => {
    if (initialDataLoaded) {
      console.log("Data changed (records, userSettings, or drinks), saving...");
      saveData(records, userSettings, drinks, isNativePlatform);
    }
  }, [records, userSettings, drinks, initialDataLoaded, isNativePlatform]);

  // --- 计算当前状态 ---
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

  // --- 生成代谢图表数据 ---
  useEffect(() => {
    const chartData = generateMetabolismChartData(records, userSettings.caffeineHalfLifeHours);
    setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]);

  // --- Umami 和 Adsense 脚本管理 ---
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
  }, [userSettings.develop, isNativePlatform]); // 添加 isNativePlatform

  // --- 计算今日总摄入量 ---
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
  const performWebDAVSync = useCallback(async (settingsToUse, currentRecords, currentDrinks) => {
    if (!settingsToUse.webdavEnabled || !settingsToUse.webdavServer || !settingsToUse.webdavUsername || !settingsToUse.webdavPassword) {
      console.log("WebDAV 未启用或配置不完整，跳过同步。");
      setSyncStatus(prev => ({ ...prev, lastSyncResult: "WebDAV 未启用或配置不完整" }));
      return { success: false, message: "WebDAV 未启用或配置不完整", data: null, timestamp: null };
    }

    setSyncStatus({ inProgress: true, lastSyncTime: null, lastSyncResult: '正在同步...' });
    setShowSyncBadge(true);

    let client;
    try {
      const WebDAVClientModule = await import('./utils/webdavSync');
      client = new WebDAVClientModule.default(
        settingsToUse.webdavServer,
        settingsToUse.webdavUsername,
        settingsToUse.webdavPassword
      );
    } catch (error) {
      console.error("加载 WebDAVClient 失败:", error);
      setSyncStatus({ inProgress: false, lastSyncTime: Date.now(), lastSyncResult: `加载 WebDAV 客户端失败: ${error.message}` });
      setShowSyncBadge(false);
      return { success: false, message: `加载 WebDAV 客户端失败: ${error.message}`, data: null, timestamp: null };
    }

    const localData = {
      records: currentRecords,
      drinks: currentDrinks,
      userSettings: settingsToUse, // Pass the complete userSettings
      syncTimestamp: settingsToUse.lastSyncTimestamp || 0, // Use existing sync timestamp from settings
      appVersion: appConfig.latest_version || 'unknown' // Include app version
    };

    try {
      const result = await client.performSync(localData);
      console.log("WebDAV 同步结果:", result);

      if (result.success) {
        if (result.data) {
          // If data was merged or downloaded, update local state
          setRecords(result.data.records || []);
          setDrinks(result.data.drinks || []);
          // Preserve local webdavPassword, and other sensitive or non-synced settings
          const updatedSettings = {
            ...result.data.userSettings,
            webdavPassword: settingsToUse.webdavPassword, // Always keep local password
            lastSyncTimestamp: result.timestamp, // Update with the new sync timestamp from merged data
            localDataLastModified: result.timestamp // Also update localDataLastModified
          };
          setUserSettings(updatedSettings);
          console.log("本地数据已使用同步数据更新。新时间戳:", result.timestamp);
        }
        setSyncStatus({ inProgress: false, lastSyncTime: Date.now(), lastSyncResult: result.message });
      } else {
        setSyncStatus({ inProgress: false, lastSyncTime: Date.now(), lastSyncResult: `同步失败: ${result.message}` });
      }
      setShowSyncBadge(false);
      return result;
    } catch (error) {
      console.error("WebDAV 同步期间出错:", error);
      setSyncStatus({ inProgress: false, lastSyncTime: Date.now(), lastSyncResult: `同步错误: ${error.message}` });
      setShowSyncBadge(false);
      return { success: false, message: `同步错误: ${error.message}`, data: null, timestamp: null };
    }
  }, [appConfig.latest_version, isNativePlatform]); // Removed setRecords, setDrinks, setUserSettings as direct dependencies

  // --- SplashScreen 隐藏逻辑 ---
  useEffect(() => {
    if (isNativePlatform && initialDataLoaded) { // 确保数据加载完毕后再隐藏
      SplashScreen.hide();
    }
  }, [isNativePlatform, initialDataLoaded]); // 依赖 initialDataLoaded

  // --- 定时同步 ---
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
  }, [userSettings.webdavEnabled, userSettings.webdavSyncFrequency, userSettings.lastSyncTimestamp, records, drinks, performWebDAVSync, initialDataLoaded]); // 添加 initialDataLoaded

  // --- 事件处理程序 ---
  const handleAddRecord = useCallback(async (record) => {
    const newRecord = { ...record, id: uuidv4(), timestamp: Date.now() }; // Add creation and modification timestamp
    setRecords(prevRecords => [newRecord, ...prevRecords]);
    setUserSettings(prevSettings => ({ ...prevSettings, localDataLastModified: Date.now() }));
  }, []);

  const handleEditRecord = useCallback(async (updatedRecord) => {
    const newTimestamp = Date.now();
    setRecords(prevRecords =>
      prevRecords.map(r => (r.id === updatedRecord.id ? { ...updatedRecord, timestamp: newTimestamp } : r))
    );
    setUserSettings(prevSettings => ({ ...prevSettings, localDataLastModified: newTimestamp }));
  }, []);

  const handleDeleteRecord = useCallback(async (id) => {
    setRecords(prevRecords => prevRecords.filter(r => r.id !== id));
    setUserSettings(prevSettings => ({ ...prevSettings, localDataLastModified: Date.now() }));
  }, []);

  const handleUpdateSettings = useCallback(async (newSettings) => {
    // If newSettings is a function, it's an updater function
    if (typeof newSettings === 'function') {
        setUserSettings(prevSettings => {
            const updated = newSettings(prevSettings);
            return { ...updated, localDataLastModified: Date.now() };
        });
    } else {
        setUserSettings(prevSettings => ({ 
            ...prevSettings, 
            ...newSettings, 
            localDataLastModified: Date.now() 
        }));
    }
  }, []);

  // Need to handle setDrinks to also update localLastModifiedTimestamp
  // This is tricky because setDrinks is passed down.
  // A wrapper function or direct update in SettingsView after setDrinks could work.
  // For now, the main save effect will catch changes to `drinks` and `userSettings`
  // and the `localLastModifiedTimestamp` on `userSettings` should be up-to-date
  // if `handleUpdateSettings` is used for all direct setting changes.
  // When `drinks` array is changed by `setDrinks` directly, the `saveData` useEffect
  // will run. At that point, `userSettings.localLastModifiedTimestamp` might be stale
  // if only `drinks` changed.

  // Let's create a new callback for updating drinks that also updates the timestamp.
  const handleSetDrinks = useCallback((newDrinksOrUpdater) => {
    setDrinks(currentDrinks => {
      const updatedDrinks = typeof newDrinksOrUpdater === 'function' ? newDrinksOrUpdater(currentDrinks) : newDrinksOrUpdater;
      // Ensure all drinks have a lastModified timestamp
      return updatedDrinks.map(drink => ({...drink, lastModified: drink.lastModified || Date.now() }));
    });
    setUserSettings(prevSettings => ({ ...prevSettings, localDataLastModified: Date.now() }));
  }, []);

  // --- 渲染 ---
  return (
    // 使用语义化 div 和动态背景/文本颜色
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${effectiveTheme === 'dark' ? 'dark' : ''
        }`}
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >

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
              setDrinks={handleSetDrinks}
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
          <p className="mt-1">咖啡因追踪器 App v{appConfig.latest_version}</p>
          <p className="mt-1">
            Copyright &copy; {new Date().getFullYear()} <a href="https://jerryz.com.cn" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: colors.accent }}>Jerry Zhou</a>. All Rights Reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CaffeineTracker;