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
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // Gatekeeper for saving


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
        // 尝试迁移旧的 @capacitor/storage 数据 (如果存在)
        // 这应该只在应用首次从旧版本升级到使用 @capacitor/preferences 时运行一次
        // 你可能需要一个标志来确保它只运行一次，例如检查 Preferences 中是否已存在一个特定的 "migration_complete" 标志
        const migrationCheck = await Preferences.get({ key: 'capacitor_storage_migration_complete' });
        if (!migrationCheck.value) {
          const result = await Preferences.migrate();
          console.log('Capacitor Storage migration result:', result);
          if (result.migrated.length > 0 || result.existing.length > 0) {
            await Preferences.removeOld(); // 清理旧的 _cap_ 前缀的键
            console.log('Old Capacitor Storage keys removed after migration.');
          }
          await Preferences.set({ key: 'capacitor_storage_migration_complete', value: 'true' });
        }
        
        const { value: savedSettings } = await Preferences.get({ key: 'caffeineSettings' });
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setUserSettings(prev => ({ ...defaultSettings, ...prev, ...parsedSettings }));
        } else {
          setUserSettings(defaultSettings);
        }

        const { value: savedRecords } = await Preferences.get({ key: 'caffeineRecords' });
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords));
        } else {
          setRecords([]); // 确保是空数组
        }

        const { value: savedDrinks } = await Preferences.get({ key: 'caffeineDrinks' });
        if (savedDrinks) {
          setDrinks(JSON.parse(savedDrinks));
        } else {
          setDrinks(initialPresetDrinks); // 加载预设饮品
        }
      } catch (error) {
        console.error('Error loading data from Preferences:', error);
        // 如果加载失败，回退到默认值
        setUserSettings(defaultSettings);
        setRecords([]);
        setDrinks(initialPresetDrinks);
      } finally {
        setInitialDataLoaded(true); // 标记初始数据加载完成
      }
    };

    loadData();
  }, [isNativePlatform]); // 依赖 isNativePlatform (确保只在平台确定后运行)

  // 当 records, userSettings, 或 drinks 变化时保存数据
  useEffect(() => {
    if (!initialDataLoaded) {
      return; // 只有在初始数据加载完成后才保存
    }

    const saveData = async () => {
      try {
        // 保存用户设置 (确保不保存密码)
        const settingsToSave = { ...userSettings };
        delete settingsToSave.webdavPassword;
        await Preferences.set({ key: 'caffeineSettings', value: JSON.stringify(settingsToSave) });

        // 保存记录
        await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(records) });
        
        // 保存饮品列表
        await Preferences.set({ key: 'caffeineDrinks', value: JSON.stringify(drinks) });

      } catch (error) {
        console.error('Error saving data to Preferences:', error);
      }
    };
    
    saveData();
  }, [records, userSettings, drinks, initialDataLoaded]); // 添加 initialDataLoaded 作为依赖

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
      console.log("WebDAV sync not configured or disabled");
      setSyncStatus(prev => ({ ...prev, inProgress: false, lastSyncResult: { success: false, message: "WebDAV未配置" } }));
      setShowSyncBadge(true); setTimeout(() => setShowSyncBadge(false), 3000); return;
    }
    setSyncStatus(prev => ({ ...prev, inProgress: true })); setShowSyncBadge(true);
    try {
      const webdavClient = new WebDAVClient(settingsToUse.webdavServer, settingsToUse.webdavUsername, settingsToUse.webdavPassword);
      const localData = {
        records: currentRecords,
        drinks: currentDrinks,
        userSettings: { ...settingsToUse, webdavPassword: '' }, // Don't sync password to server
        version: appConfig.latest_version // Use app version from state
      };
      const result = await webdavClient.performSync(localData, initialPresetDrinks, originalPresetDrinkIds); // Pass presets for merge logic if needed there
      if (result.success) {
        let updatedSettings = { ...settingsToUse }; // Start with current local settings
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
              } else { // per100ml
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
            setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
          }
          if (result.data.drinks && Array.isArray(result.data.drinks)) {
            setDrinks(processSyncedDrinks(result.data.drinks));
          }
          if (result.data.userSettings) {
            const syncedDevelop = result.data.userSettings.develop;
            // Merge synced settings over local, but keep local password
            updatedSettings = {
              ...settingsToUse, // base
              ...result.data.userSettings, // synced settings
              webdavPassword: settingsToUse.webdavPassword, // IMPORTANT: retain local password
              develop: typeof syncedDevelop === 'boolean' ? syncedDevelop : settingsToUse.develop
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
  }, [appConfig.latest_version, isNativePlatform]); // 添加 isNativePlatform

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
  const handleAddRecord = useCallback(async (record) => { // Added async
    setRecords(prevRecords => {
      const newRecords = [...prevRecords, record].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      // await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(newRecords) }); // 保存移至useEffect
      return newRecords;
    });
  }, []);

  const handleEditRecord = useCallback(async (updatedRecord) => { // Added async
    setRecords(prevRecords => {
      const newRecords = prevRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      // await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(newRecords) }); // 保存移至useEffect
      return newRecords;
    });
  }, []);

  const handleDeleteRecord = useCallback(async (id) => { // Added async
    setRecords(prevRecords => {
      const newRecords = prevRecords.filter(r => r.id !== id);
      // await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(newRecords) }); // 保存移至useEffect
      return newRecords;
    });
  }, []);

  const handleUpdateSettings = useCallback(async (newSettings) => { // Added async
    setUserSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      // const settingsToSave = { ...updatedSettings };
      // delete settingsToSave.webdavPassword;
      // await Preferences.set({ key: 'caffeineSettings', value: JSON.stringify(settingsToSave) }); // 保存移至useEffect
      return updatedSettings;
    });
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
  }, [userSettings, records, drinks, performWebDAVSync, initialDataLoaded]); // 添加 initialDataLoaded
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