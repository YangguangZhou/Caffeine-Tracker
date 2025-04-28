import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Coffee, Moon, Sun, TrendingUp, BarChart2, Settings
} from 'lucide-react';

// 导入工具函数
import { 
  formatTime, 
  formatDate, 
  getStartOfDay, 
  getEndOfDay, 
  formatDatetimeLocal
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

// 导入视图组件
import CurrentStatusView from './views/CurrentStatusView';
import StatisticsView from './views/StatisticsView';
import SettingsView from './views/SettingsView';

/**
 * 应用主组件
 */
const CaffeineTracker = () => {
  // --- 状态变量 ---

  // 用户设置
  const [userSettings, setUserSettings] = useState(defaultSettings);

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

  // --- 颜色主题 ---
  const colors = useMemo(() => 
    userSettings.nightMode ? NIGHT_COLORS : COFFEE_COLORS, 
    [userSettings.nightMode]
  );

  // --- 徽章显示状态 ---
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  // --- 效果 ---

  // 从localStorage加载数据
  useEffect(() => {
    let loadedRecords = [];
    let loadedSettings = defaultSettings;
    let loadedDrinks = [];

    try {
      // 加载记录
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
          console.error('localStorage中的记录数据格式无效。正在清除。');
          localStorage.removeItem('caffeineRecords');
        }
      }

      // 加载设置
      const savedSettings = localStorage.getItem('caffeineSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings === 'object' && parsedSettings !== null) {
          // 确保默认设置中的所有键都存在，谨慎合并
          const mergedSettings = { ...defaultSettings };
          for (const key in defaultSettings) {
            if (parsedSettings.hasOwnProperty(key) && 
                typeof parsedSettings[key] === typeof defaultSettings[key]) {
              mergedSettings[key] = parsedSettings[key];
            }
          }

          // 验证数值范围
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
          console.error('localStorage中的设置数据格式无效。正在清除。');
          localStorage.removeItem('caffeineSettings');
        }
      }

      // 加载饮品（组合）
      const savedDrinks = localStorage.getItem('caffeineDrinks');
      if (savedDrinks) {
        const parsedDrinks = JSON.parse(savedDrinks);
        if (Array.isArray(parsedDrinks)) {
          const validDrinks = parsedDrinks.filter(d => 
            d && typeof d.id !== 'undefined' && 
            typeof d.name === 'string' && 
            typeof d.caffeineContent === 'number'
          );
          
          // 合并策略：保留已保存的饮品，添加任何在已保存数据中不存在的*新*初始预设
          const savedDrinkIds = new Set(validDrinks.map(d => d.id));
          const newPresetsToAdd = initialPresetDrinks.filter(p => !savedDrinkIds.has(p.id));
          
          // 确保加载的饮品具有category和isPreset字段，缺失时使用默认值
          const validatedSavedDrinks = validDrinks.map(d => {
            const isOriginalPreset = originalPresetDrinkIds.has(d.id);
            const originalPresetData = isOriginalPreset 
              ? initialPresetDrinks.find(p => p.id === d.id) 
              : {};
            
            return {
              ...d,
              category: d.category || (isOriginalPreset ? originalPresetData.category : '其他'), // 分配分类，默认自定义为'其他'
              isPreset: d.isPreset ?? isOriginalPreset, // 保留已保存的isPreset（如果存在），否则从原始列表确定
            };
          });
          
          loadedDrinks = [...validatedSavedDrinks, ...newPresetsToAdd];
        } else {
          console.error('localStorage中的饮品数据格式无效。使用初始预设。');
          loadedDrinks = [...initialPresetDrinks];
          localStorage.removeItem('caffeineDrinks');
        }
      } else {
        loadedDrinks = [...initialPresetDrinks];
      }

    } catch (error) {
      console.error('从localStorage加载数据时出错:', error);
      loadedRecords = [];
      loadedSettings = defaultSettings;
      loadedDrinks = [...initialPresetDrinks];
    } finally {
      setRecords(loadedRecords.sort((a, b) => b.timestamp - a.timestamp)); // 初始排序记录
      setUserSettings(loadedSettings);
      setDrinks(loadedDrinks);
      
      // 如果启用了WebDAV同步并设置为启动时，尝试同步
      if (loadedSettings.webdavEnabled && 
          loadedSettings.webdavSyncFrequency === 'startup') {
        setTimeout(() => {
          performWebDAVSync(loadedSettings, loadedRecords, loadedDrinks);
        }, 1000); // 延迟1秒，让UI先渲染
      }
    }
  }, []); // 在挂载时运行一次

  // 计算当前咖啡因水平（量和浓度）和最佳睡眠时间
  useEffect(() => {
    const calculateCurrentStatus = () => {
      const now = Date.now();
      const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;

      // 1. 计算当前总咖啡因量（mg）
      const totalAmount = getTotalCaffeineAtTime(records, now, caffeineHalfLifeHours);
      setCurrentCaffeineAmount(totalAmount);

      // 2. 估算当前浓度（mg/L）
      const concentration = estimateConcentration(totalAmount, weight, volumeOfDistribution);
      setCurrentCaffeineConcentration(concentration ?? 0); // 计算失败时默认为0

      // 3. 计算达到安全睡眠阈值所需的时间
      // 首先，确定对应安全浓度阈值的目标*量*（mg）
      const safeTargetAmount = estimateAmountFromConcentration(
        safeSleepThresholdConcentration, weight, volumeOfDistribution
      );

      if (safeTargetAmount !== null && safeTargetAmount >= 0) {
        const hoursNeeded = calculateHoursToReachTarget(
          totalAmount, safeTargetAmount, caffeineHalfLifeHours
        );
        setHoursUntilSafeSleep(hoursNeeded); // 存储所需小时数

        if (hoursNeeded !== null && hoursNeeded > 0) {
          const sleepTime = new Date(now + hoursNeeded * 60 * 60 * 1000);
          setOptimalSleepTime(sleepTime.toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit', hour12: false 
          }));
        } else if (hoursNeeded === 0) {
          setOptimalSleepTime('现在'); // 现在可以安全入睡
        } else {
          setOptimalSleepTime('N/A'); // 计算失败或不适用
        }
      } else {
        // 处理safeTargetAmount计算失败的情况（例如，设置无效）
        setHoursUntilSafeSleep(null);
        setOptimalSleepTime('N/A');
      }
    };

    calculateCurrentStatus(); // 初始计算
    const timer = setInterval(calculateCurrentStatus, 60000); // 每分钟重新计算
    return () => clearInterval(timer); // 卸载时清除计时器
  }, [records, userSettings]);

  // 生成代谢图表数据
  useEffect(() => {
    const chartData = generateMetabolismChartData(
      records, 
      userSettings.caffeineHalfLifeHours
    );
    setMetabolismChartData(chartData);
  }, [records, userSettings.caffeineHalfLifeHours]); // 当记录或半衰期变化时重新生成

  // 将数据保存到localStorage
  useEffect(() => {
    if (records.length > 0 || localStorage.getItem('caffeineRecords') !== null) {
      try {
        localStorage.setItem('caffeineRecords', JSON.stringify(records));
      } catch (error) {
        console.error('保存记录到localStorage时出错:', error);
        alert("保存记录时出错，本地存储可能已满或损坏。");
      }
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('caffeineSettings', JSON.stringify(userSettings));
    } catch (error) {
      console.error('保存设置到localStorage时出错:', error);
      alert("保存设置时出错。");
    }
  }, [userSettings]);

  useEffect(() => {
    // 仅当饮品状态初始化且与初始预设不同或存储已存在时保存
    if (drinks.length > 0 || localStorage.getItem('caffeineDrinks') !== null) {
      try {
        // 仅存储必要字段，isPreset很重要
        const drinksToSave = drinks.map(({ id, name, caffeineContent, defaultVolume, category, isPreset }) => ({
          id, name, caffeineContent, defaultVolume, category, isPreset
        }));
        localStorage.setItem('caffeineDrinks', JSON.stringify(drinksToSave));
      } catch (error) {
        console.error('保存饮品列表到localStorage时出错:', error);
        alert("保存饮品列表时出错。");
      }
    }
  }, [drinks]);

  // --- 数据聚合函数 ---

  const getTodayTotal = useCallback(() => {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    return Math.round(records
      .filter(record => record && record.timestamp >= todayStart && record.timestamp <= todayEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // --- 派生状态和计算 ---

  // 基于体重的个性化建议
  const personalizedRecommendation = useMemo(() => {
    const { weight, recommendedDosePerKg } = userSettings;
    if (weight > 0 && recommendedDosePerKg > 0) {
      return Math.round(weight * recommendedDosePerKg);
    }
    return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  // 使用通用400mg限制或个性化限制，取较低者作为状态检查的主要每日限制
  const effectiveMaxDaily = useMemo(() => {
    const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (personalizedRecommendation !== null) {
      return Math.min(generalMax, personalizedRecommendation);
    }
    return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  // 用户状态
  const userStatus = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    const maxDaily = effectiveMaxDaily; // 使用有效限制

    if (currentRounded < maxDaily * 0.1) 
      return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
    if (currentRounded < maxDaily * 0.5) 
      return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
    if (currentRounded < maxDaily) 
      return { status: '咖啡因含量中等', recommendation: '请注意避免过量摄入。', color: `text-amber-500` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  // 健康建议
  const healthAdvice = useMemo(() => {
    const dailyTotal = getTodayTotal();
    const maxDaily = effectiveMaxDaily; // 使用有效限制
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

  // 填充百分比（用于仪表盘）
  const percentFilled = useMemo(() => {
    const maxDailyCaffeineForProgress = effectiveMaxDaily; // 使用有效限制作为仪表盘
    if (maxDailyCaffeineForProgress <= 0) return 0;
    // 基于*量*计算百分比，而非浓度
    return Math.min(Math.max(0, (currentCaffeineAmount / maxDailyCaffeineForProgress) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  // 今日总计
  const todayTotal = useMemo(() => getTodayTotal(), [getTodayTotal]);

  // --- WebDAV同步 ---
  
  const performWebDAVSync = async (settings, currentRecords, currentDrinks) => {
    if (!settings.webdavEnabled || !settings.webdavServer || 
        !settings.webdavUsername || !settings.webdavPassword) {
      console.log("WebDAV同步未配置或已禁用");
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

      // 准备要同步的数据
      const localData = {
        records: currentRecords,
        drinks: currentDrinks,
        userSettings: settings,
        version: "1.0.0"
      };

      // 执行同步
      const result = await webdavClient.performSync(localData);
      
      if (result.success) {
        // 如果同步成功且返回了新数据，更新状态
        if (result.data) {
          if (result.data.records && Array.isArray(result.data.records)) {
            setRecords(result.data.records.sort((a, b) => b.timestamp - a.timestamp));
          }
          
          if (result.data.drinks && Array.isArray(result.data.drinks)) {
            setDrinks(result.data.drinks);
          }
          
          if (result.data.userSettings) {
            const syncedSettings = { ...settings, lastSyncTimestamp: result.timestamp };
            setUserSettings(syncedSettings);
          }
        }

        setSyncStatus({
          inProgress: false,
          lastSyncTime: new Date(),
          lastSyncResult: { success: true, message: result.message }
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("WebDAV同步失败:", error);
      setSyncStatus({
        inProgress: false,
        lastSyncTime: new Date(),
        lastSyncResult: { success: false, message: error.message }
      });
    }

    // 5秒后隐藏同步徽章
    setTimeout(() => {
      setShowSyncBadge(false);
    }, 5000);
  };

  // 处理定时同步
  useEffect(() => {
    // 创建定时同步的间隔定时器
    if (userSettings.webdavEnabled && userSettings.webdavSyncFrequency === 'hourly') {
      const syncTimer = setInterval(() => {
        performWebDAVSync(userSettings, records, drinks);
      }, 60 * 60 * 1000); // 每小时一次
      
      return () => clearInterval(syncTimer);
    }
    
    // 如果设置为每日同步，则创建每日检查
    if (userSettings.webdavEnabled && userSettings.webdavSyncFrequency === 'daily') {
      const checkDailySync = () => {
        const now = new Date();
        const lastSync = userSettings.lastSyncTimestamp 
          ? new Date(userSettings.lastSyncTimestamp) 
          : null;
        
        // 如果从未同步或上次同步是前一天或更早，则同步
        if (!lastSync || !isToday(lastSync)) {
          performWebDAVSync(userSettings, records, drinks);
        }
        
        // 设置下一次检查（每小时检查一次）
        setTimeout(checkDailySync, 60 * 60 * 1000);
      };
      
      // 初始检查
      checkDailySync();
      
      return () => {}; // 无需清理，因为使用setTimeout
    }
  }, [userSettings.webdavEnabled, userSettings.webdavSyncFrequency, userSettings.lastSyncTimestamp]);

  // --- 事件处理程序 ---

  // 记录处理
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

  // 设置处理
  const handleUpdateSettings = useCallback((newSettings) => {
    setUserSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }, []);

  // 切换夜间模式
  const toggleNightMode = useCallback(() => {
    setUserSettings(prev => ({ ...prev, nightMode: !prev.nightMode }));
  }, []);

  // 手动触发WebDAV同步
  const handleManualSync = useCallback(() => {
    performWebDAVSync(userSettings, records, drinks);
  }, [userSettings, records, drinks]);

  // --- 渲染 ---
  return (
    <div 
      className="min-h-screen font-sans transition-colors duration-300" 
      style={{ backgroundColor: colors.bgBase, color: colors.textPrimary }}
    >
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 页眉 */}
        <header className="mb-6 text-center relative">
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
          
          {/* 夜间模式切换 */}
          <button
            onClick={toggleNightMode}
            className="absolute top-0 right-0 p-2 rounded-full transition-colors"
            style={{ color: colors.textSecondary }}
            aria-label={userSettings.nightMode ? "切换到日间模式" : "切换到夜间模式"}
          >
            {userSettings.nightMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* 同步状态徽章 */}
          {showSyncBadge && (
            <div 
              className={`absolute top-12 right-0 py-1 px-2 rounded-full text-xs ${
                syncStatus.lastSyncResult?.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              } flex items-center`}
            >
              {syncStatus.inProgress 
                ? '同步中...' 
                : syncStatus.lastSyncResult?.success 
                  ? '同步成功' 
                  : '同步失败'}
            </div>
          )}
        </header>

        {/* 导航标签 */}
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
              viewMode === 'current' ? 'text-white shadow-inner' : 'hover:bg-amber-50'
            }`} 
            style={viewMode === 'current' 
              ? { backgroundColor: colors.accent } 
              : { color: colors.accent }
            }
          >
            <TrendingUp size={16} className="mr-1.5" /> 当前状态
          </button>
          <button 
            onClick={() => setViewMode('stats')} 
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium border-l border-r ${
              viewMode === 'stats' ? 'text-white shadow-inner' : 'hover:bg-amber-50'
            }`} 
            style={viewMode === 'stats' 
              ? { 
                backgroundColor: colors.accent, 
                borderColor: colors.borderSubtle 
              } 
              : { 
                color: colors.accent, 
                borderColor: colors.borderSubtle 
              }
            }
          >
            <BarChart2 size={16} className="mr-1.5" /> 数据统计
          </button>
          <button 
            onClick={() => setViewMode('settings')} 
            className={`flex-1 py-3 flex justify-center items-center transition-colors duration-200 text-sm font-medium ${
              viewMode === 'settings' ? 'text-white shadow-inner' : 'hover:bg-amber-50'
            }`} 
            style={viewMode === 'settings' 
              ? { backgroundColor: colors.accent } 
              : { color: colors.accent }
            }
          >
            <Settings size={16} className="mr-1.5" /> 设置
          </button>
        </div>

        {/* 当前状态视图 */}
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

        {/* 统计视图 */}
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

        {/* 设置视图 */}
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
          />
        )}

        {/* 页脚 */}
        <footer className="mt-8 text-center text-xs transition-colors" style={{ color: colors.textMuted }}>
          <p>负责任地跟踪您的咖啡因摄入量。本应用提供的数据和建议基于科学模型估算，仅供参考，不能替代专业医疗意见。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} Caffeine Tracker App v3.0.0</p>
        </footer>
      </div>
    </div>
  );
};

export default CaffeineTracker;