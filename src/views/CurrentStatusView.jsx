import React, { useState, useMemo } from 'react';
import {
  Activity, Clock, Edit, Trash2, Plus,
  AlertCircle, Moon, Calendar, Droplet, TrendingUp, TrendingDown,
  Zap, Target, BarChart3, Minus, Timer
} from 'lucide-react';
import MetabolismChart from '../components/MetabolismChart';
import IntakeForm from '../components/IntakeForm';
import { formatTime, formatDate, getStartOfWeek, getEndOfWeek, getStartOfDay, getEndOfDay } from '../utils/timeUtils';

/**
 * 当前状态视图组件
 * 显示当前咖啡因状态、代谢曲线和摄入历史
 */
const CurrentStatusView = ({
  currentCaffeineAmount,
  currentCaffeineConcentration,
  optimalSleepTime,
  hoursUntilSafeSleep,
  userStatus,
  healthAdvice,
  records,
  drinks,
  metabolismChartData,
  userSettings,
  percentFilled,
  todayTotal,
  effectiveMaxDaily,
  personalizedRecommendation,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  estimateAmountFromConcentration,
  colors
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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

  // 计算代谢信息
  const metabolismInfo = useMemo(() => {
    if (currentCaffeineAmount <= 0) return null;
    
    const halfLife = userSettings.caffeineHalfLifeHours;
    const clearanceRate = Math.log(2) / halfLife;
    const currentClearanceRate = currentCaffeineAmount * clearanceRate;
    
    // 估算达到峰值浓度的时间（假设摄入后1小时达到峰值）
    const lastRecord = records.length > 0 ? records[0] : null;
    const timeSinceLastIntake = lastRecord ? (Date.now() - lastRecord.timestamp) / (1000 * 60 * 60) : 0;
    
    // 估算完全清除时间（降至5mg以下）
    const timeToClear = currentCaffeineAmount > 5 ? 
      Math.log(currentCaffeineAmount / 5) / clearanceRate : 0;
    
    return {
      clearanceRate: Math.round(currentClearanceRate * 10) / 10,
      timeSinceLastIntake: Math.round(timeSinceLastIntake * 10) / 10,
      timeToClear: Math.round(timeToClear * 10) / 10,
      halfLife: halfLife
    };
  }, [currentCaffeineAmount, userSettings.caffeineHalfLifeHours, records]);

  // 计算今日详细数据
  const todayData = useMemo(() => {
    const today = new Date();
    const dayStart = getStartOfDay(today);
    const dayEnd = getEndOfDay(today);
    
    const todayRecords = records.filter(record => 
      record.timestamp >= dayStart && record.timestamp <= dayEnd
    );
    
    const firstIntake = todayRecords.length > 0 ? 
      formatTime(Math.max(...todayRecords.map(r => r.timestamp))) : null;
    const lastIntake = todayRecords.length > 0 ? 
      formatTime(Math.min(...todayRecords.map(r => r.timestamp))) : null;
    
    // 计算平均摄入间隔
    let averageInterval = 0;
    if (todayRecords.length > 1) {
      const sortedTimes = todayRecords.map(r => r.timestamp).sort();
      let totalInterval = 0;
      for (let i = 1; i < sortedTimes.length; i++) {
        totalInterval += (sortedTimes[i] - sortedTimes[i-1]) / (1000 * 60 * 60);
      }
      averageInterval = totalInterval / (sortedTimes.length - 1);
    }
    
    return {
      recordCount: todayRecords.length,
      firstIntake,
      lastIntake,
      averageInterval: Math.round(averageInterval * 10) / 10,
      percentOfLimit: Math.round((todayTotal / effectiveMaxDaily) * 100)
    };
  }, [records, todayTotal, effectiveMaxDaily]);

  // 计算历史统计
  const historicalStats = useMemo(() => {
    if (records.length === 0) return null;

    // 计算总记录天数
    const dates = [...new Set(records.map(r => new Date(r.timestamp).toDateString()))];
    const totalDays = dates.length;
    
    // 计算最高单日摄入
    const dailyTotals = {};
    records.forEach(record => {
      const dateKey = new Date(record.timestamp).toDateString();
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + record.amount;
    });
    const maxDaily = Math.max(...Object.values(dailyTotals));
    
    // 计算平均每日摄入（仅统计有记录的天数）
    const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
    const avgDaily = totalAmount / totalDays;
    
    // 计算最常摄入的饮品
    const drinkCounts = {};
    records.forEach(record => {
      const drinkName = record.name || '未知';
      drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
    });
    const mostFrequent = Object.keys(drinkCounts).reduce((a, b) => 
      drinkCounts[a] > drinkCounts[b] ? a : b, '');

    return {
      totalDays,
      totalRecords: records.length,
      maxDaily: Math.round(maxDaily),
      avgDaily: Math.round(avgDaily),
      mostFrequent,
      totalAmount: Math.round(totalAmount)
    };
  }, [records]);

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
              stroke="#e5e7eb"
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

        {/* 状态文本 */}
        <div className="text-center mb-4 mt-2">
          <h3 className={`text-lg font-semibold ${userStatus.color}`}>
            {userStatus.status}
          </h3>
          <p
            className="mt-1 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            {userStatus.recommendation}
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

        {/* 核心数据统计 */}
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
              <BarChart3 size={12} className="mr-1" />
              <span className="text-xs">推荐上限</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: colors.espresso }}
            >
              {effectiveMaxDaily} mg
            </span>
            {personalizedRecommendation && effectiveMaxDaily !== personalizedRecommendation && (
              <span className="text-xs truncate">
                个性化 {personalizedRecommendation}mg
              </span>
            )}
          </div>

          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              {weekData.trend > 0 ? (
                <TrendingUp size={12} className="mr-1 text-orange-500" />
              ) : weekData.trend < 0 ? (
                <TrendingDown size={12} className="mr-1 text-green-500" />
              ) : (
                <Minus size={12} className="mr-1" />
              )}
              <span className="text-xs">本周趋势</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: colors.espresso }}
            >
              {weekData.average} mg
            </span>
            <span className={`text-xs ${weekData.trend > 0 ? 'text-orange-500' : weekData.trend < 0 ? 'text-green-500' : ''}`}>
              {weekData.trend > 0 ? '+' : ''}{weekData.trend} vs上周
            </span>
          </div>

          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <div className="flex items-center justify-center mb-1">
              <Zap size={12} className="mr-1" />
              <span className="text-xs">摄入次数</span>
            </div>
            <span
              className="font-semibold text-sm block transition-colors"
              style={{ color: colors.espresso }}
            >
              {todayData.recordCount} 次
            </span>
            {todayData.averageInterval > 0 ? (
              <span className="text-xs">
                间隔 {todayData.averageInterval}h
              </span>
            ) : (
              <span className="text-xs">今日首次</span>
            )}
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
          {hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 0 && (
            <p className="text-xs mt-1">
              (约 {hoursUntilSafeSleep.toFixed(1)} 小时后达到安全阈值)
            </p>
          )}
        </div>
      </section>

      {/* 代谢与历史数据卡片 */}
      <section
        aria-labelledby="detailed-stats-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="detailed-stats-heading"
          className="text-lg font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Activity size={18} className="mr-2" /> 详细统计
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {/* 代谢信息 */}
          {metabolismInfo && (
            <div>
              <h3 className="font-medium mb-3 text-sm flex items-center" style={{ color: colors.espresso }}>
                <Timer size={16} className="mr-1.5" />
                代谢状态
              </h3>
              <div className="space-y-3 text-xs">
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>当前清除速率</span>
                    <span className="font-medium" style={{ color: colors.espresso }}>
                      {metabolismInfo.clearanceRate} mg/h
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    半衰期: {metabolismInfo.halfLife}h
                  </div>
                </div>
                
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>距上次摄入</span>
                    <span className="font-medium" style={{ color: colors.espresso }}>
                      {metabolismInfo.timeSinceLastIntake} 小时
                    </span>
                  </div>
                </div>
                
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>预计清除时间</span>
                    <span className="font-medium" style={{ color: colors.espresso }}>
                      {metabolismInfo.timeToClear} 小时
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    降至 5mg 以下
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 历史统计 */}
          {historicalStats && (
            <div>
              <h3 className="font-medium mb-3 text-sm flex items-center" style={{ color: colors.espresso }}>
                <BarChart3 size={16} className="mr-1.5" />
                历史数据
              </h3>
              <div className="space-y-3 text-xs">
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>记录天数</span>
                    <span className="font-medium" style={{ color: colors.espresso }}>
                      {historicalStats.totalDays} 天
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    总记录: {historicalStats.totalRecords} 次
                  </div>
                </div>
                
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>最高单日</span>
                    <span className="font-medium" style={{ color: colors.espresso }}>
                      {historicalStats.maxDaily} mg
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    日均: {historicalStats.avgDaily} mg
                  </div>
                </div>
                
                <div
                  className="p-3 rounded transition-colors"
                  style={{ backgroundColor: colors.bgBase }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.textMuted }}>最常饮品</span>
                    <span className="font-medium truncate ml-2 max-w-20" style={{ color: colors.espresso }} title={historicalStats.mostFrequent}>
                      {historicalStats.mostFrequent}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    累计: {historicalStats.totalAmount} mg
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
          咖啡因代谢曲线
        </h2>
        <MetabolismChart
          metabolismChartData={metabolismChartData}
          userSettings={userSettings}
          formatTime={formatTime}
          estimateAmountFromConcentration={estimateAmountFromConcentration}
          colors={colors}
        />
      </section>

      {/* 添加/编辑表单卡片 */}
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
          />
        ) : (
          <button
            onClick={handleAddRecordClick}
            className="w-full py-3 text-white rounded-md hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-md font-medium"
            style={{ backgroundColor: colors.accent }}
          >
            <Plus size={18} className="mr-1.5" /> 添加咖啡因摄入记录
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
        <h2
          id="intake-history-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Clock size={20} className="mr-2" /> 摄入历史
        </h2>

        {records.length === 0 ? (
          <p
            className="text-center py-4 transition-colors"
            style={{ color: colors.textMuted }}
          >
            暂无记录。添加您的第一条咖啡因摄入记录吧！
          </p>
        ) : (
          <ul
            className="divide-y max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full transition-colors"
            style={{
              borderColor: colors.borderSubtle,
              scrollbarColor: `${colors.borderStrong} transparent`
            }}
          >
            {records.map(record => (
              <li key={record.id} className="py-3.5 flex justify-between items-center">
                <div className="flex-1 overflow-hidden mr-2">
                  <p
                    className="font-medium text-sm truncate transition-colors"
                    style={{ color: colors.textPrimary }}
                    title={record.name}
                  >
                    {record.name} - <span style={{ color: colors.accent }}>{record.amount} mg</span>
                    {record.customName && record.drinkId && (
                      <span className="text-xs text-gray-500 ml-1 italic">
                        (来自: {drinks.find(d => d.id === record.drinkId)?.name ?? '未知饮品'})
                      </span>
                    )}
                    {!record.customName && record.drinkId && record.volume === null && (
                      <span className="text-xs text-gray-500 ml-1 italic">(手动)</span>
                    )}
                  </p>
                  <div
                    className="text-xs flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1" /> {formatDate(record.timestamp)}
                    </span>
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" /> {formatTime(record.timestamp)}
                    </span>
                    {record.volume && (
                      <span className="flex items-center">
                        <Droplet size={12} className="mr-1" /> {record.volume} ml
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditRecord(record)}
                    className="p-1.5 rounded-full hover:bg-amber-100 transition-colors duration-150"
                    style={{ color: colors.textSecondary }}
                    aria-label={`编辑 ${record.name} 记录`}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(record.id)}
                    className="p-1.5 rounded-full hover:bg-red-100 transition-colors duration-150 text-red-600"
                    aria-label={`删除 ${record.name} 记录`}
                  >
                    <Trash2 size={16} />
                  </button>
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