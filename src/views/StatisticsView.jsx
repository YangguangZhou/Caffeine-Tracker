import React, { useCallback, useMemo } from 'react';
import {
  BarChart2, ChevronLeft, ChevronRight,
  Heart, Award, Clock, Info, Calendar, AlertCircle, Target, PieChart as PieChartIcon
} from 'lucide-react';
import StatsChart from '../components/StatsChart';
import PieChart from '../components/PieChart';
import {
  getStartOfWeek, getEndOfWeek,
  getStartOfMonth, getEndOfMonth,
  getStartOfYear, getEndOfYear,
  getStartOfDay, getEndOfDay,
  formatDate
} from '../utils/timeUtils';

/**
 * 统计数据视图组件
 * 显示咖啡因摄入的统计数据和分析
 */
const StatisticsView = ({
  records,
  statsView,
  setStatsView,
  statsDate,
  setStatsDate,
  effectiveMaxDaily,
  userSettings,
  drinks,
  colors
}) => {
  // 获取特定日期的当日总摄入量
  const getDayTotal = useCallback((date) => {
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= dayStart && record.timestamp <= dayEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // 获取特定日期所在周的总摄入量
  const getWeekTotal = useCallback((date) => {
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= weekStart && record.timestamp <= weekEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // 获取特定日期所在月的总摄入量
  const getMonthTotal = useCallback((date) => {
    const monthStart = getStartOfMonth(date);
    const monthEnd = getEndOfMonth(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= monthStart && record.timestamp <= monthEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // 获取特定日期所在年的总摄入量
  const getYearTotal = useCallback((date) => {
    const yearStart = getStartOfYear(date);
    const yearEnd = getEndOfYear(date);
    return Math.round(records
      .filter(record => record && record.timestamp >= yearStart && record.timestamp <= yearEnd)
      .reduce((sum, record) => sum + record.amount, 0));
  }, [records]);

  // 获取每周每日总量
  const getWeekDailyTotals = useCallback(() => {
    const weekStart = getStartOfWeek(statsDate);
    const totals = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(currentDay.getDate() + i);
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        name: currentDay.toLocaleDateString(undefined, { weekday: 'short' }),
        value: dayTotal,
        date: currentDay,
      });
    }
    return totals;
  }, [statsDate, getDayTotal]);

  // 获取每月每日总量
  const getMonthDailyTotals = useCallback(() => {
    const monthStart = getStartOfMonth(statsDate);
    const monthEnd = getEndOfMonth(statsDate);
    const totals = [];
    const endDate = new Date(monthEnd);
    if (isNaN(monthStart) || isNaN(monthEnd) || monthEnd < monthStart) return [];
    let currentDay = new Date(monthStart);
    while (currentDay <= endDate) {
      const dayTotal = getDayTotal(currentDay);
      totals.push({
        name: currentDay.getDate().toString(),
        value: dayTotal,
        date: new Date(currentDay),
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return totals;
  }, [statsDate, getDayTotal]);

  // 获取每年每月总量
  const getYearMonthlyTotals = useCallback(() => {
    const year = statsDate.getFullYear();
    const totals = [];
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(year, i, 1);
      const monthTotal = getMonthTotal(monthDate);
      totals.push({ name: monthNames[i], value: monthTotal, monthIndex: i });
    }
    return totals;
  }, [statsDate, getMonthTotal]);

  // 统计导航
  const navigateStats = useCallback((direction) => {
    const newDate = new Date(statsDate);
    let isFutureDate = false;
    if (statsView === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
      isFutureDate = getEndOfWeek(newDate) > Date.now();
    } else if (statsView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction, 1);
      isFutureDate = getEndOfMonth(newDate) > Date.now();
    } else if (statsView === 'year') {
      newDate.setFullYear(newDate.getFullYear() + direction);
      isFutureDate = getEndOfYear(newDate) > Date.now();
    }
    if (direction > 0 && isFutureDate) {
      let startOfPeriod;
      if (statsView === 'week') startOfPeriod = getStartOfWeek(newDate);
      else if (statsView === 'month') startOfPeriod = getStartOfMonth(newDate);
      else startOfPeriod = getStartOfYear(newDate);
      if (startOfPeriod > Date.now()) return;
    }
    setStatsDate(newDate);
  }, [statsDate, statsView, setStatsDate]);

  // 格式化统计时间段
  const formatStatsPeriod = useCallback(() => {
    try {
      if (statsView === 'week') {
        const weekStart = new Date(getStartOfWeek(statsDate));
        const weekEnd = new Date(getEndOfWeek(statsDate));
        const startStr = weekStart.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        const yearStr = weekStart.getFullYear() !== weekEnd.getFullYear() ? `${weekStart.getFullYear()}/${weekEnd.getFullYear()}` : weekStart.getFullYear();
        return `${startStr} - ${endStr}, ${yearStr}`;
      } else if (statsView === 'month') {
        return statsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      } else if (statsView === 'year') {
        return statsDate.getFullYear().toString();
      }
    } catch (e) { console.error("格式化统计时间段出错:", e); return "日期错误"; }
    return '';
  }, [statsDate, statsView]);

  // 图表数据
  const statsChartData = useMemo(() => {
    try {
      if (statsView === 'week') return getWeekDailyTotals();
      if (statsView === 'month') return getMonthDailyTotals();
      if (statsView === 'year') return getYearMonthlyTotals();
    } catch (error) { console.error("准备统计图表数据时出错:", error); return []; }
    return [];
  }, [statsView, getWeekDailyTotals, getMonthDailyTotals, getYearMonthlyTotals]);

  // 计算详细统计数据
  const detailedStats = useMemo(() => {
    if (records.length === 0) return null;

    // 计算超标天数
    const dailyTotals = {};
    records.forEach(record => {
      const dateKey = new Date(record.timestamp).toDateString();
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + record.amount;
    });
    
    const totalDays = Object.keys(dailyTotals).length;
    const exceedDays = Object.values(dailyTotals).filter(total => total > effectiveMaxDaily).length;
    const exceedRate = totalDays > 0 ? (exceedDays / totalDays) * 100 : 0;

    // 计算摄入时间分布
    const hourlyDistribution = new Array(24).fill(0);
    records.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourlyDistribution[hour] += record.amount;
    });
    
    // 找出高峰时段
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const peakAmount = hourlyDistribution[peakHour];

    // 计算摄入间隔
    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
    let intervals = [];
    for (let i = 1; i < sortedRecords.length; i++) {
      const interval = (sortedRecords[i-1].timestamp - sortedRecords[i].timestamp) / (1000 * 60 * 60);
      if (interval <= 24) intervals.push(interval);
    }
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b) / intervals.length : 0;

    // 最大单次摄入
    const maxSingleIntake = Math.max(...records.map(r => r.amount));
    const maxSingleRecord = records.find(r => r.amount === maxSingleIntake);

    // 连续摄入天数
    const dates = [...new Set(records.map(r => new Date(r.timestamp).toDateString()))].sort();
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i-1]);
      const currDate = new Date(dates[i]);
      const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    // 计算当前连续摄入天数
    const today = new Date().toDateString();
    if (dates.includes(today)) {
      currentStreak = 1;
      for (let i = dates.length - 2; i >= 0; i--) {
        const date = new Date(dates[i]);
        const nextDate = new Date(dates[i + 1]);
        if ((nextDate - date) / (1000 * 60 * 60 * 24) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // 计算摄入频率分析
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // 周日到周六
    records.forEach(record => {
      const weekday = new Date(record.timestamp).getDay();
      weekdayTotals[weekday] += record.amount;
    });
    const maxWeekdayIndex = weekdayTotals.indexOf(Math.max(...weekdayTotals));
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    return {
      totalDays,
      exceedDays,
      exceedRate: Math.round(exceedRate),
      peakHour,
      peakAmount: Math.round(peakAmount),
      avgInterval: Math.round(avgInterval * 10) / 10,
      maxSingleIntake,
      maxSingleRecord,
      maxStreak,
      currentStreak,
      hourlyDistribution,
      weekdayTotals,
      maxWeekdayIndex,
      weekdayNames
    };
  }, [records, effectiveMaxDaily]);

  // 计算当前统计期间的详细数据
  const periodStats = useMemo(() => {
    if (statsChartData.length === 0) return null;

    const values = statsChartData.map(d => d.value);
    const nonZeroValues = values.filter(v => v > 0);
    
    const maxDay = Math.max(...values);
    const minDay = Math.min(...nonZeroValues);
    const avgDay = nonZeroValues.length > 0 ? nonZeroValues.reduce((a, b) => a + b) / nonZeroValues.length : 0;
    const activeDays = nonZeroValues.length;
    const totalDays = values.length;
    const consistencyRate = (activeDays / totalDays) * 100;

    // 计算标准差（数据分散程度）
    const variance = nonZeroValues.length > 0 ? 
      nonZeroValues.reduce((sum, val) => sum + Math.pow(val - avgDay, 2), 0) / nonZeroValues.length : 0;
    const stdDev = Math.sqrt(variance);

    // 找出最高和最低的日期
    const maxDayData = statsChartData.find(d => d.value === maxDay);
    const minDayData = nonZeroValues.length > 0 ? statsChartData.find(d => d.value === minDay) : null;

    return {
      maxDay: Math.round(maxDay),
      minDay: Math.round(minDay),
      avgDay: Math.round(avgDay),
      activeDays,
      totalDays,
      consistencyRate: Math.round(consistencyRate),
      stdDev: Math.round(stdDev),
      maxDayData,
      minDayData
    };
  }, [statsChartData]);

  // 咖啡因分布
  const caffeineDistribution = useMemo(() => {
    const sourceData = {};
    let totalIntake = 0;
    records.forEach(record => {
      if (!record || typeof record.amount !== 'number' || record.amount <= 0) return;
      let groupKey = '';
      let groupName = '';
      if (record.drinkId) {
        const linkedDrink = drinks.find(d => d.id === record.drinkId);
        groupKey = record.drinkId;
        groupName = linkedDrink ? linkedDrink.name : (record.customName || record.name || '未知饮品');
      } else {
        groupKey = record.customName || record.name || 'custom-manual-entry';
        groupName = record.customName || record.name || '自定义摄入';
      }
      if (!sourceData[groupKey]) {
        sourceData[groupKey] = { amount: 0, count: 0, name: groupName };
      }
      sourceData[groupKey].amount += record.amount;
      sourceData[groupKey].count += 1;
      totalIntake += record.amount;
    });
    if (totalIntake === 0) return [];
    const distributionArray = Object.entries(sourceData).map(([key, data]) => {
      return {
        id: key,
        name: data.name,
        amount: Math.round(data.amount),
        percentage: Math.round((data.amount / totalIntake) * 100)
      };
    });
    return distributionArray.sort((a, b) => b.amount - a.amount);
  }, [records, drinks]);

  // 格式化Y轴刻度
  const formatYAxisTick = (value) => Math.round(value);

  // 计算当前时间段是否是未来
  const isNextPeriodDisabled = useMemo(() => {
    const nextDate = new Date(statsDate);
    if (statsView === 'week') nextDate.setDate(nextDate.getDate() + 7);
    else if (statsView === 'month') nextDate.setMonth(nextDate.getMonth() + 1, 1);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);

    let startOfNextPeriod, startOfPeriod;
    if (statsView === 'week') startOfNextPeriod = getStartOfWeek(nextDate);
    else if (statsView === 'month') startOfPeriod = getStartOfMonth(nextDate);
    else startOfNextPeriod = getStartOfYear(nextDate);

    return startOfNextPeriod > Date.now();
  }, [statsDate, statsView]);

  return (
    <>
      {/* 时间范围选择器 */}
      <section
        aria-labelledby="stats-period-heading"
        className="mb-5 rounded-xl p-4 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => navigateStats(-1)}
            className="p-2 rounded-md transition-colors duration-150 hover:bg-gray-100"
            style={{ color: colors.textSecondary }}
            aria-label="上一个时间段"
          >
            <ChevronLeft size={18} />
          </button>
          <h2
            id="stats-period-heading"
            className="text-lg font-semibold text-center transition-colors"
            style={{ color: colors.espresso }}
          >
            {formatStatsPeriod()}
          </h2>
          <button
            onClick={() => navigateStats(1)}
            className="p-2 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            style={{ color: colors.textSecondary }}
            disabled={isNextPeriodDisabled}
            aria-label="下一个时间段"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <nav className="flex justify-center gap-2 mt-3" aria-label="统计视图切换">
          <button
            onClick={() => { setStatsView('week'); setStatsDate(new Date()); }}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'week' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`}
            style={statsView === 'week'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.bgBase, color: colors.accent }
            }
            aria-current={statsView === 'week' ? 'true' : 'false'}
          >
            周
          </button>
          <button
            onClick={() => { setStatsView('month'); setStatsDate(new Date()); }}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'month' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`}
            style={statsView === 'month'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.bgBase, color: colors.accent }
            }
            aria-current={statsView === 'month' ? 'true' : 'false'}
          >
            月
          </button>
          <button
            onClick={() => { setStatsView('year'); setStatsDate(new Date()); }}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'year' ? 'text-white shadow-sm' : 'hover:bg-amber-100'}`}
            style={statsView === 'year'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.bgBase, color: colors.accent }
            }
            aria-current={statsView === 'year' ? 'true' : 'false'}
          >
            年
          </button>
        </nav>
      </section>

      {/* 摄入概览卡片 */}
      <section
        aria-labelledby="intake-overview-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="intake-overview-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <BarChart2 size={20} className="mr-2" /> 摄入总览
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* 总摄入量 */}
          <div
            className="p-3 rounded-lg text-center shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <p
              className="text-xs transition-colors truncate"
              style={{ color: colors.textSecondary }}
            >
              总摄入
            </p>
            <p
              className="text-lg font-bold mt-1 transition-colors"
              style={{ color: colors.espresso }}
            >
              {statsView === 'week'
                ? getWeekTotal(statsDate)
                : statsView === 'month'
                  ? getMonthTotal(statsDate)
                  : getYearTotal(statsDate)
              } mg
            </p>
          </div>
          {/* 日均摄入量 */}
          <div
            className="p-3 rounded-lg text-center shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <p
              className="text-xs transition-colors truncate"
              style={{ color: colors.textSecondary }}
            >
              日均
            </p>
            <p
              className="text-lg font-bold mt-1 transition-colors"
              style={{ color: colors.espresso }}
            >
              {(() => {
                let total = 0;
                let days = 0;
                if (statsView === 'week') { total = getWeekTotal(statsDate); days = 7; }
                else if (statsView === 'month') { total = getMonthTotal(statsDate); days = new Date(statsDate.getFullYear(), statsDate.getMonth() + 1, 0).getDate(); }
                else { total = getYearTotal(statsDate); const year = statsDate.getFullYear(); days = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365; }
                return days > 0 && total > 0 ? Math.round(total / days) : 0;
              })()} mg
            </p>
          </div>
          {/* 最高单日/月 */}
          {periodStats && (
            <div
              className="p-3 rounded-lg text-center shadow-inner transition-colors"
              style={{ backgroundColor: colors.bgBase }}
            >
              <p
                className="text-xs transition-colors truncate"
                style={{ color: colors.textSecondary }}
              >
                期间最高{statsView === 'month' ? '日' : ''}
              </p>
              <p
                className="text-lg font-bold mt-1 transition-colors"
                style={{ color: colors.espresso }}
              >
                {periodStats.maxDay} mg
              </p>
              {periodStats.maxDayData?.name && (
                <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                  {periodStats.maxDayData.name}
                </p>
              )}
            </div>
          )}
          {/* 活跃天数/月数 */}
          {periodStats && (
            <div
              className="p-3 rounded-lg text-center shadow-inner transition-colors"
              style={{ backgroundColor: colors.bgBase }}
            >
              <p
                className="text-xs transition-colors truncate"
                style={{ color: colors.textSecondary }}
              >
                {statsView === 'year' ? '活跃月数' : '活跃天数'}
              </p>
              <p
                className="text-lg font-bold mt-1 transition-colors"
                style={{ color: colors.espresso }}
              >
                {periodStats.activeDays}/{periodStats.totalDays}
              </p>
              <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                一致性 {periodStats.consistencyRate}%
              </p>
            </div>
          )}
        </div>
        {/* 图表容器 */}
        <div
          className="p-4 rounded-lg mt-4 min-h-[300px] transition-colors"
          style={{ backgroundColor: colors.bgBase }}
        >
          <StatsChart
            data={statsChartData}
            view={statsView}
            effectiveMaxDaily={effectiveMaxDaily}
            formatYAxisTick={formatYAxisTick}
            colors={colors}
          />
        </div>
      </section>

      {/* 摄入来源分析卡片 */}
      <section
        aria-labelledby="source-analysis-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="source-analysis-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <PieChartIcon size={20} className="mr-2" /> 摄入来源分析 (所有记录)
        </h3>
        
        {caffeineDistribution.length > 0 ? (
          <PieChart data={caffeineDistribution} colors={colors} />
        ) : (
          <div
            className="text-center py-8 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <PieChartIcon size={48} className="mx-auto mb-3 opacity-50" />
            <p>没有足够的记录进行分析。</p>
            <p className="text-xs mt-1">开始记录您的咖啡因摄入来获得详细分析。</p>
          </div>
        )}
      </section>

      {/* 详细统计分析卡片 */}
      {detailedStats && (
        <section
          aria-labelledby="detailed-stats-heading"
          className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.borderSubtle
          }}
        >
          <h3
            id="detailed-stats-heading"
            className="text-xl font-semibold mb-4 flex items-center transition-colors"
            style={{ color: colors.espresso }}
          >
            <BarChart2 size={20} className="mr-2" /> 详细统计分析
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
            {/* 超标分析 */}
            <div
              className="p-3 rounded-lg transition-colors"
              style={{ backgroundColor: colors.bgBase }}
            >
              <h4 className="font-semibold mb-3 flex items-center text-sm" style={{ color: colors.espresso }}>
                <AlertCircle size={14} className="mr-1" />
                超标分析
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: colors.textSecondary }}>
                <div className="text-center">
                  <div className="text-xs mb-1">记录天数</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.totalDays}天
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">超标天数</div>
                  <div className={`font-medium ${detailedStats.exceedDays > 0 ? 'text-orange-600' : ''}`} 
                        style={{ color: detailedStats.exceedDays > 0 ? undefined : colors.espresso }}>
                    {detailedStats.exceedDays}天
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">超标率</div>
                  <div className={`font-medium ${detailedStats.exceedRate > 20 ? 'text-red-600' : detailedStats.exceedRate > 10 ? 'text-orange-600' : ''}`}
                        style={{ color: detailedStats.exceedRate <= 10 ? colors.espresso : undefined }}>
                    {detailedStats.exceedRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* 摄入模式 */}
            <div
              className="p-3 rounded-lg transition-colors"
              style={{ backgroundColor: colors.bgBase }}
            >
              <h4 className="font-semibold mb-3 flex items-center text-sm" style={{ color: colors.espresso }}>
                <Clock size={14} className="mr-1" />
                摄入模式
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: colors.textSecondary }}>
                <div className="text-center">
                  <div className="text-xs mb-1">高峰时段</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.peakHour}:00
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">高峰摄入</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.peakAmount}mg
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">平均间隔</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.avgInterval}h
                  </div>
                </div>
              </div>
            </div>

            {/* 摄入记录 */}
            <div
              className="p-3 rounded-lg transition-colors"
              style={{ backgroundColor: colors.bgBase }}
            >
              <h4 className="font-semibold mb-3 flex items-center text-sm" style={{ color: colors.espresso }}>
                <Target size={14} className="mr-1" />
                摄入记录
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: colors.textSecondary }}>
                <div className="text-center">
                  <div className="text-xs mb-1">最大单次</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.maxSingleIntake}mg
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">最长连续</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.maxStreak}天
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">当前连续</div>
                  <div className="font-medium" style={{ color: colors.espresso }}>
                    {detailedStats.currentStreak}天
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 周度分析 */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3 text-sm" style={{ color: colors.espresso }}>
              星期分布分析
            </h4>
            <div className="grid grid-cols-7 gap-2">
              {detailedStats.weekdayTotals.map((amount, index) => {
                const maxAmount = Math.max(...detailedStats.weekdayTotals);
                const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                const isMax = index === detailedStats.maxWeekdayIndex;
                return (
                  <div key={index} className="text-center">
                    <div
                      className="h-16 rounded transition-colors mb-1 flex items-end justify-center"
                      style={{
                        backgroundColor: amount > 0 ? (isMax ? colors.accent : colors.grid) : colors.borderSubtle
                      }}
                    >
                      <div
                        className="w-full rounded transition-all duration-500"
                        style={{
                          height: `${Math.max(percentage, 5)}%`,
                          backgroundColor: amount > 0 ? (isMax ? colors.accent : colors.safe) : 'transparent'
                        }}
                        title={`${detailedStats.weekdayNames[index]}: ${Math.round(amount)}mg`}
                      />
                    </div>
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      {detailedStats.weekdayNames[index]}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: colors.textMuted }}>
              最常摄入: {detailedStats.weekdayNames[detailedStats.maxWeekdayIndex]} 
              ({Math.round(detailedStats.weekdayTotals[detailedStats.maxWeekdayIndex])}mg)
            </p>
          </div>

          {/* 时间分布图 */}
          <div>
            <h4 className="font-semibold mb-3 text-sm" style={{ color: colors.espresso }}>
              24小时摄入分布
            </h4>
            <div className="grid grid-cols-12 gap-1 mb-2">
              {detailedStats.hourlyDistribution.map((amount, hour) => {
                const maxAmount = Math.max(...detailedStats.hourlyDistribution);
                const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                return (
                  <div key={hour} className="flex flex-col items-center">
                    <div
                      className="w-full rounded-t transition-colors mb-1"
                      style={{
                        height: `${Math.max(height, 2)}px`,
                        backgroundColor: amount > 0 ? colors.accent : colors.borderSubtle,
                        minHeight: '2px',
                        maxHeight: '40px'
                      }}
                      title={`${hour}:00 - ${Math.round(amount)}mg`}
                    />
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      {hour}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-center" style={{ color: colors.textMuted }}>
              高峰时段: {detailedStats.peakHour}:00 ({detailedStats.peakAmount}mg)
            </p>
          </div>
        </section>
      )}

      {/* 健康分析报告卡片 */}
      <section
        aria-labelledby="health-analysis-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="health-analysis-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Heart size={20} className="mr-2" /> 健康分析与建议
        </h3>
        <div
          className="space-y-4 text-sm transition-colors"
          style={{ color: colors.textSecondary }}
        >
          <article
            aria-labelledby="pattern-assessment-heading"
            className="p-4 rounded-lg shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <h4
              id="pattern-assessment-heading"
              className="font-semibold mb-1 flex items-center transition-colors"
              style={{ color: colors.espresso }}
            >
              <Award size={16} className="mr-1.5" /> 摄入模式分析
            </h4>
            <p>
              {records.length > 0
                ? `您的每日推荐上限为 ${effectiveMaxDaily}mg。本周日均摄入 ${Math.round(getWeekTotal(new Date()) / 7)}mg${Math.round(getWeekTotal(new Date()) / 7) > effectiveMaxDaily ? '，建议适当减少摄入量' : '，保持良好'}。`
                : "开始记录摄入量，获取个性化分析建议。"
              }
              {caffeineDistribution[0]?.name && ` 主要来源：${caffeineDistribution[0].name} (${caffeineDistribution[0].percentage}%)。`}
            </p>
          </article>
          <article
            aria-labelledby="sleep-impact-heading"
            className="p-4 rounded-lg shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <h4
              id="sleep-impact-heading"
              className="font-semibold mb-1 flex items-center transition-colors"
              style={{ color: colors.espresso }}
            >
              <Clock size={16} className="mr-1.5" /> 睡眠影响提醒
            </h4>
            <p>
              基于您设置的 {userSettings.caffeineHalfLifeHours} 小时半衰期，建议在体内咖啡因降至 
              <strong style={{ color: colors.espresso }}> {userSettings.safeSleepThresholdConcentration.toFixed(1)} mg/L </strong>
              后入睡。计划 <strong className="text-blue-700">{userSettings.plannedSleepTime}</strong> 睡觉的话，
              请关注首页的最佳睡眠时间提醒。一般建议睡前 6 小时避免摄入咖啡因。
            </p>
          </article>
        </div>
      </section>

      {/* 咖啡因知识卡片 */}
      <section
        aria-labelledby="caffeine-knowledge-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="caffeine-knowledge-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Info size={20} className="mr-2" /> 咖啡因知识库
        </h3>
        <ul
          className="space-y-2 text-sm list-disc list-inside transition-colors"
          style={{ color: colors.textSecondary }}
        >
          <li>
            <strong>推荐摄入量:</strong> FDA/Mayo Clinic 建议健康成人每日不超过
            <strong style={{ color: colors.espresso }}> 400mg</strong>。
            个性化推荐可按 <strong style={{ color: colors.espresso }}>3-6 mg/kg</strong>
            体重计算 (本应用默认使用
            <strong style={{ color: colors.espresso }}> {userSettings.recommendedDosePerKg} mg/kg</strong>，
            可在设置中调整)。
          </li>
          <li>
            <strong>半衰期 (t½):</strong> 健康成人血浆半衰期平均约为
            <strong style={{ color: colors.espresso }}> 5 小时</strong> (范围 1.5-9.5 小时)。
            这是体内咖啡因量减少一半所需时间。您可以在设置中调整此值以匹配个人情况。
          </li>
          <li>
            <strong>代谢模型:</strong> 本应用使用一级消除动力学模型 (
            <strong style={{ color: colors.espresso }}>C(t) = C₀ * (0.5)^(t / t_half)</strong>,
            其中 k = ln(2)/t½) 来估算体内咖啡因残留量。
          </li>
          <li>
            <strong>睡眠阈值:</strong> 多数研究建议睡前
            <strong style={{ color: colors.espresso }}> 6 小时</strong> 避免摄入。
            本应用通过计算当前咖啡因含量降至设定的安全浓度阈值 (
            <strong style={{ color: colors.espresso }}>{userSettings.safeSleepThresholdConcentration.toFixed(1)} mg/L</strong>)
            所需时间来提供建议睡眠时间。此阈值可在设置中调整。
          </li>
          <li>
            <strong>浓度估算:</strong> 体内浓度 (mg/L) 可通过
            <strong style={{ color: colors.espresso }}> 剂量(mg) / (分布容积(L/kg) * 体重(kg))</strong> 估算。
            典型分布容积 (Vd) 约为
            <strong style={{ color: colors.espresso }}> 0.6 L/kg</strong> (可在设置调整)。
          </li>
          <li>
            <strong>清除时间:</strong> 大约需要
            <strong style={{ color: colors.espresso }}> 5 个半衰期</strong>
            (约 {(5 * userSettings.caffeineHalfLifeHours).toFixed(1)} 小时)
            才能将体内咖啡因基本清除 (降至初始量的约 3%)。
          </li>
        </ul>
      </section>
    </>
  );
};

export default StatisticsView;