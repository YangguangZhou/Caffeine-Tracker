import React, { useState, useMemo } from 'react';
import {
  Activity, Clock, Edit, Trash2, Plus, Coffee,
  AlertCircle, Moon, Calendar, Droplet, TrendingUp, TrendingDown,
  Zap, Target, BarChart3, Minus, Timer, Heart, Brain, Waves, Sunrise,
  AlertTriangle, Copy // <-- Added Copy icon
} from 'lucide-react';
import MetabolismChart from '../components/MetabolismChart';
import IntakeForm from '../components/IntakeForm';
import { formatTime, formatDate, getStartOfWeek, getEndOfWeek, getStartOfDay, getEndOfDay } from '../utils/timeUtils';
import { getTotalCaffeineAtTime, estimateAmountFromConcentration, calculateHoursToReachTarget } from '../utils/caffeineCalculations'; // Added imports

/**
 * 当前状态视图组件
 * 显示当前咖啡因状态、清醒指数、睡眠影响分析和焦虑风险评估
 */
const CurrentStatusView = ({
  currentCaffeineAmount,
  currentCaffeineConcentration,
  records,
  drinks,
  metabolismChartData,
  userSettings,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  estimateAmountFromConcentration: estimateAmountFromConcentrationProp, // Renamed to avoid conflict
  colors
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // 计算今日总摄入量
  const todayTotal = useMemo(() => {
    const today = new Date();
    const todayStartTime = getStartOfDay(today); // Returns a number
    const todayEndTime = getEndOfDay(today);     // Returns a number

    if (typeof todayStartTime !== 'number' || isNaN(todayStartTime) ||
      typeof todayEndTime !== 'number' || isNaN(todayEndTime)) {
      console.warn("Failed to get valid start/end of day for todayTotal calculation.");
      return 0;
    }

    return Math.round(
      records
        .filter(record => record && record.timestamp >= todayStartTime && record.timestamp <= todayEndTime)
        .reduce((sum, record) => sum + record.amount, 0)
    );
  }, [records]);

  // 计算个性化推荐摄入量
  const personalizedRecommendation = useMemo(() => {
    const { weight, recommendedDosePerKg } = userSettings;
    if (weight > 0 && recommendedDosePerKg > 0) return Math.round(weight * recommendedDosePerKg);
    return null;
  }, [userSettings.weight, userSettings.recommendedDosePerKg]);

  // 计算有效每日最大摄入量
  const effectiveMaxDaily = useMemo(() => {
    const generalMax = userSettings.maxDailyCaffeine > 0 ? userSettings.maxDailyCaffeine : 400;
    if (personalizedRecommendation !== null) return Math.min(generalMax, personalizedRecommendation);
    return generalMax;
  }, [userSettings.maxDailyCaffeine, personalizedRecommendation]);

  // 计算达到安全睡眠阈值所需小时数和最佳睡眠时间
  const { hoursUntilSafeSleep, optimalSleepTime } = useMemo(() => {
    const now = Date.now();
    const { caffeineHalfLifeHours, safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;

    // currentCaffeineAmount is a prop
    const safeTargetAmount = estimateAmountFromConcentrationProp(safeSleepThresholdConcentration, weight, volumeOfDistribution);

    let hoursNeeded = null;
    let sleepTimeStr = 'N/A';

    if (safeTargetAmount !== null && safeTargetAmount >= 0) {
      hoursNeeded = calculateHoursToReachTarget(currentCaffeineAmount, safeTargetAmount, caffeineHalfLifeHours);
      if (hoursNeeded !== null && hoursNeeded > 0) {
        const sleepTimeDate = new Date(now + hoursNeeded * 60 * 60 * 1000);
        sleepTimeStr = sleepTimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (hoursNeeded === 0) {
        sleepTimeStr = '现在';
      }
    }
    return { hoursUntilSafeSleep: hoursNeeded, optimalSleepTime: sleepTimeStr };
  }, [currentCaffeineAmount, userSettings, estimateAmountFromConcentrationProp]);

  // 计算进度条百分比
  const percentFilled = useMemo(() => {
    if (effectiveMaxDaily <= 0) return 0;
    return Math.min(Math.max(0, (currentCaffeineAmount / effectiveMaxDaily) * 100), 100);
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  // 计算用户状态
  const userStatus = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    const maxDaily = effectiveMaxDaily;
    if (currentRounded < maxDaily * 0.1) return { status: '咖啡因含量极低', recommendation: '可以安全地摄入咖啡因。', color: `text-emerald-600` };
    if (currentRounded < maxDaily * 0.5) return { status: '咖啡因含量低', recommendation: '如有需要，可以适量摄入更多。', color: `text-emerald-500` };
    if (currentRounded < maxDaily) return { status: '咖啡因含量中等', recommendation: '请注意避免避免过量摄入。', color: `text-amber-500` };
    return { status: '咖啡因含量高', recommendation: '建议暂时避免摄入更多咖啡因。', color: `text-red-500` };
  }, [currentCaffeineAmount, effectiveMaxDaily]);

  // 计算健康建议
  const healthAdvice = useMemo(() => {
    const currentRounded = Math.round(currentCaffeineAmount);
    // todayTotal and effectiveMaxDaily are calculated above
    if (todayTotal > effectiveMaxDaily) {
      return {
        advice: `您今日的咖啡因摄入量 (${todayTotal}mg) 已超过您的个性化或通用上限 (${effectiveMaxDaily}mg)，建议减少摄入。`,
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
  }, [todayTotal, effectiveMaxDaily, currentCaffeineAmount]);


  // 计算本周数据
  const weekData = useMemo(() => {
    const now = new Date();
    const weekStart = getStartOfWeek(now);
    const weekEnd = getEndOfWeek(now);

    const weekRecords = records.filter(record =>
      record.timestamp >= weekStart && record.timestamp <= weekEnd
    );

    const weekTotal = weekRecords.reduce((sum, record) => sum + record.amount, 0);
    const weekAverage = weekRecords.length > 0 ? weekTotal / 7 : 0;

    // 计算趋势（与上周比较）
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const lastWeekRecords = records.filter(record =>
      record.timestamp >= lastWeekStart && record.timestamp <= lastWeekEnd
    );
    const lastWeekTotal = lastWeekRecords.reduce((sum, record) => sum + record.amount, 0);
    const lastWeekAverage = lastWeekRecords.length > 0 ? lastWeekTotal / 7 : 0;

    const trend = weekAverage - lastWeekAverage;

    return {
      total: Math.round(weekTotal),
      average: Math.round(weekAverage),
      trend: Math.round(trend),
      recordCount: weekRecords.length
    };
  }, [records]);

  // 计算清醒指数和智能分析
  const intelligentAnalysis = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // 计算清醒指数 (0-100)
    let alertnessScore = 0;
    let alertnessLevel = '';
    let alertnessColor = '';
    const conc = currentCaffeineConcentration;

    if (conc <= 1) {
      alertnessScore = Math.min(conc * 30, 30);
      alertnessLevel = '昏昏欲睡';
      alertnessColor = '#6b7280';
    } else if (conc <= 3) {
      alertnessScore = 30 + (conc - 1) * 15;
      alertnessLevel = '思维清晰';
      alertnessColor = colors.safe;
    } else if (conc <= 6) {
      alertnessScore = 60 + (conc - 3) * 10;
      alertnessLevel = '高度专注';
      alertnessColor = colors.accent;
    } else if (conc <= 10) {
      alertnessScore = 90 + (conc - 6) * 2.5;
      alertnessLevel = '轻微亢奋';
      alertnessColor = colors.warning;
    } else {
      alertnessScore = 100;
      alertnessLevel = '过度刺激';
      alertnessColor = colors.danger;
    }

    // 计算效果持续窗口
    const halfLife = userSettings.caffeineHalfLifeHours;
    const timeTo25Percent = halfLife * 2; // 降至25%需要2个半衰期
    const effectDurationHours = Math.max(0, timeTo25Percent);

    // 计算焦虑风险等级
    let anxietyRisk = 'low';
    let anxietyLevel = '心情平静';
    let anxietyAdvice = '保持当前状态，适合进行创造性工作';
    let anxietyColor = colors.safe;

    if (conc > 5 || todayTotal > effectiveMaxDaily * 1.2) {
      anxietyRisk = 'high';
      anxietyLevel = '焦虑风险较高';
      anxietyAdvice = '建议进行10分钟深呼吸练习，避免再次摄入';
      anxietyColor = colors.danger;
    } else if (conc > 2.5 || todayTotal > effectiveMaxDaily) {
      anxietyRisk = 'medium';
      anxietyLevel = '轻微紧张感';
      anxietyAdvice = '适当放慢节奏，可以听舒缓音乐';
      anxietyColor = colors.warning;
    }

    // 计算睡眠影响（图标和颜色）
    let sleepImpact = 'none';
    let sleepPhaseIcon = <Moon size={12} />;
    let sleepPhaseColor = colors.safe;
    let sleepDescription = '今晚睡眠不受影响';
    let sleepAdvice = '可以正常安排睡眠时间';

    if (hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 6) { // Check for null
      sleepImpact = 'severe';
      sleepPhaseIcon = <AlertTriangle size={12} />;
      sleepPhaseColor = colors.danger;
      sleepDescription = '可能严重影响睡眠';
      sleepAdvice = '建议推迟睡眠时间或进行放松活动';
    } else if (hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 3) { // Check for null
      sleepImpact = 'moderate';
      sleepPhaseIcon = <AlertCircle size={12} />;
      sleepPhaseColor = colors.warning;
      sleepDescription = '可能轻微影响入睡';
      sleepAdvice = '建议睡前进行冥想或阅读';
    } else if (hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 1) { // Check for null
      sleepImpact = <Moon size={12} />;
      sleepPhaseColor = colors.infoText;
      sleepDescription = '对睡眠影响很小';
      sleepAdvice = '注意睡前放松，避免激烈运动';
    }

    return {
      alertnessScore: Math.round(alertnessScore),
      alertnessLevel,
      alertnessColor,
      effectDurationHours: Math.round(effectDurationHours * 10) / 10,
      anxietyRisk,
      anxietyLevel,
      anxietyAdvice,
      anxietyColor,
      sleepImpact,
      sleepPhaseIcon,
      sleepPhaseColor,
      sleepDescription,
      sleepAdvice
    };
  }, [currentCaffeineConcentration, userSettings.caffeineHalfLifeHours, hoursUntilSafeSleep, todayTotal, effectiveMaxDaily, colors]);

  // 计算睡眠质量预测（仅在晚上显示）
  const sleepQualityPrediction = useMemo(() => {
    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 18 || currentHour <= 6;

    if (!isEvening) return null;

    // 基于当前咖啡因浓度预测睡眠质量
    const baseQuality = 90; // 基础睡眠质量
    let qualityReduction = 0;
    let delayMinutes = 0;
    let deepSleepReduction = 0;
    const conc = currentCaffeineConcentration;

    if (conc > 2.5) {
      qualityReduction = Math.min((conc - 2.5) * 10, 40);
      delayMinutes = Math.min((conc - 2.5) * 16, 60);
      deepSleepReduction = Math.min((conc - 2.5) * 12, 45);
    }

    const predictedQuality = Math.max(baseQuality - qualityReduction, 30);

    return {
      quality: Math.round(predictedQuality),
      delayMinutes: Math.round(delayMinutes),
      deepSleepReduction: Math.round(deepSleepReduction),
      isEvening
    };
  }, [currentCaffeineConcentration]);

  // 计算体感预报
  const bodyFeelForecast = useMemo(() => {
    const halfLife = userSettings.caffeineHalfLifeHours;

    if (currentCaffeineConcentration <= 0 || halfLife <= 0) {
      return [];
    }

    // 总是显示当前和2小时后，4/6小时后仅在2小时后不是困意渐浓时显示
    const forecastHours = [0, 2, 4, 6];
    const forecasts = [];

    let foundSleepy = false;
    for (const hour of forecastHours) {
      if (hour > 2 && foundSleepy) break; // 只要2小时后是困意渐浓，后面就不显示

      const futureConc = hour === 0
        ? currentCaffeineConcentration
        : currentCaffeineConcentration * Math.pow(0.5, hour / halfLife);

      let feeling = '';
      let advice = '';
      let icon = null;

      if (futureConc > 6) {
        feeling = '精力充沛';
        advice = '高强度工作佳';
        icon = <Zap size={18} />;
      } else if (futureConc > 4) {
        feeling = '思维敏捷';
        advice = '专注高效期';
        icon = <Brain size={18} />;
      } else if (futureConc > 2) {
        feeling = '状态平稳';
        advice = '适合日常任务';
        icon = <Activity size={18} />;
      } else if (futureConc > 1) {
        feeling = '精力下降';
        advice = '考虑放松';
        icon = <TrendingDown size={18} />;
      } else {
        feeling = '困意渐浓';
        advice = '准备休息';
        icon = <Moon size={18} />;
        if (hour === 2) foundSleepy = true;
      }

      forecasts.push({
        hour,
        label: hour === 0 ? '当前状态' : `${hour}小时后`,
        feeling,
        advice,
        icon,
        amount: Math.round(futureConc * 10) / 10
      });
    }

    return forecasts;
  }, [currentCaffeineConcentration, userSettings.caffeineHalfLifeHours]);

  // 计算今日详细数据
  const todayData = useMemo(() => {
    const today = new Date();
    const dayStartTime = getStartOfDay(today); // Returns a number
    const dayEndTime = getEndOfDay(today);   // Returns a number

    if (typeof dayStartTime !== 'number' || isNaN(dayStartTime) ||
      typeof dayEndTime !== 'number' || isNaN(dayEndTime)) {
      console.warn("Failed to get valid start/end of day for todayData calculation.");
      return {
        recordCount: 0,
        firstIntake: null,
        lastIntake: null,
        percentOfLimit: 0
      };
    }
    // dayStartTime and dayEndTime are already timestamps
    const todayRecords = records.filter(record =>
      record.timestamp >= dayStartTime && record.timestamp <= dayEndTime
    );

    const firstIntake = todayRecords.length > 0 ?
      formatTime(Math.max(...todayRecords.map(r => r.timestamp))) : null;
    const lastIntake = todayRecords.length > 0 ?
      formatTime(Math.min(...todayRecords.map(r => r.timestamp))) : null;

    return {
      recordCount: todayRecords.length,
      firstIntake,
      lastIntake,
      percentOfLimit: Math.round((todayTotal / effectiveMaxDaily) * 100)
    };
  }, [records, todayTotal, effectiveMaxDaily]);

  const handleAddRecordClick = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = (record) => {
    if (editingRecord) {
      onEditRecord(record);
    } else {
      onAddRecord(record);
    }
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  // 根据健康建议类型确定样式
  const getHealthAdviceStyles = () => {
    let styleProps = {
      bgColor: colors.infoBg,
      textColor: colors.infoText,
      borderColor: colors.infoText,
    };

    switch (healthAdvice.type) {
      case 'success':
        styleProps.bgColor = colors.successBg;
        styleProps.textColor = colors.successText;
        styleProps.borderColor = colors.successText;
        break;
      case 'warning':
        styleProps.bgColor = colors.warningBg;
        styleProps.textColor = colors.warningText;
        styleProps.borderColor = colors.warningText;
        break;
      case 'danger':
        styleProps.bgColor = colors.dangerBg;
        styleProps.textColor = colors.dangerText;
        styleProps.borderColor = colors.dangerText;
        break;
    }

    return {
      backgroundColor: styleProps.bgColor,
      color: styleProps.textColor,
      borderColor: styleProps.borderColor,
      borderWidth: '1px',
      borderStyle: 'solid',
    };
  };

  const getEnhancedStatusText = () => {
    const conc = currentCaffeineConcentration;
    if (conc <= 1) return { status: '放松状态', desc: '精神平和，适合休息或轻松活动' };
    if (conc <= 3) return { status: '精神饱满', desc: '思维清晰，创造力高峰期' };
    if (conc <= 6) return { status: '高度专注', desc: '注意力集中，工作效率最佳' };
    if (conc <= 10) return { status: '轻微亢奋', desc: '精力旺盛，注意控制摄入' };
    return { status: '过度刺激', desc: '建议停止摄入并多喝水，进行放松活动' };
  };

  const enhancedStatus = getEnhancedStatusText();

  return (
    <>
      <section
        aria-labelledby="current-status-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="current-status-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Activity size={20} className="mr-2" /> 当前状态
        </h2>

        {/* 半圆进度表 */}
        <div className="relative w-full flex justify-center my-6">
          <svg width="240" height="160" viewBox="0 0 240 160">
            {/* 背景轨道 */}
            <path
              d="M20,130 A100,100 0 0,1 220,130"
              fill="none"
              stroke={colors.grid}
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* 前景进度 */}
            <path
              d="M20,130 A100,100 0 0,1 220,130"
              fill="none"
              stroke="url(#caffeine-gauge-gradient)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray="314.16"
              strokeDashoffset={314.16 - (314.16 * percentFilled / 100)}
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="caffeine-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.safe} />
                <stop offset="75%" stopColor={colors.warning} />
                <stop offset="100%" stopColor={colors.danger} />
              </linearGradient>
            </defs>
            {/* 标签 */}
            <text x="20" y="155" fontSize="12" fill={colors.textMuted} textAnchor="start">0</text>
            <text x="120" y="155" fontSize="12" fill={colors.textMuted} textAnchor="middle">{Math.round(effectiveMaxDaily / 2)}</text>
            <text x="220" y="155" fontSize="12" fill={colors.textMuted} textAnchor="end">{effectiveMaxDaily}+</text>
            {/* 中心文字 */}
            <text x="120" y="100" fontSize="32" fontWeight="bold" fill={colors.espresso} textAnchor="middle">{Math.round(currentCaffeineAmount)}</text>
            <text x="120" y="120" fontSize="14" fill={colors.textMuted} textAnchor="middle">mg 当前含量</text>
            {/* 浓度显示 */}
            {currentCaffeineConcentration > 0 && (
              <text x="120" y="135" fontSize="10" fill={colors.textMuted} textAnchor="middle">(约 {currentCaffeineConcentration.toFixed(1)} mg/L)</text>
            )}
          </svg>
        </div>

        <div className="text-center mb-4 mt-2">
          <h3 className="text-lg font-semibold" style={{ color: intelligentAnalysis.alertnessColor }}>
            {enhancedStatus.status}
          </h3>
          <p
            className="mt-1 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            {enhancedStatus.desc}
          </p>

          {/* 健康建议 */}
          <aside
            aria-label="健康建议"
            className={`mt-3 text-sm p-3 rounded-lg`}
            style={getHealthAdviceStyles()}
          >
            <div className="flex items-center justify-center">
              <AlertCircle size={16} className="inline-block mr-1.5 flex-shrink-0" />
              <span>{healthAdvice.advice}</span>
            </div>
          </aside>
        </div>

        {/* 核心数据统计 - 重新设计 */}
        <div
          className="grid grid-cols-2 gap-2 text-xs mt-4 pt-4 border-t transition-colors"
          style={{
            color: colors.textSecondary,
            borderColor: colors.borderSubtle
          }}
        >
          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              <Target size={12} className="mr-1" />
              <span className="text-xs">今日摄入</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: colors.espresso }}
            >
              {todayTotal} mg
            </span>
            <span className="text-xs">
              {todayData.percentOfLimit}% 限额
            </span>
          </div>

          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              <Brain size={12} className="mr-1" />
              <span className="text-xs">清醒指数</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: intelligentAnalysis.alertnessColor }}
            >
              {intelligentAnalysis.alertnessScore}/100
            </span>
            <span className="text-xs">
              {intelligentAnalysis.alertnessLevel}
            </span>
          </div>

          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              <span className="mr-1" style={{ color: intelligentAnalysis.sleepPhaseColor }}>
                {intelligentAnalysis.sleepPhaseIcon}
              </span>
              <span className="text-xs">睡眠影响</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: colors.espresso }}
            >
              {intelligentAnalysis.sleepDescription}
            </span>
            <span className="text-xs">
              {hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 0 ? `${hoursUntilSafeSleep.toFixed(1)}h后安全` : '现在可睡'}
            </span>
          </div>

          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              <Heart size={12} className="mr-1" />
              <span className="text-xs">焦虑风险</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: intelligentAnalysis.anxietyColor }}
            >
              {intelligentAnalysis.anxietyLevel}
            </span>
            <span className="text-xs">
              {todayData.recordCount} 次摄入
            </span>
          </div>
        </div>

        {/* 最佳睡眠时间 */}
        <div
          className="mt-4 text-sm text-center p-3 rounded-lg border"
          style={{
            backgroundColor: colors.infoBg,
            color: colors.infoText,
            borderColor: colors.infoText,
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          <p className="flex items-center justify-center">
            <Moon size={16} className="inline-block mr-1.5" />
            {optimalSleepTime === 'N/A'
              ? `无法计算建议睡眠时间 (检查设置)`
              : optimalSleepTime === '现在'
                ? `根据阈值 (<${userSettings.safeSleepThresholdConcentration.toFixed(1)}mg/L)，现在可以入睡`
                : `建议最早睡眠时间: ${optimalSleepTime}`
            }
          </p>
          <p className="text-xs mt-1">{intelligentAnalysis.sleepAdvice}</p>
        </div>
      </section>

      {/* 智能分析与预测卡片 */}
      <section
        aria-labelledby="intelligent-analysis-heading"
        className="mb-5 rounded-xl p-4 sm:p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="intelligent-analysis-heading"
          className="text-lg font-semibold mb-3 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Waves size={18} className="mr-2" /> 智能分析与预测
        </h2>

        {records.length > 0 ? (
          <>
            <div className="flex flex-col gap-4 mb-4">
              {/* 睡眠质量预测（仅晚上显示） */}
              {sleepQualityPrediction && (
                <div className="rounded-lg p-4 shadow transition-colors" style={{ backgroundColor: colors.bgBase }}>
                  <h4 className="font-semibold mb-3 text-sm flex items-center" style={{ color: colors.espresso }}>
                    <Moon size={14} className="mr-1" />
                    今晚睡眠质量预测
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: colors.textSecondary }}>
                    <div className="text-center">
                      <div className="text-xs mb-1">睡眠质量</div>
                      <div className="font-medium" style={{ color: colors.espresso }}>
                        {sleepQualityPrediction.quality}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs mb-1">入睡延迟</div>
                      <div className="font-medium" style={{ color: colors.espresso }}>
                        +{sleepQualityPrediction.delayMinutes}分钟
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs mb-1">深睡减少</div>
                      <div className="font-medium" style={{ color: colors.espresso }}>
                        -{sleepQualityPrediction.deepSleepReduction}分钟
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* 体感预报 */}
              {bodyFeelForecast.length > 0 && (
                <div className="rounded-lg p-4 shadow transition-colors" style={{ backgroundColor: colors.bgBase }}>
                  <h4 className="font-semibold mb-3 text-sm flex items-center" style={{ color: colors.espresso }}>
                    <Sunrise size={16} className="mr-1.5" />
                    体感预报
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {bodyFeelForecast.map((forecast) => (
                      <div
                        key={forecast.label}
                        className="p-3 rounded-lg text-center transition-colors"
                        style={{ backgroundColor: colors.bgCard, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                      >
                        <div
                          className="flex flex-col items-center justify-center mb-1.5"
                          style={{ color: colors.accent }}
                        >
                          {React.cloneElement(forecast.icon, {
                            size: 16,
                            style: { color: colors.accent }
                          })}
                          <span className="mt-1 text-xs font-medium text-center">
                            {forecast.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mb-1 leading-tight" style={{ color: colors.espresso }}>
                          {forecast.feeling}
                        </p>
                        <p className="text-xs mb-1 leading-tight" style={{ color: colors.textMuted }}>
                          {forecast.advice}
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          约 {forecast.amount} mg
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            className="text-center py-8 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <Waves size={48} className="mx-auto mb-3 opacity-50" />
            <p>暂无记录进行智能分析。</p>
            <p className="text-xs mt-1">添加您的第一条咖啡因摄入记录以启用此功能。</p>
          </div>
        )}
      </section>

      {/* 代谢曲线图卡片 */}
      <section
        aria-labelledby="metabolism-chart-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="metabolism-chart-heading"
          className="text-xl font-semibold mb-2 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <BarChart3 size={20} className="mr-2" />
          咖啡因代谢曲线
        </h2>
        <MetabolismChart
          metabolismChartData={metabolismChartData}
          userSettings={userSettings}
          formatTime={formatTime}
          estimateAmountFromConcentration={estimateAmountFromConcentrationProp}
          colors={colors}
        />
      </section>

      <section
        aria-labelledby="intake-form-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2 id="intake-form-heading" className="sr-only">添加或编辑摄入记录</h2>
        {showForm ? (
          <IntakeForm
            drinks={drinks}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            initialValues={editingRecord}
            colors={colors}
            lastRecord={records.length > 0 ? records[0] : null}
          />
        ) : (
          <button
            onClick={handleAddRecordClick}
            className="w-full py-3 px-4 text-white rounded-lg transition-all duration-200 flex items-center justify-center shadow-md font-medium hover:opacity-90 transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: colors.accent }}
          >
            <Coffee size={18} className="mr-2" />
            添加摄入记录
          </button>
        )}
      </section>

      {/* 摄入历史卡片 */}
      <section
        aria-labelledby="intake-history-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="intake-history-heading"
            className="text-xl font-semibold flex items-center transition-colors"
            style={{ color: colors.espresso }}
          >
            <Clock size={20} className="mr-2" /> 摄入历史
          </h2>
          {records.length > 0 && (
            <div className="flex items-center text-sm" style={{ color: colors.textMuted }}>
              <span>共 {records.length} 条记录</span>
            </div>
          )}
        </div>

        {records.length === 0 ? (
          <div className="text-center py-6">
            <Coffee size={32} className="mx-auto mb-2 opacity-40" style={{ color: colors.accent }} />
            <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
              暂无记录。添加您的第一条咖啡因摄入记录吧！
            </p>
            <button
              onClick={handleAddRecordClick}
              className="inline-flex items-center px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 shadow-md hover:opacity-90 transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: colors.accent }}
            >
              <Plus size={16} className="mr-1.5" />
              添加记录
            </button>
          </div>
        ) : (
          <ul
            className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full transition-colors"
            style={{
              borderColor: colors.borderSubtle,
              scrollbarColor: `${colors.borderStrong} transparent`
            }}
          >
            {records.map(record => (
              <li
                key={record.id}
                className="relative px-1 py-2 rounded-md group transition-colors duration-150 hover:bg-opacity-80"
                style={{
                  cursor: 'pointer',
                  marginBottom: '6px',
                  backgroundColor: 'transparent',
                  minHeight: '60px'  // 增加最小高度以容纳更多内容
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accent + '12'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* 右上角：mg数据 + 操作按钮组 */}
                <div className="absolute top-1 right-1 flex items-center space-x-2 opacity-90 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  {/* mg 数据标签 */}
                  <div 
                    className="flex items-center px-2 py-0.5 rounded-full flex-shrink-0" 
                    style={{
                      backgroundColor: colors.accent + '18',
                      color: colors.accent,
                      fontSize: '13px'
                    }}
                  >
                    <span className="font-bold">{record.amount} mg</span>
                  </div>
                  
                  {/* 操作按钮组 */}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        // 快速重复此记录
                        const newRecord = {
                          ...record,
                          id: `record_${Date.now()}`,
                          timestamp: Date.now(),
                          updatedAt: Date.now()
                        };
                        onAddRecord(newRecord);
                      }}
                      className="p-1.5 rounded-md transition-all duration-200 hover:shadow-sm transform hover:scale-105 active:scale-95"
                      style={{
                        color: colors.accent,
                        backgroundColor: colors.bgBase,
                        border: `1px solid ${colors.borderSubtle}`
                      }}
                      aria-label={`快速重复 ${record.name} 记录`}
                      title="快速重复此记录"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => handleEditRecord(record)}
                      className="p-1.5 rounded-md transition-all duration-200 hover:shadow-sm transform hover:scale-105 active:scale-95"
                      style={{
                        color: colors.textSecondary,
                        backgroundColor: colors.bgBase,
                        border: `1px solid ${colors.borderSubtle}`
                      }}
                      aria-label={`编辑 ${record.name} 记录`}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteRecord(record.id)}
                      className="p-1.5 rounded-md transition-all duration-200 hover:shadow-sm transform hover:scale-105 active:scale-95"
                      style={{
                        color: colors.danger,
                        backgroundColor: colors.bgBase,
                        border: `1px solid ${colors.dangerBorder || colors.borderSubtle}`
                      }}
                      aria-label={`删除 ${record.name} 记录`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 内容区域 - 使用全宽布局 */}
                <div className="w-full">
                  {/* 饮品名称 - 为右上角按钮预留空间 */}
                  <div className="mb-1.5" style={{ marginRight: '170px' }}>
                    <div
                      className="font-semibold text-sm flex items-center transition-colors"
                      style={{ color: colors.textPrimary }}
                      title={record.name}
                    >
                      <div
                        className="w-2 h-2 rounded-full mr-2 flex-shrink-0 mt-1"
                        style={{ backgroundColor: colors.accent }}
                      ></div>
                      <span 
                        className="truncate block"
                        style={{ maxWidth: '160px' }}
                      >
                        {record.name}
                      </span>
                    </div>
                  </div>

                  {/* 统计信息 - 允许延伸到按钮下方 */}
                  <div 
                    className="flex flex-wrap items-center text-xs gap-x-2.5 gap-y-1"
                    style={{ 
                      color: colors.textMuted,
                      paddingRight: '0'  // 不预留右侧空间，允许延伸
                    }}
                  >
                    <span className="flex items-center whitespace-nowrap flex-shrink-0">
                      <Calendar size={11} className="mr-1" /> {formatDate(record.timestamp)}
                    </span>
                    <span className="flex items-center whitespace-nowrap flex-shrink-0">
                      <Clock size={11} className="mr-1" /> {formatTime(record.timestamp)}
                    </span>
                    {record.volume && (
                      <span className="flex items-center whitespace-nowrap flex-shrink-0">
                        <Droplet size={11} className="mr-1" /> {record.volume} ml
                      </span>
                    )}
                    {(!record.customName && record.drinkId && record.volume === null) && (
                      <span className="flex items-center whitespace-nowrap flex-shrink-0">
                        <Edit size={10} className="mr-1" />
                        手动调整
                      </span>
                    )}
                    {/* 来源信息 - 优化显示 */}
                    {(record.customName && record.drinkId) && (
                      <span 
                        className="flex items-center flex-shrink-0"
                        title={`来源: ${drinks.find(d => d.id === record.drinkId)?.name ?? '未知饮品'}`}
                      >
                        <Coffee size={10} className="mr-1 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          来源: {drinks.find(d => d.id === record.drinkId)?.name ?? '未知饮品'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default CurrentStatusView;