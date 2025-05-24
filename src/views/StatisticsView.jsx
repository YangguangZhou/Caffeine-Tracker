import React, { useCallback, useMemo } from 'react';
import {
  BarChart2, ChevronLeft, ChevronRight,
  PieChart, Heart, Award, Clock, Info, Calendar
} from 'lucide-react';
import StatsChart from '../components/StatsChart';
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
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* 总摄入量 */}
          <div
            className="p-4 rounded-lg text-center shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <p
              className="text-sm transition-colors"
              style={{ color: colors.textSecondary }}
            >
              {statsView === 'week'
                ? '本周总摄入'
                : statsView === 'month'
                  ? '本月总摄入'
                  : '本年总摄入'
              }
            </p>
            <p
              className="text-2xl font-bold mt-1 transition-colors"
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
            className="p-4 rounded-lg text-center shadow-inner transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            <p
              className="text-sm transition-colors"
              style={{ color: colors.textSecondary }}
            >
              {statsView === 'week'
                ? '日均 (本周)'
                : statsView === 'month'
                  ? '日均 (本月)'
                  : '日均 (本年)'
              }
            </p>
            <p
              className="text-2xl font-bold mt-1 transition-colors"
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
          <PieChart size={20} className="mr-2" /> 摄入来源分析 (所有记录)
        </h3>
        <ul className="space-y-3">
          {caffeineDistribution.length > 0 ? (
            caffeineDistribution.slice(0, 7).map((item, index) => (
              <li key={item.id} className="flex items-center text-sm">
                <span
                  className="w-28 truncate pr-2 transition-colors"
                  style={{ color: colors.textSecondary }}
                  title={item.name}
                >
                  {item.name}
                </span>
                <div className="flex-1 mx-2" aria-label={`${item.name} 摄入量占比`}>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: [
                          colors.espresso, colors.latte, colors.cappuccino, colors.accent,
                          colors.grid, colors.warning, colors.danger
                        ][index % 7]
                      }}
                      role="progressbar"
                      aria-valuenow={item.percentage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`${item.percentage}%`}
                    ></div>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span
                    className="font-medium transition-colors"
                    style={{ color: colors.espresso }}
                  >
                    {item.percentage}%
                  </span>
                  <span
                    className="text-xs transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    ({item.amount}mg)
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li>
              <p
                className="text-center py-3 transition-colors"
                style={{ color: colors.textMuted }}
              >
                没有足够的记录进行分析。
              </p>
            </li>
          )}
        </ul>
      </section>

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
          <Heart size={20} className="mr-2" /> 健康分析与洞察
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
              <Award size={16} className="mr-1.5" /> 摄入模式评估
            </h4>
            <p>
              {records.length > 0
                ? `根据您的历史记录，${caffeineDistribution[0]?.name
                  ? `您的主要咖啡因来源似乎是 ${caffeineDistribution[0].name} (${caffeineDistribution[0].percentage}%)。`
                  : '您的咖啡因来源较为多样。'
                }`
                : "您还没有添加任何摄入记录。"
              }
              {records.length > 0 && ` 您设定的每日推荐上限为 ${effectiveMaxDaily}mg (综合通用指南${userSettings.recommendedDosePerKg
                ? `和体重推荐 ${Math.round(userSettings.weight * userSettings.recommendedDosePerKg)}mg`
                : ''
                })。本周您的日均摄入量约为 ${Math.round(getWeekTotal(new Date()) / 7)
                }mg。请关注统计图表，了解您是否经常超过推荐量。`}
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
              <Clock size={16} className="mr-1.5" /> 睡眠影响考量
            </h4>
            <p>
              咖啡因的半衰期设定为
              <strong style={{ color: colors.espresso }}> {userSettings.caffeineHalfLifeHours} 小时</strong>。
              当前计算的建议最早睡眠时间依赖于体内咖啡因浓度降至
              <strong style={{ color: colors.espresso }}> {userSettings.safeSleepThresholdConcentration.toFixed(1)} mg/L </strong>
              所需的时间估算。如果您计划在
              <strong className="text-blue-700"> {userSettings.plannedSleepTime} </strong>
              左右入睡，请留意当前体内咖啡因含量是否过高。通常建议睡前 6 小时避免摄入咖啡因。
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