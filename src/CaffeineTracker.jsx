// 导入 React 相关模块
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Coffee, Sun, Moon, RefreshCw, Code, Laptop, Loader2, TrendingUp, BarChart2, Settings as SettingsIcon, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { getDBValue, setDBValue, exportDatabase, importDatabase } from './utils/db';

// 导入工具函数
import { getTotalCaffeineAtTime, estimateConcentration, estimateAmountFromConcentration, calculateHoursToReachTarget, generateMetabolismChartData } from './utils/caffeineCalculations';
import { getStartOfDay, getEndOfDay, isToday, formatTime, formatDate } from './utils/timeUtils';
// 导入常量和预设
import { defaultSettings, initialPresetDrinks, originalPresetDrinkIds, COFFEE_COLORS, NIGHT_COLORS, DRINK_CATEGORIES, DEFAULT_CATEGORY, ensureDrinkColors } from './utils/constants';
// 导入WebDAV客户端
import WebDAVClient from './utils/webdavSync';
// 导入错误弹窗组件
import SyncErrorModal from './components/SyncErrorModal';

// 懒加载视图组件
const CurrentStatusView = lazy(() => import('./views/CurrentStatusView'));
const StatisticsView = lazy(() => import('./views/StatisticsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const AboutView = lazy(() => import('./views/AboutView'));
const SyncImportView = lazy(() => import('./views/SyncImportView'));

const UMAMI_SCRIPT_ID = 'umami-analytics-script';
const ADSENSE_SCRIPT_ID = 'google-adsense-script';
const UMAMI_SRC = "https://umami.jerryz.com.cn/script.js";
const UMAMI_WEBSITE_ID = "81f97aba-b11b-44f1-890a-9dc588a0d34d";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2597042766299857";
const ADSENSE_CLIENT = "ca-pub-2597042766299857";

const compareVersions = (v1, v2) => {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

const presetDrinkLookup = new Map(initialPresetDrinks.map(drink => [drink.id, drink]));

const sanitizeDrinkList = (drinkList) => {
  if (!Array.isArray(drinkList) || drinkList.length === 0) {
    return [...initialPresetDrinks];
  }

  const normalized = drinkList
    .filter(Boolean)
    .map((drink) => {
      const isOriginalPreset = drink.id ? originalPresetDrinkIds.has(drink.id) : false;
      const basePreset = isOriginalPreset ? presetDrinkLookup.get(drink.id) : null;
      const category = drink.category || basePreset?.category || DEFAULT_CATEGORY;
      const calculationMode = drink.calculationMode === 'perGram' ? 'perGram' : 'per100ml';

      return {
        ...drink,
        category,
        calculationMode,
        isPreset: drink.isPreset ?? isOriginalPreset,
      };
    });

  return ensureDrinkColors(normalized);
};

/**
 * 应用主组件
 */
const CaffeineTracker = () => {
  return (
    <Router basename="/">
      <CaffeineTrackerApp />
    </Router>
  );
};

/**
 * 应用核心组件（包含路由逻辑）
 */
const CaffeineTrackerApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 状态变量
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [effectiveTheme, setEffectiveTheme] = useState('light');
  const [records, setRecords] = useState([]);
  const [currentCaffeineAmount, setCurrentCaffeineAmount] = useState(0);
  const [currentCaffeineConcentration, setCurrentCaffeineConcentration] = useState(0);
  const [drinks, setDrinks] = useState([]);
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
  const [syncError, setSyncError] = useState(null); // 同步错误弹窗
  const [updateInfo, setUpdateInfo] = useState({ available: false, forced: false, downloadUrl: '', latestVersion: '' });

  // 根据当前路径确定视图模式
  const viewMode = useMemo(() => {
    const path = location.pathname;
    if (path === '/statistics') return 'stats';
    if (path === '/settings') return 'settings';
    if (path === '/about') return 'about';
    return 'current'; // 默认为当前状态
  }, [location.pathname]);

  // 检查平台类型
  useEffect(() => {
    setIsNativePlatform(Capacitor.isNativePlatform());
  }, []);

  // 获取应用配置和版本检查
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // 1. 获取本地配置 (当前版本)
        const localResponse = await fetch('/version.json');
        const localData = await localResponse.json();
        setAppConfig(localData);

        if (isNativePlatform) {
          // 2. 获取远程配置 (最新版本)
          const remoteResponse = await fetch('https://ct.jerryz.com.cn/version.json?_=' + new Date().getTime());
          const remoteData = await remoteResponse.json();

          const current = localData.latest_version;
          const latest = remoteData.latest_version;
          const min = remoteData.min_version || '0.0.0';

          if (compareVersions(current, min) < 0) {
            setUpdateInfo({ available: true, forced: true, downloadUrl: remoteData.download_url, latestVersion: latest });
          } else if (compareVersions(current, latest) < 0) {
            setUpdateInfo({ available: true, forced: false, downloadUrl: remoteData.download_url, latestVersion: latest });
          }
        }
      } catch (error) {
        console.error('Error fetching version info:', error);
      }
    };

    if (isNativePlatform !== null) {
      checkVersion();
    }
  }, [isNativePlatform]);

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

  // 更新 theme-color meta 标签和 body 背景色
  useEffect(() => {
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.bgBase);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = colors.bgBase;
      document.head.appendChild(meta);
    }
    
    // 更新 body 背景色
    document.body.style.backgroundColor = colors.bgBase;
  }, [colors.bgBase]);

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

        // 尝试从 DB 加载数据
        let settingsFromStore = await getDBValue('caffeineSettings');
        let recordsFromStore = await getDBValue('caffeineRecords');
        let drinksFromStore = await getDBValue('caffeineDrinks');
        let persistedPassword = await getDBValue('webdavPassword');

        // 如果 DB 中没有数据，尝试从 Preferences 加载 (Legacy) 并迁移到 DB
        if (!settingsFromStore) {
          const { value } = await Preferences.get({ key: 'caffeineSettings' });
          if (value) {
            settingsFromStore = JSON.parse(value);
            await setDBValue('caffeineSettings', settingsFromStore);
          }
        }

        if (!recordsFromStore) {
          const { value } = await Preferences.get({ key: 'caffeineRecords' });
          if (value) {
            recordsFromStore = JSON.parse(value);
            await setDBValue('caffeineRecords', recordsFromStore);
          }
        }

        if (!drinksFromStore) {
          const { value } = await Preferences.get({ key: 'caffeineDrinks' });
          if (value) {
            drinksFromStore = JSON.parse(value);
            await setDBValue('caffeineDrinks', drinksFromStore);
          }
        }

        if (!persistedPassword) {
          const { value } = await Preferences.get({ key: 'webdavPassword' });
          if (value) {
            persistedPassword = value;
            await setDBValue('webdavPassword', persistedPassword);
          }
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
                await setDBValue('caffeineSettings', settingsFromStore); // Save to DB
                await Preferences.set({ key: 'caffeineSettings', value: lsSettings }); // Keep sync
                migratedWebData = true;
              }
            }
            if (!recordsFromStore) {
              const lsRecords = localStorage.getItem('caffeineRecords');
              if (lsRecords) {
                console.log("Found records in localStorage, migrating...");
                recordsFromStore = JSON.parse(lsRecords);
                await setDBValue('caffeineRecords', recordsFromStore); // Save to DB
                await Preferences.set({ key: 'caffeineRecords', value: lsRecords }); // Keep sync
                migratedWebData = true;
              }
            }
            if (!drinksFromStore) {
              const lsDrinks = localStorage.getItem('caffeineDrinks');
              if (lsDrinks) {
                console.log("Found drinks in localStorage, migrating...");
                drinksFromStore = JSON.parse(lsDrinks);
                await setDBValue('caffeineDrinks', drinksFromStore); // Save to DB
                await Preferences.set({ key: 'caffeineDrinks', value: lsDrinks }); // Keep sync
                migratedWebData = true;
              }
            }
            if (migratedWebData) {
              console.log("Web localStorage data migrated to DB and Preferences. Removing from localStorage.");
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
          const { themeMode, ...sanitizedSettings } = settingsFromStore;
          const finalPassword = settingsFromStore.webdavPassword || persistedPassword || null;
          const newSettings = {
            ...defaultSettings,
            ...sanitizedSettings,
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
          setDrinks(sanitizeDrinkList(drinksFromStore));
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
        delete settingsToPersist.themeMode;
        
        // Save to DB
        await setDBValue('caffeineSettings', settingsToPersist);
        await setDBValue('caffeineRecords', records);
        await setDBValue('caffeineDrinks', drinks);

        // Save to Preferences (Backup/Legacy)
        await Preferences.set({ key: 'caffeineSettings', value: JSON.stringify(settingsToPersist) });
        await Preferences.set({ key: 'caffeineRecords', value: JSON.stringify(records) });
        await Preferences.set({ key: 'caffeineDrinks', value: JSON.stringify(drinks) });

      } catch (error) {
        console.error('Error saving data:', error);
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

  // 计算有效每日最大摄入量
  const effectiveMaxDaily = useMemo(() => {
    const { weight, recommendedDosePerKg, maxDailyCaffeine } = userSettings;
    const generalMax = maxDailyCaffeine > 0 ? maxDailyCaffeine : 400;

    // 计算个性化推荐摄入量
    if (weight > 0 && recommendedDosePerKg > 0) {
      const personalizedRecommendation = Math.round(weight * recommendedDosePerKg);
      return Math.min(generalMax, personalizedRecommendation);
    }

    return generalMax;
  }, [userSettings.weight, userSettings.recommendedDosePerKg, userSettings.maxDailyCaffeine]);

  // WebDAV同步功能
  const performWebDAVSync = useCallback(async (settingsToUse, currentRecords, currentDrinks) => {
    console.log("=== performWebDAVSync 被调用 ===");

    if (!initialDataLoaded) {
      console.log("初始数据未加载完成，跳过WebDAV同步");
      return { success: false, message: "初始数据未加载完成" };
    }

    if (!settingsToUse.webdavEnabled) {
      console.log("WebDAV同步已禁用");
      setSyncStatus(prev => ({
        ...prev,
        inProgress: false,
        lastSyncResult: { success: false, message: "WebDAV同步已禁用" }
      }));
      return { success: false, message: "WebDAV同步已禁用" };
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
      throw new Error("WebDAV配置不完整");
    }

    setSyncStatus(prev => ({ ...prev, inProgress: true }));
    setShowSyncBadge(true);

    try {
      const webdavClient = new WebDAVClient(
        settingsToUse.webdavServer,
        settingsToUse.webdavUsername,
        settingsToUse.webdavPassword
      );

      // 使用数据库导出作为本地数据源，确保包含所有数据
      const dbData = await exportDatabase();
      const localData = {
        ...dbData,
        // 确保包含运行时状态中的最新记录和饮品（虽然通常DB已同步，但为了保险）
        records: currentRecords,
        drinks: currentDrinks,
        userSettings: { ...settingsToUse }, // 不再清除密码，因为用户要求导出所有内容
        syncTimestamp: settingsToUse.localLastModifiedTimestamp || Date.now(),
        version: appConfig.latest_version
      };

      const result = await webdavClient.performSync(localData, initialPresetDrinks, originalPresetDrinkIds);

      if (result.success) {
        let updatedSettings = { ...settingsToUse };
        if (result.data) {
          const processSyncedDrinks = (drinksToProcess) => {
            if (!Array.isArray(drinksToProcess)) return sanitizeDrinkList(initialPresetDrinks);
            const validDrinks = drinksToProcess.filter(d => d && typeof d.id !== 'undefined' && typeof d.name === 'string');
            const savedDrinkIds = new Set(validDrinks.map(d => d.id));
            const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));

            const validatedSavedDrinks = validDrinks.map(d => {
              const isOriginalPreset = originalPresetDrinkIds.has(d.id);
              const originalPresetData = isOriginalPreset ? initialPresetDrinks.find(p => p.id === d.id) : null;
              const resolvedIsPreset = d.isPreset ?? isOriginalPreset;

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
                category: d.category || (isOriginalPreset ? originalPresetData?.category : DEFAULT_CATEGORY),
                isPreset: resolvedIsPreset,
                defaultVolume: d.defaultVolume !== undefined ? d.defaultVolume : (originalPresetData?.defaultVolume ?? null),
                calculationMode: mode,
                caffeineContent: cc,
                caffeinePerGram: cpg,
                iconColor: d.iconColor ?? originalPresetData?.iconColor ?? null,
              };
            });
            const merged = [...validatedSavedDrinks, ...newPresetsToAdd];
            const sorted = merged.sort((a, b) => a.name.localeCompare(b.name));
            return ensureDrinkColors(sorted);
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
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message || "同步失败");
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
      
      // 显示错误弹窗（仅在自动同步或顶部手动同步时）
      setSyncError(error.message || "同步时发生未知错误");
      
      throw error; // 重新抛出错误以便调用者捕获
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
      const normalizedTimestamp = typeof record.timestamp === 'number'
        ? record.timestamp
        : new Date(record.timestamp || Date.now()).getTime();
      const recordId = record.id || `record_${newTimestamp}`;
      const newRecord = {
        ...record,
        id: recordId,
        timestamp: normalizedTimestamp,
        updatedAt: newTimestamp
      };
      const newRecords = [...prevRecords, newRecord]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return newRecords;
    });
    setUserSettings(prev => ({ ...prev, localLastModifiedTimestamp: newTimestamp }));
  }, []);

  const handleEditRecord = useCallback(async (updatedRecord) => {
    const newTimestamp = Date.now();
    setRecords(prevRecords => {
      const fallbackId = updatedRecord?.id || `record_${newTimestamp}`;
      let found = false;

      const updatedList = prevRecords.map(record => {
        if (record.id === fallbackId) {
          found = true;
          return { ...updatedRecord, id: fallbackId, updatedAt: newTimestamp };
        }
        return record;
      });

      if (!found) {
        updatedList.push({ ...updatedRecord, id: fallbackId, updatedAt: newTimestamp });
      }

      return updatedList
        .map(entry => ({
          ...entry,
          timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : new Date(entry.timestamp || Date.now()).getTime(),
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
    setDrinks(prev => {
      const nextDrinks = typeof newDrinksOrUpdater === 'function'
        ? newDrinksOrUpdater(prev)
        : newDrinksOrUpdater;
      return sanitizeDrinkList(nextDrinks);
    });
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
    performWebDAVSync(userSettings, records, drinks).catch(err => {
      // 错误已在 performWebDAVSync 中处理，这里不需要额外处理
      console.log("同步失败，错误弹窗已显示");
    });
  }, [userSettings, records, drinks, performWebDAVSync]);

  // 处理导入WebDAV配置
  const handleImportConfig = useCallback(async (config) => {
    console.log("=== 导入WebDAV配置 ===");
    
    try {
      // 更新WebDAV配置
      const newSettings = {
        ...userSettings,
        webdavEnabled: true,
        webdavServer: config.server,
        webdavUsername: config.username,
        webdavPassword: config.password,
        webdavSyncFrequency: userSettings.webdavSyncFrequency || 'manual'
      };
      
      // 保存密码到Preferences
      await setDBValue('webdavPassword', config.password);
      await Preferences.set({ key: 'webdavPassword', value: config.password });
      
      // 更新设置
      setUserSettings(newSettings);
      
      // 立即执行同步,从服务器下载数据并覆盖本地
      console.log("开始从服务器同步数据...");
      const syncResult = await performWebDAVSync(newSettings, records, drinks);
      
      if (!syncResult || !syncResult.success) {
        // 如果同步失败，抛出错误
        throw new Error(syncResult?.message || "同步失败，请检查网络连接和WebDAV配置");
      }
      
      console.log("配置导入和同步完成");
    } catch (error) {
      console.error("导入配置或同步失败:", error);
      // 重新抛出错误，让UI层显示具体错误信息
      throw new Error(error.message || "导入配置失败，请稍后重试");
    }
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
      <header className="max-w-md mx-auto px-4 pt-[env(safe-area-inset-top)] pb-2 text-center relative">
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
        <div className="absolute top-[env(safe-area-inset-top)] right-4 flex items-center space-x-2" style={{ marginTop: '5%' }}>
          {/* 同步按钮 */}
          {userSettings.webdavEnabled && (
            <button
              onClick={handleManualSync}
              disabled={!webdavConfigured || syncStatus.inProgress}
              className={`p-2 rounded-full transition-all duration-300 ${
                syncStatus.inProgress 
                  ? 'animate-spin' 
                  : ''
                } ${
                !webdavConfigured 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-opacity-10'
                }`}
              style={{ 
                color: syncStatus.inProgress ? colors.accent : colors.textSecondary,
                backgroundColor: !webdavConfigured || syncStatus.inProgress ? 'transparent' : undefined
              }}
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
          <button
            onClick={() => {
              if (syncStatus.lastSyncResult && !syncStatus.lastSyncResult.success && !syncStatus.inProgress) {
                alert(`同步失败\n\n原因: ${syncStatus.lastSyncResult.message}\n\n建议:\n1. 检查网络连接\n2. 验证WebDAV配置\n3. 使用Android APP获得更好的兼容性\n4. 联系技术支持: i@jerryz.com.cn`);
              }
            }}
            className={`absolute top-[env(safe-area-inset-top)] right-4 mt-1 py-1 px-3 rounded-full text-xs font-medium z-10 flex items-center shadow-sm transition-all duration-200 border ${
              syncStatus.inProgress 
                ? 'cursor-default' 
                : !syncStatus.lastSyncResult?.success 
                  ? 'cursor-pointer hover:shadow-md' 
                  : 'cursor-default'
            }`}
            style={{
              marginTop: '5%',
              backgroundColor: syncStatus.inProgress 
                ? colors.infoBg 
                : syncStatus.lastSyncResult?.success 
                  ? 'transparent'  // 成功时透明背景
                  : colors.dangerBg,
              borderColor: syncStatus.inProgress 
                ? colors.info 
                : syncStatus.lastSyncResult?.success 
                  ? colors.safe  // 成功时绿色边框
                  : colors.danger,
              color: syncStatus.inProgress 
                ? colors.infoText 
                : syncStatus.lastSyncResult?.success 
                  ? colors.safe  // 成功时绿色文字
                  : colors.dangerText
            }}
            disabled={syncStatus.inProgress || syncStatus.lastSyncResult?.success}
            aria-label={syncStatus.inProgress ? '同步中' : syncStatus.lastSyncResult?.success ? '同步成功' : '同步失败，点击查看详情'}
          >
            {syncStatus.inProgress ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1.5"></span>
                同步中
              </>
            ) : syncStatus.lastSyncResult?.success ? (
              <>
                <CheckCircle2 size={16} className="mr-1.5" />
                成功
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="mr-1.5" />
                失败
              </>
            )}
          </button>
        )}
      </header>

      <main className="w-full max-w-screen-xl mx-auto px-4 pb-6">
        {/* 导航 */}
        <nav
          className="max-w-md mx-auto rounded-xl mb-5 flex overflow-hidden shadow-md border transition-colors"
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.borderSubtle
          }}
          aria-label="主导航"
        >
          <Link
            to="/"
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'current'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent }
            }
            aria-current={viewMode === 'current' ? 'page' : undefined}
          >
            <TrendingUp size={16} className="mr-1.5" aria-hidden="true" /> 当前状态
          </Link>
          <Link
            to="/statistics"
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'stats'
              ? { backgroundColor: colors.accent, borderColor: colors.borderSubtle }
              : { color: colors.accent, borderColor: colors.borderSubtle }
            }
            aria-current={viewMode === 'stats' ? 'page' : undefined}
          >
            <BarChart2 size={16} className="mr-1.5" aria-hidden="true" /> 数据统计
          </Link>
          <Link
            to="/settings"
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${viewMode === 'settings' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'settings'
              ? { backgroundColor: colors.accent, borderColor: colors.borderSubtle }
              : { color: colors.accent, borderColor: colors.borderSubtle }
            }
            aria-current={viewMode === 'settings' ? 'page' : undefined}
          >
            <SettingsIcon size={16} className="mr-1.5" aria-hidden="true" /> 设置
          </Link>
          <Link
            to="/about"
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${viewMode === 'about' ? 'text-white shadow-inner' : 'hover:bg-opacity-10'
              }`}
            style={viewMode === 'about'
              ? { backgroundColor: colors.accent }
              : { color: colors.accent }
            }
            aria-current={viewMode === 'about' ? 'page' : undefined}
          >
            <Info size={16} className="mr-1.5" aria-hidden="true" /> 关于
          </Link>
        </nav>

        {/* 视图渲染 */}
        <Suspense fallback={
          <div className="flex justify-center items-center py-10">
            <Loader2 size={32} className="animate-spin" style={{ color: colors.accent }} />
            <p className="ml-3 text-lg" style={{ color: colors.textSecondary }}>加载中...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={
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
            } />

            <Route path="/statistics" element={
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
                theme={effectiveTheme}
              />
            } />

            <Route path="/settings" element={
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
                onImportConfig={handleImportConfig}
              />
            } />

            <Route path="/about" element={
              <AboutView
                colors={colors}
                appConfig={appConfig}
                isNativePlatform={isNativePlatform}
              />
            } />

            <Route path="/sync-import" element={
              <SyncImportView
                colors={colors}
                onImportConfig={handleImportConfig}
                isNativePlatform={isNativePlatform}
              />
            } />
          </Routes>
        </Suspense>

        <footer className="max-w-md mx-auto mt-8 text-center text-xs transition-colors pb-[env(safe-area-inset-bottom)]" style={{ color: colors.textMuted }}>
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

      {/* 更新提示弹窗 */}
      {updateInfo.available && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
                发现新版本 v{updateInfo.latestVersion}
              </h3>
              <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
                {updateInfo.forced 
                  ? "当前版本过低，为了保证应用正常运行，请立即更新。" 
                  : "新版本已发布，建议您更新以获得更好的体验。"}
              </p>
              <div className="space-y-3">
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg transition-colors"
                >
                  立即更新
                </a>
                {!updateInfo.forced && (
                  <button
                    onClick={() => setUpdateInfo(prev => ({ ...prev, available: false }))}
                    className="block w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-center font-medium rounded-lg transition-colors"
                  >
                    暂不更新
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 同步错误弹窗 */}
      {syncError && (
        <SyncErrorModal
          error={syncError}
          onClose={() => setSyncError(null)}
          onRetry={handleManualSync}
          colors={colors}
          appConfig={appConfig}
          isNativePlatform={isNativePlatform}
        />
      )}
    </div>
  );
};

export default CaffeineTracker;
