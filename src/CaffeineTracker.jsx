// 导入 React 相关模块
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Coffee, Sun, Moon, RefreshCw, Code, Laptop, Loader2, TrendingUp, BarChart2, Settings as SettingsIcon, Info } from 'lucide-react';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

// 导入工具函数
import { getTotalCaffeineAtTime, estimateConcentration, estimateAmountFromConcentration, calculateHoursToReachTarget, generateMetabolismChartData } from './utils/caffeineCalculations';
import { getStartOfDay, getEndOfDay, isToday, formatTime, formatDate } from './utils/timeUtils';
// 导入常量和预设
import { defaultSettings, initialPresetDrinks, originalPresetDrinkIds, COFFEE_COLORS, NIGHT_COLORS, DRINK_CATEGORIES, DEFAULT_CATEGORY } from './utils/constants';
// 导入WebDAV客户端
import WebDAVClient from './utils/webdavSync';

// 懒加载视图组件
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
  // 状态变量
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [effectiveTheme, setEffectiveTheme] = useState('light');
  const [records, setRecords] = useState([]);
  const [currentCaffeineAmount, setCurrentCaffeineAmount] = useState(0);
  const [currentCaffeineConcentration, setCurrentCaffeineConcentration] = useState(0);
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
  const [isNativePlatform, setIsNativePlatform] = useState(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [webdavConfigured, setWebdavConfigured] = useState(false);

  // 检查平台类型
  useEffect(() => {
    setIsNativePlatform(Capacitor.isNativePlatform());
  }, []);

  // 获取应用配置
  useEffect(() => {
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        setAppConfig(data);
      })
      .catch(error => console.error('Error fetching version.json:', error));
  }, []);

  // 主题和颜色处理
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

    return () => {
      mediaQuery.removeEventListener('change', updateEffectiveTheme);
    };
  }, [userSettings.themeMode]);

  // Capacitor 状态栏设置
  useEffect(() => {
    if (isNativePlatform) {
      const setStatusBar = async () => {
        try {
          await StatusBar.show();
          await StatusBar.setOverlaysWebView({ overlay: true });

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

      // iOS 状态栏点击监听
      if (Capacitor.getPlatform() === 'ios') {
        const statusTapListener = window.addEventListener('statusTap', function () {
          console.log('statusbar tapped');
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

  // 数据加载
  useEffect(() => {
    if (isNativePlatform === null) {
      return;
    }

    const loadData = async () => {
      try {
        // Capacitor Storage 迁移检查
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

        // 从 Preferences 加载数据
        let settingsFromStore = null;
        let recordsFromStore = null;
        let drinksFromStore = null;
        let persistedPassword = null;

        const { value: savedSettingsJson } = await Preferences.get({ key: 'caffeineSettings' });
        if (savedSettingsJson) settingsFromStore = JSON.parse(savedSettingsJson);

        const { value: savedRecordsJson } = await Preferences.get({ key: 'caffeineRecords' });
        if (savedRecordsJson) recordsFromStore = JSON.parse(savedRecordsJson);

        const { value: savedDrinksJson } = await Preferences.get({ key: 'caffeineDrinks' });
        if (savedDrinksJson) drinksFromStore = JSON.parse(savedDrinksJson);

        const { value: webdavPasswordFromPrefs } = await Preferences.get({ key: 'webdavPassword' });
        if (webdavPasswordFromPrefs) {
          persistedPassword = webdavPasswordFromPrefs;
        }

        // Web localStorage 迁移
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
              localStorage.removeItem('lastSyncTimestamp');
            }
            await Preferences.set({ key: 'web_localstorage_migration_complete', value: 'true' });
          }
        }

        // 应用加载的数据
        if (settingsFromStore) {
          const finalPassword = settingsFromStore.webdavPassword || persistedPassword || null;
          const newSettings = {
            ...defaultSettings,
            ...settingsFromStore,
            webdavPassword: finalPassword,
            localLastModifiedTimestamp: settingsFromStore.localLastModifiedTimestamp || Date.now()
          };
          setUserSettings(newSettings);
        } else {
          setUserSettings({ ...defaultSettings, webdavPassword: persistedPassword, localLastModifiedTimestamp: Date.now() });
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
        setUserSettings({ ...defaultSettings, localLastModifiedTimestamp: Date.now() });
        setRecords([]);
        setDrinks(initialPresetDrinks);
      } finally {
        setInitialDataLoaded(true);
      }
    };

    loadData();
  }, [isNativePlatform]);

  // 保存数据到 Preferences
  useEffect(() => {
    if (!initialDataLoaded) {
      return;
    }

    const saveData = async () => {
      try {
        const settingsToPersist = { ...userSettings };
        delete settingsToPersist.webdavPassword;
        await Preferences.set({ key: 'caffeineSettings', value: JSON.stringify(settingsToPersist) });
        await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(records) });
        await Preferences.set({ key: 'caffeineDrinks', value: JSON.stringify(drinks) });

      } catch (error) {
        console.error('Error saving data to Preferences:', error);
      }
    };

    saveData();
  }, [records, userSettings, drinks, initialDataLoaded]);

  // 计算当前状态
  useEffect(() => {
    const calculateCurrentStatus = () => {
      const now = Date.now();
      const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;
      const totalAmount = getTotalCaffeineAtTime(records, now, caffeineHalfLifeHours);
      setCurrentCaffeineAmount(totalAmount);
      const concentration = estimateConcentration(totalAmount, weight, volumeOfDistribution);
      setCurrentCaffeineConcentration(concentration ?? 0);
    };
    calculateCurrentStatus();
    const timer = setInterval(calculateCurrentStatus, 60000);
    return () => clearInterval(timer);
  }, [records, userSettings]);

  // 生成代谢图表数据
  useEffect(() => {
    const chartData = generateMetabolismChartData(records, userSettings.caffeineHalfLifeHours);
    setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]);

  // 脚本管理（统计和广告）
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
  }, [userSettings.develop, isNativePlatform]);

  // 计算今日总摄入量
  const getTodayTotal = useCallback(() => {
    const today = new Date();
    const todayStartTime = getStartOfDay(today); // Returns a number
    const todayEndTime = getEndOfDay(today);     // Returns a number

    if (typeof todayStartTime !== 'number' || isNaN(todayStartTime) || 
        typeof todayEndTime !== 'number' || isNaN(todayEndTime)) {
      console.warn("Failed to get valid start/end of day for getTodayTotal calculation.");
      return 0;
    }
    // todayStartTime and todayEndTime are already timestamps
    return Math.round(records.filter(record => record && record.timestamp >= todayStartTime && record.timestamp <= todayEndTime).reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // WebDAV同步功能
  const performWebDAVSync = useCallback(async (settingsToUse, currentRecords, currentDrinks) => {
    console.log("=== performWebDAVSync 被调用 ===");

    if (!initialDataLoaded) {
      console.log("初始数据未加载完成，跳过WebDAV同步");
      return;
    }

    if (!settingsToUse.webdavEnabled) {
      console.log("WebDAV同步已禁用");
      setSyncStatus(prev => ({
        ...prev,
        inProgress: false,
        lastSyncResult: { success: false, message: "WebDAV同步已禁用" }
      }));
      return;
    }

    if (!settingsToUse.webdavServer || !settingsToUse.webdavUsername || !settingsToUse.webdavPassword) {
      console.error("WebDAV配置不完整");
      setSyncStatus(prev => ({
        ...prev,
        inProgress: false,
        lastSyncResult: { success: false, message: "WebDAV配置不完整" }
      }));
      setShowSyncBadge(true);
      setTimeout(() => setShowSyncBadge(false), 3000);
      return;
    }

    setSyncStatus(prev => ({ ...prev, inProgress: true }));
    setShowSyncBadge(true);

    try {
      const webdavClient = new WebDAVClient(
        settingsToUse.webdavServer,
        settingsToUse.webdavUsername,
        settingsToUse.webdavPassword
      );

      const localData = {
        records: currentRecords,
        drinks: currentDrinks,
        userSettings: { ...settingsToUse, webdavPassword: '' },
        syncTimestamp: settingsToUse.localLastModifiedTimestamp || Date.now(),
        version: appConfig.latest_version
      };

      const result = await webdavClient.performSync(localData, initialPresetDrinks, originalPresetDrinkIds);

      if (result.success) {
        let updatedSettings = { ...settingsToUse };
        if (result.data) {
          const processSyncedDrinks = (drinksToProcess) => {
            if (!Array.isArray(drinksToProcess)) return [...initialPresetDrinks];
            const validDrinks = drinksToProcess.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string');
            const savedDrinkIds = new Set(validDrinks.map(d => d.id));
            const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));

            const validatedSavedDrinks = validDrinks.map(d => {
              const isOriginalPreset = originalPresetDrinkIds.has(d.id);
              const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : {};

              const mode = d.calculationMode || originalPresetData?.calculationMode || 'per100ml';
              let cc = null;
              let cpg = null;

              if (mode === 'perGram') {
                cpg = (d.caffeinePerGram !== undefined && d.caffeinePerGram !== null) ? d.caffeinePerGram : (originalPresetData?.caffeinePerGram ?? 0);
              } else {
                cc = (d.caffeineContent !== undefined && d.caffeineContent !== null) ? d.caffeineContent : (originalPresetData?.caffeineContent ?? 0);
              }

              return {
                ...d,
                category: d.category || (isOriginalPreset ? originalPresetData.category : DEFAULT_CATEGORY),
                isPreset: d.isPreset ?? isOriginalPreset,
                defaultVolume: d.defaultVolume !== undefined ? d.defaultVolume : (originalPresetData?.defaultVolume ?? null),
                calculationMode: mode,
                caffeineContent: cc,
                caffeinePerGram: cpg
              };
            });
            return [...validatedSavedDrinks, ...newPresetsToAdd].sort((a, b) => a.name.localeCompare(b.name));
          };

          if (result.data.records && Array.isArray(result.data.records)) {
            console.log(`更新记录: ${result.data.records.length} 条`);
            setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
          }
          if (result.data.drinks && Array.isArray(result.data.drinks)) {
            console.log(`更新饮品: ${result.data.drinks.length} 种`);
            setDrinks(processSyncedDrinks(result.data.drinks));
          }
          if (result.data.userSettings) {
            const syncedDevelop = result.data.userSettings.develop;
            updatedSettings = {
              ...settingsToUse,
              ...result.data.userSettings,
              webdavPassword: settingsToUse.webdavPassword,
              develop: typeof syncedDevelop === 'boolean' ? syncedDevelop : settingsToUse.develop,
            };
            if (isNativePlatform && updatedSettings.themeMode === 'auto') {
              updatedSettings.themeMode = 'light';
            }
            console.log("同步后更新设置完成");
          }
        }
        updatedSettings.lastSyncTimestamp = result.timestamp;
        setUserSettings(updatedSettings);
        setSyncStatus({
          inProgress: false,
          lastSyncTime: new Date(result.timestamp),
          lastSyncResult: { success: true, message: result.message }
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("WebDAV同步过程中发生错误:", {
        message: error.message,
        platform: isNativePlatform ? 'native' : 'web'
      });
      setSyncStatus({
        inProgress: false,
        lastSyncTime: new Date(),
        lastSyncResult: {
          success: false,
          message: error.message || "同步时发生未知错误"
        }
      });
    } finally {
      setTimeout(() => { setShowSyncBadge(false); }, 5000);
      console.log("=== performWebDAVSync 完成 ===");
    }
  }, [appConfig.latest_version, isNativePlatform, initialDataLoaded]);

  // 隐藏启动画面
  useEffect(() => {
    if (isNativePlatform && initialDataLoaded) {
      SplashScreen.hide();
    }
  }, [isNativePlatform, initialDataLoaded]);

  // 定时同步
  useEffect(() => {
    let syncTimer = null;
    let dailyCheckTimeout = null;
    const clearTimers = () => {
      if (syncTimer) clearInterval(syncTimer);
      if (dailyCheckTimeout) clearTimeout(dailyCheckTimeout);
    };

    if (initialDataLoaded && userSettings.webdavEnabled && userSettings.webdavServer && userSettings.webdavUsername && userSettings.webdavPassword) {
      if (userSettings.webdavSyncFrequency === 'startup') {
        const startupSyncAttempted = sessionStorage.getItem('startupSyncAttempted');
        if (!startupSyncAttempted && !syncStatus.inProgress) {
          console.log("启动时同步条件满足，尝试同步。");
          sessionStorage.setItem('startupSyncAttempted', 'true');
          performWebDAVSync(userSettings, records, drinks);
        }
      } else if (userSettings.webdavSyncFrequency === 'hourly') {
        syncTimer = setInterval(() => {
          if (!syncStatus.inProgress) {
            performWebDAVSync(userSettings, records, drinks);
          }
        }, 3600000);
      } else if (userSettings.webdavSyncFrequency === 'daily') {
        const checkDailySync = () => {
          const lastSync = userSettings.lastSyncTimestamp ? new Date(userSettings.lastSyncTimestamp) : null;
          if (!lastSync || !isToday(lastSync)) {
            if (!syncStatus.inProgress) {
              performWebDAVSync(userSettings, records, drinks);
            }
          }
          dailyCheckTimeout = setTimeout(checkDailySync, 3600000);
        };
        checkDailySync();
      }
    }
    return () => clearTimers();
  }, [
    initialDataLoaded,
    userSettings.webdavEnabled,
    userSettings.webdavSyncFrequency,
    userSettings.lastSyncTimestamp,
    userSettings.webdavServer,
    userSettings.webdavUsername,
    userSettings.webdavPassword,
    records,
    drinks,
    performWebDAVSync,
    syncStatus.inProgress
  ]);

  // 事件处理
  const handleAddRecord = useCallback(async (record) => {
    const newTimestamp = Date.now();
    setRecords(prevRecords => {
      const newRecord = { ...record, id: record.id || `record_${newTimestamp}`, updatedAt: newTimestamp };
      const newRecords = [...prevRecords, newRecord].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return newRecords;
    });
    setUserSettings(prev => ({ ...prev, localLastModifiedTimestamp: newTimestamp }));
  }, []);

  const handleEditRecord = useCallback(async (updatedRecord) => {
    const newTimestamp = Date.now();
    setRecords(prevRecords => {
      const newRecords = prevRecords.map(r => r.id === updatedRecord.id ? { ...updatedRecord, updatedAt: newTimestamp } : r)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return newRecords;
    });
    setUserSettings(prev => ({ ...prev, localLastModifiedTimestamp: newTimestamp }));
  }, []);

  const handleDeleteRecord = useCallback(async (id) => {
    const newTimestamp = Date.now();
    setRecords(prevRecords => {
      const newRecords = prevRecords.filter(r => r.id !== id);
      return newRecords;
    });
    setUserSettings(prev => ({ ...prev, localLastModifiedTimestamp: newTimestamp }));
  }, []);

  const handleUpdateSettings = useCallback(async (keyOrSettingsObject, value) => {
    setUserSettings(prevSettings => {
      let newSettings = {};
      if (typeof keyOrSettingsObject === 'string') {
        newSettings = {
          ...prevSettings,
          [keyOrSettingsObject]: value,
        };
      } else if (typeof keyOrSettingsObject === 'object' && keyOrSettingsObject !== null) {
        newSettings = {
          ...prevSettings,
          ...keyOrSettingsObject,
        };
      } else {
        console.warn("Invalid call to handleUpdateSettings", keyOrSettingsObject, value);
        return prevSettings;
      }

      if (!newSettings.hasOwnProperty('localLastModifiedTimestamp') || typeof keyOrSettingsObject === 'string') {
        newSettings.localLastModifiedTimestamp = Date.now();
      }

      return newSettings;
    });
  }, []);

  const handleSetDrinks = useCallback((newDrinksOrUpdater) => {
    setDrinks(newDrinksOrUpdater);
    setUserSettings(prev => ({ ...prev, localLastModifiedTimestamp: Date.now() }));
  }, []);

  const toggleThemeMode = useCallback(() => {
    setUserSettings(prev => {
      let nextMode;
      if (prev.themeMode === 'auto') nextMode = 'light';
      else if (prev.themeMode === 'light') nextMode = 'dark';
      else nextMode = 'auto';
      return { ...prev, themeMode: nextMode };
    });
  }, []);

  const handleManualSync = useCallback(() => {
    console.log("=== 手动同步被触发 ===");
    performWebDAVSync(userSettings, records, drinks);
  }, [userSettings, records, drinks, performWebDAVSync]);

  // 监听WebDAV配置状态
  useEffect(() => {
    const configured = userSettings.webdavEnabled &&
      userSettings.webdavServer &&
      userSettings.webdavUsername &&
      userSettings.webdavPassword;
    setWebdavConfigured(configured);
  }, [userSettings.webdavEnabled, userSettings.webdavServer, userSettings.webdavUsername, userSettings.webdavPassword]);

  // 渲染
  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${effectiveTheme === 'dark' ? 'dark' : ''}`}
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >
      <header className="max-w-md mx-auto px-4 pt-6 pb-2 text-center relative">
        <h1
          className="text-3xl font-bold flex justify-center items-center transition-colors"
          style={{ color: colors.espresso, marginTop: '4%' }}
        >
          <Coffee className="mr-2" size={30} aria-hidden="true" />
          咖啡因追踪器
        </h1>
        <p
          className="mt-1 transition-colors"
          style={{ color: colors.textSecondary }}
        >
          科学管理 · 健康生活
        </p>

        {/* 头部按钮 */}
        <div className="absolute top-4 right-4 flex items-center space-x-2" style={{ marginTop: '5%' }}>
          {/* 同步按钮 */}
          {userSettings.webdavEnabled && (
            <button
              onClick={handleManualSync}
              disabled={!webdavConfigured || syncStatus.inProgress}
              className={`p-2 rounded-full transition-all duration-300 ${syncStatus.inProgress ? 'animate-spin text-blue-500' : ''
                } ${!webdavConfigured ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'
                }`}
              style={{ color: colors.textSecondary }}
              aria-label="手动同步 WebDAV 数据"
              title={!webdavConfigured ? 'WebDAV配置不完整' : '手动同步'}
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* 主题切换按钮 */}
          <button
            onClick={toggleThemeMode}
            className="p-2 rounded-full transition-colors"
            style={{ color: colors.textSecondary }}
            aria-label={`切换主题模式 (当前: ${userSettings.themeMode})`}
          >
            {userSettings.themeMode === 'auto' ? <Laptop size={20} /> :
              userSettings.themeMode === 'light' ? <Sun size={20} /> :
                <Moon size={20} />}
          </button>
        </div>

        {/* 同步状态显示 */}
        {showSyncBadge && (
          <div
            className={`absolute top-14 right-4 mt-1 py-1 px-2 rounded-full text-xs z-10 ${syncStatus.lastSyncResult?.success
                ? 'bg-green-100 text-green-700 border border-green-200' :
                syncStatus.lastSyncResult?.message?.includes("配置") || syncStatus.lastSyncResult?.message?.includes("禁用")
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                  'bg-red-100 text-red-700 border border-red-200'
              } flex items-center shadow-sm`}
            style={{ marginTop: '5%' }}
          >
            {syncStatus.inProgress ? '同步中...' :
              syncStatus.lastSyncResult?.success ? '同步成功' :
                syncStatus.lastSyncResult?.message || '同步失败'}
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 pb-6">
        {/* 导航 */}
        <nav
          className="rounded-xl mb-5 flex overflow-hidden shadow-md border transition-colors"
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.borderSubtle
          }}
          aria-label="主导航"
        >
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'current'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent, ':hover': { backgroundColor: colors.accentHover } }
            }
            aria-current={viewMode === 'current' ? 'page' : undefined}
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
            aria-current={viewMode === 'stats' ? 'page' : undefined}
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
            aria-current={viewMode === 'settings' ? 'page' : undefined}
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
            aria-current={viewMode === 'about' ? 'page' : undefined}
          >
            <Info size={16} className="mr-1.5" aria-hidden="true" /> 关于
          </button>
        </nav>

        {/* 视图渲染 */}
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
              records={records}
              drinks={drinks}
              metabolismChartData={metabolismChartData}
              userSettings={userSettings}
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
              appConfig={appConfig}
              isNativePlatform={isNativePlatform}
            />
          )}

          {viewMode === 'about' && (
            <AboutView
              colors={colors}
              appConfig={appConfig}
              isNativePlatform={isNativePlatform}
            />
          )}
        </Suspense>

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