import React, { useCallback, useMemo, useState } from 'react';
import {
  BarChart2, ChevronLeft, ChevronRight,
  Heart, Award, Clock, Info, AlertCircle, Target, PieChart as PieChartIcon,
  Users, Coffee, Sparkles, TrendingUp, TrendingDown, Calendar, Percent, Moon, Droplet, Zap, Brain, Activity as ActivityIcon // Added ActivityIcon for motivational message
} from 'lucide-react';
import StatsChart from '../components/StatsChart';
import PieChart from '../components/PieChart';
import MathFormula from '../components/MathFormula';
import {
  getStartOfWeek, getEndOfWeek,
  getStartOfMonth, getEndOfMonth,
  getStartOfYear, getEndOfYear,
  getStartOfDay, getEndOfDay,
} from '../utils/timeUtils';
import { computeCaffeineDistribution } from '../utils/distributionUtils';

const MIN_RECORD_DAYS = 3;

const Gauge = ({ value, maxValue, label, unit, size = 80, strokeWidth = 8, colors }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const validValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const validMaxValue = typeof maxValue === 'number' && !isNaN(maxValue) && maxValue > 0 ? maxValue : 1; // Avoid division by zero

  const progress = Math.min(validValue / validMaxValue, 1);
  const offset = circumference * (1 - progress * 0.75); // 0.75 makes it a 3/4 circle

  let color = colors.safe;
  if (progress > 0.5) color = colors.infoText;
  if (progress > 0.8) color = colors.warningText;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.9}`}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.borderSubtle}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - 0.75)}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${label})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        <text
          x="50%"
          y="50%"
          dy="0.1em"
          textAnchor="middle"
          className="text-lg font-bold"
          fill={color}
        >
          {Math.round(value)}
        </text>
        <text
          x="50%"
          y="50%"
          dy="1.6em"
          textAnchor="middle"
          className="text-xs"
          fill={colors.textMuted}
        >
          {unit}
        </text>
      </svg>
      <p className="text-xs font-medium mt-1 text-center" style={{ color: colors.textSecondary }}>{label}</p>
    </div>
  );
};


/**
 * 激励信息组件
 */
const MotivationalMessage = ({ colors, title, requiredDays, icon }) => (
  <div className="text-center py-10 px-4" style={{ color: colors.textMuted }}>
    {icon}
    <h4 className="text-lg font-semibold mb-2" style={{ color: colors.espresso }}>{title}</h4>
    <p className="mb-1">
      再坚持记录 <strong style={{ color: colors.accent }}>{Math.max(1, requiredDays)}</strong> 天，就能解锁详细分析啦！
    </p>
    <p className="text-sm">数据越多，分析越准。继续记录更多数据，发现您的咖啡因摄入模式！</p>
  </div>
);


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
  const [pieChartSortBy, setPieChartSortBy] = useState('count'); // 'count', 'amount'
  const [selectedWeekday, setSelectedWeekday] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);

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
        
        const startMonth = weekStart.getMonth() + 1;
        const startDay = weekStart.getDate();
        const endMonth = weekEnd.getMonth() + 1;
        const endDay = weekEnd.getDate();
        const year = weekStart.getFullYear();
        const endYear = weekEnd.getFullYear();
        
        if (year !== endYear) {
          // 跨年
          return `${year}年${startMonth}月${startDay}日 - ${endYear}年${endMonth}月${endDay}日`;
        } else if (startMonth !== endMonth) {
          // 跨月但同年
          return `${year}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
        } else {
          // 同月
          return `${year}年${startMonth}月${startDay}日 - ${endDay}日`;
        }
      } else if (statsView === 'month') {
        // 格式化为：2025年11月
        return `${statsDate.getFullYear()}年${statsDate.getMonth() + 1}月`;
      } else if (statsView === 'year') {
        // 格式化为：2025年
        return `${statsDate.getFullYear()}年`;
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
      const recordDate = new Date(record.timestamp);
      if (isNaN(recordDate.getTime())) {
        console.warn('Invalid timestamp in record for dailyTotals:', record);
        return;
      }
      const dateKey = recordDate.toDateString();
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + record.amount;
    });

    // 获取所有有摄入的天的“天起始时间戳”，去重并排序
    const uniqueDayTimestamps = [...new Set(
      Object.keys(dailyTotals)
        .map(dateStr => {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return null;
          const dayStartTimestamp = getStartOfDay(date); // Returns a number
          return (typeof dayStartTimestamp === 'number' && !isNaN(dayStartTimestamp)) ? dayStartTimestamp : null;
        })
        .filter(ts => typeof ts === 'number' && !isNaN(ts))
    )].sort((a, b) => a - b);

    // 计算最长连续天数
    let maxStreak = 0;
    if (uniqueDayTimestamps.length > 0) {
      let currentStreakCount = 1;
      maxStreak = 1;
      for (let i = 1; i < uniqueDayTimestamps.length; i++) {
        const prev = uniqueDayTimestamps[i - 1];
        const curr = uniqueDayTimestamps[i];
        // 判断是否是连续的天
        if (curr - prev === 24 * 60 * 60 * 1000) {
          currentStreakCount++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreakCount);
          currentStreakCount = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreakCount);
    }

    // 计算超标天数
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
      const interval = (sortedRecords[i - 1].timestamp - sortedRecords[i].timestamp) / (1000 * 60 * 60);
      if (interval <= 24) intervals.push(interval);
    }
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b) / intervals.length : 0;

    // 最大单次摄入
    const maxSingleIntake = Math.max(...records.map(r => r.amount));

    // 1. 获取所有记录的日期，确保它们是当天的开始时间，并去重
    const uniqueDayTimestampsForStreak = [...new Set(
      records
        .map(r => {
          const recordDate = new Date(r.timestamp);
          if (isNaN(recordDate.getTime())) {
            console.warn('Invalid timestamp found in record for streak calculation:', r);
            return null;
          }
          const dayStartTimestamp = getStartOfDay(recordDate); // Returns a number
          return (typeof dayStartTimestamp === 'number' && !isNaN(dayStartTimestamp)) ? dayStartTimestamp : null;
        })
        .filter(ts => ts !== null)
    )].sort((a, b) => a - b);

    // 2. 计算最长连续天数 (maxStreak - 使用上面已有的 maxStreak 变量)

    // 3. 计算当前连续摄入天数 (currentStreak)
    let currentStreak = 0;
    const today = new Date();
    const todayStartTimestamp = getStartOfDay(today); // Returns a number

    if (typeof todayStartTimestamp === 'number' && !isNaN(todayStartTimestamp)) {
      // 使用 uniqueDayTimestampsForStreak 进行检查
      const uniqueDateStringsForStreak = uniqueDayTimestampsForStreak.map(ts => new Date(ts).toDateString());

      if (uniqueDateStringsForStreak.includes(new Date(todayStartTimestamp).toDateString())) {
        currentStreak = 1;
        let dayToCheckTimestamp = todayStartTimestamp;
        for (let i = 1; i < 365; i++) { // 最多检查过去365天
          dayToCheckTimestamp -= (24 * 60 * 60 * 1000); // 前一天的时间戳
          if (uniqueDateStringsForStreak.includes(new Date(dayToCheckTimestamp).toDateString())) {
            currentStreak++;
          } else {
            break; // 中断
          }
        }
      }
    } else {
      console.warn('Failed to get start of today for currentStreak calculation.');
    }


    // 计算摄入频率分析
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // 周日到周六
    records.forEach(record => {
      const weekday = new Date(record.timestamp).getDay();
      weekdayTotals[weekday] += record.amount;
    });
    const maxWeekdayIndex = weekdayTotals.indexOf(Math.max(...weekdayTotals));
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const avgPerIntake = totalAmount / records.length; // 平均每次摄入量

    // 计算平均每日摄入量
    const avgDailyAmount = totalDays > 0 ? totalAmount / totalDays : 0;

    // 计算平均每天摄入时间（以小时为单位）
    const intakeHours = records.map(r => new Date(r.timestamp).getHours() + new Date(r.timestamp).getMinutes() / 60);
    const avgIntakeTime = intakeHours.length > 0 ? intakeHours.reduce((sum, hour) => sum + hour, 0) / intakeHours.length : 0;

    // 计算平均摄入后睡眠前残留咖啡因量
    const sleepHour = parseInt(userSettings.plannedSleepTime.split(':')[0]) || 23;
    const sleepMinute = parseInt(userSettings.plannedSleepTime.split(':')[1]) || 0;
    const sleepTimeInHours = sleepHour + sleepMinute / 60;

    let avgCaffeineAtSleep = 0;
    if (records.length > 0) {
      const caffeineAtSleepValues = records.map(record => {
        const intakeTime = new Date(record.timestamp);
        const intakeHour = intakeTime.getHours() + intakeTime.getMinutes() / 60;

        // 计算从摄入到睡眠的时间差
        let timeDiff = sleepTimeInHours - intakeHour;
        if (timeDiff < 0) timeDiff += 24; // 处理跨天情况

        // 使用指数衰减公式计算残留量
        const halfLife = userSettings.caffeineHalfLifeHours;
        const remainingCaffeine = record.amount * Math.pow(0.5, timeDiff / halfLife);

        return remainingCaffeine;
      });

      avgCaffeineAtSleep = caffeineAtSleepValues.reduce((sum, val) => sum + val, 0) / caffeineAtSleepValues.length;
    }

    return {
      totalDays,
      exceedDays,
      exceedRate: Math.round(exceedRate),
      peakHour,
      peakAmount: Math.round(peakAmount),
      avgInterval: Math.round(avgInterval * 10) / 10,
      maxSingleIntake,
      maxStreak,
      currentStreak,
      hourlyDistribution,
      weekdayTotals,
      maxWeekdayIndex,
      weekdayNames,
      avgPerIntake: Math.round(avgPerIntake),
      avgDailyAmount: Math.round(avgDailyAmount),
      avgIntakeTime: Math.round(avgIntakeTime * 10) / 10,
      avgCaffeineAtSleep: Math.round(avgCaffeineAtSleep)
    };
  }, [records, effectiveMaxDaily, userSettings]);

  // 计算咖啡因生活方式分析
  const lifestyleAnalysis = useMemo(() => {
    if (records.length === 0) return null;

    // 计算总记录天数
    const dates = [...new Set(records.map(r => new Date(r.timestamp).toDateString()))];
    const totalDays = dates.length;

    // 计算平均每日摄入量和次数
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const avgDailyAmount = totalDays > 0 ? totalAmount / totalDays : 0; // 避免除以0
    const avgDailyCount = totalDays > 0 ? records.length / totalDays : 0; // 避免除以0

    // 计算周末vs工作日模式
    let weekdayTotal = 0, weekendTotal = 0;
    let weekdayRecordCount = 0, weekendRecordCount = 0; // 用于计算平均值，而非天数
    const weekdayDays = new Set();
    const weekendDays = new Set();

    records.forEach(record => {
      const date = new Date(record.timestamp);
      const day = date.getDay();
      const dateString = date.toDateString();

      if (day === 0 || day === 6) { // 周日或周六
        weekendTotal += record.amount;
        weekendRecordCount++;
        weekendDays.add(dateString);
      } else { // 工作日
        weekdayTotal += record.amount;
        weekdayRecordCount++;
        weekdayDays.add(dateString);
      }
    });

    // 使用实际有记录的天数来计算平均值
    const numWeekdayDays = weekdayDays.size;
    const numWeekendDays = weekendDays.size;

    const weekdayAvg = numWeekdayDays > 0 ? weekdayTotal / numWeekdayDays : 0;
    const weekendAvg = numWeekendDays > 0 ? weekendTotal / numWeekendDays : 0;

    // 判断用户类型
    let userType = '';
    let typeDescription = '';
    let typeAdvice = '';

    if (avgDailyAmount < 100) {
      userType = '轻度消费者';
      typeDescription = '您的咖啡因摄入量较低，保持适度即可。';
      typeAdvice = '继续保持健康的摄入习惯，必要时可适度增加以提高工作效率。';
    } else if (avgDailyAmount < 200) {
      userType = '适度爱好者';
      typeDescription = '您的摄入量在健康范围内，是理想的咖啡因使用者。';
      typeAdvice = '当前摄入模式很健康，注意保持规律性即可。';
    } else if (avgDailyAmount < 300) {
      userType = '常规消费者';
      typeDescription = '您是典型的咖啡因日常使用者。';
      typeAdvice = '建议监控摄入时间，避免影响睡眠质量。';
    } else if (avgDailyAmount < 400) {
      userType = '高频依赖者';
      typeDescription = '您的摄入量偏高，需要关注耐受性问题。';
      typeAdvice = '考虑逐步减少摄入量，或定期进行咖啡因戒断以重置耐受性。';
    } else {
      userType = '重度使用者';
      typeDescription = '您的摄入量超过推荐范围，可能存在依赖。';
      typeAdvice = '强烈建议制定减量计划，必要时咨询医生。';
    }

    // 判断周末模式
    let weekendPattern = '';
    if (numWeekdayDays === 0 && numWeekendDays === 0) {
      weekendPattern = '数据不足';
    } else if (numWeekdayDays === 0) {
      weekendPattern = '仅周末摄入';
    } else if (numWeekendDays === 0) {
      weekendPattern = '仅工作日摄入';
    } else if (Math.abs(weekdayAvg - weekendAvg) < (avgDailyAmount * 0.15)) { // 差异小于平均值的15%
      weekendPattern = '稳定型';
    } else if (weekendAvg > weekdayAvg) {
      weekendPattern = '周末补偿型';
    } else {
      weekendPattern = '工作日集中型';
    }

    return {
      userType,
      typeDescription,
      typeAdvice,
      avgDailyAmount: Math.round(avgDailyAmount),
      avgDailyCount: Math.round(avgDailyCount * 10) / 10,
      weekdayAvg: Math.round(weekdayAvg),
      weekendAvg: Math.round(weekendAvg),
      weekendPattern,
      totalDays
    };
  }, [records]);

  // 计算当前统计期间的详细数据
  const periodStats = useMemo(() => {
    if (statsChartData.length === 0) return null;

    const values = statsChartData.map(d => d.value);
    const nonZeroValues = values.filter(v => v > 0);

    const maxDay = Math.max(...values);
    const minDay = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    const avgDay = nonZeroValues.length > 0 ? nonZeroValues.reduce((a, b) => a + b) / nonZeroValues.length : 0;
    const activeDays = nonZeroValues.length;

    // 计算已过去的天数，不包括未来的日期
    const now = new Date();
    let pastDays = 0;

    if (statsView === 'week') {
      const weekStart = getStartOfWeek(statsDate);
      const weekEnd = getEndOfWeek(statsDate);
      const periodEnd = Math.min(weekEnd, now.getTime());
      pastDays = Math.max(0, Math.ceil((periodEnd - weekStart) / (24 * 60 * 60 * 1000)));
    } else if (statsView === 'month') {
      const monthStart = getStartOfMonth(statsDate);
      const monthEnd = getEndOfMonth(statsDate);
      const periodEnd = Math.min(monthEnd, now.getTime());
      pastDays = Math.max(0, Math.ceil((periodEnd - monthStart) / (24 * 60 * 60 * 1000)));
    } else if (statsView === 'year') {
      const yearStart = getStartOfYear(statsDate);
      const yearEnd = getEndOfYear(statsDate);
      const periodEnd = Math.min(yearEnd, now.getTime());
      // 对于年度统计，计算已过去的月数
      const startMonth = new Date(yearStart).getMonth();
      const endMonth = new Date(periodEnd).getMonth();
      const endYear = new Date(periodEnd).getFullYear();
      const statsYear = statsDate.getFullYear();
      if (endYear === statsYear) {
        pastDays = endMonth - startMonth + 1;
      } else {
        pastDays = 12; // 整年
      }
    }

    const totalDays = values.length;
    const consistencyRate = pastDays > 0 ? (activeDays / pastDays) * 100 : 0;

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
      pastDays,
      consistencyRate: Math.round(consistencyRate),
      stdDev: Math.round(stdDev),
      maxDayData,
      minDayData
    };
  }, [statsChartData]);

  // 修改咖啡因分布，支持多种排序方式
  const caffeineDistribution = useMemo(
    () => computeCaffeineDistribution(records, drinks, pieChartSortBy),
    [records, drinks, pieChartSortBy]
  );

  // 格式化Y轴刻度
  const formatYAxisTick = (value) => Math.round(value);

  // 计算当前时间段是否是未来
  const isNextPeriodDisabled = useMemo(() => {
    const nextDate = new Date(statsDate);
    if (statsView === 'week') nextDate.setDate(nextDate.getDate() + 7);
    else if (statsView === 'month') nextDate.setMonth(nextDate.getMonth() + 1, 1);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);

    let startOfNextPeriod;
    if (statsView === 'week') startOfNextPeriod = getStartOfWeek(nextDate);
    else if (statsView === 'month') startOfNextPeriod = getStartOfMonth(nextDate);
    else startOfNextPeriod = getStartOfYear(nextDate);

    return startOfNextPeriod > Date.now();
  }, [statsDate, statsView]);

  // 辅助函数：计算建议停止摄入时间
  const calculateStopTime = (plannedSleepTimeStr, hoursBefore) => {
    if (!plannedSleepTimeStr || typeof plannedSleepTimeStr !== 'string' || !plannedSleepTimeStr.includes(':')) {
      return "特定时间";
    }
    const parts = plannedSleepTimeStr.split(':');
    if (parts.length !== 2) return "特定时间";

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return "特定时间";

    const plannedDate = new Date();
    plannedDate.setHours(hours, minutes, 0, 0);
    plannedDate.setHours(plannedDate.getHours() - hoursBefore);
    return `${String(plannedDate.getHours()).padStart(2, '0')}:${String(plannedDate.getMinutes()).padStart(2, '0')}`;
  };

  // 辅助组件：用于展示单个详细统计指标
  const StatItem = ({ icon, label, value, unit, colorClass = '' }) => (
    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: colors.bgBase }}>
      <div className="flex items-center justify-center mb-1" style={{ color: colors.accent }}>
        {icon}
      </div>
      <p className="text-xs font-medium truncate" style={{ color: colors.textSecondary }}>
        {label}
      </p>
      <p className={`text-sm font-bold mt-1 ${colorClass}`} style={{ color: !colorClass ? colors.espresso : undefined }}>
        {value} <span className="text-xs font-normal">{unit}</span>
      </p>
    </div>
  );


  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 w-full">
      {/* 摄入概览卡片 - 包含时间范围选择 */}
      <section
        aria-labelledby="intake-overview-heading"
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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

        {/* 时间范围选择器 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => navigateStats(-1)}
              className="p-2 rounded-md transition-colors duration-150"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.borderSubtle}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="上一个时间段"
            >
              <ChevronLeft size={18} />
            </button>
            <h2
              className="text-base font-semibold text-center transition-colors"
              style={{ color: colors.textPrimary }}
            >
              {formatStatsPeriod()}
            </h2>
            <button
              onClick={() => navigateStats(1)}
              className="p-2 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: colors.textSecondary }}
              disabled={isNextPeriodDisabled}
              onMouseEnter={(e) => {
                if (!isNextPeriodDisabled) {
                  e.currentTarget.style.backgroundColor = colors.borderSubtle;
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="下一个时间段"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <nav className="flex justify-center gap-2" aria-label="统计视图切换">
            <button
              onClick={() => { setStatsView('week'); setStatsDate(new Date()); }}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'week' ? 'text-white shadow-sm' : ''}`}
              style={statsView === 'week'
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.bgBase, color: colors.accent }
              }
              onMouseEnter={(e) => {
                if (statsView !== 'week') {
                  e.currentTarget.style.backgroundColor = colors.borderSubtle;
                }
              }}
              onMouseLeave={(e) => {
                if (statsView !== 'week') {
                  e.currentTarget.style.backgroundColor = colors.bgBase;
                }
              }}
              aria-current={statsView === 'week' ? 'true' : 'false'}
            >
              周
            </button>
            <button
              onClick={() => { setStatsView('month'); setStatsDate(new Date()); }}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'month' ? 'text-white shadow-sm' : ''}`}
              style={statsView === 'month'
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.bgBase, color: colors.accent }
              }
              onMouseEnter={(e) => {
                if (statsView !== 'month') {
                  e.currentTarget.style.backgroundColor = colors.borderSubtle;
                }
              }}
              onMouseLeave={(e) => {
                if (statsView !== 'month') {
                  e.currentTarget.style.backgroundColor = colors.bgBase;
                }
              }}
              aria-current={statsView === 'month' ? 'true' : 'false'}
            >
              月
            </button>
            <button
              onClick={() => { setStatsView('year'); setStatsDate(new Date()); }}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-200 font-medium ${statsView === 'year' ? 'text-white shadow-sm' : ''}`}
              style={statsView === 'year'
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.bgBase, color: colors.accent }
              }
              onMouseEnter={(e) => {
                if (statsView !== 'year') {
                  e.currentTarget.style.backgroundColor = colors.borderSubtle;
                }
              }}
              onMouseLeave={(e) => {
                if (statsView !== 'year') {
                  e.currentTarget.style.backgroundColor = colors.bgBase;
                }
              }}
              aria-current={statsView === 'year' ? 'true' : 'false'}
            >
              年
            </button>
          </nav>
        </div>
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
            <p
              className="text-xs mt-0.5 transition-colors"
              style={{ color: colors.textMuted }}
            >
              {(() => {
                let start, end;
                if (statsView === 'week') {
                  start = getStartOfWeek(statsDate);
                  end = getEndOfWeek(statsDate);
                } else if (statsView === 'month') {
                  start = getStartOfMonth(statsDate);
                  end = getEndOfMonth(statsDate);
                } else {
                  start = getStartOfYear(statsDate);
                  end = getEndOfYear(statsDate);
                }
                const count = records.filter(record => record && record.timestamp >= start && record.timestamp <= end).length;
                return `共${count}次`;
              })()}
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
                const now = Date.now();
                
                if (statsView === 'week') {
                  total = getWeekTotal(statsDate);
                  const weekStart = getStartOfWeek(statsDate);
                  const weekEnd = getEndOfWeek(statsDate);
                  // 计算周期内已过去的实际天数（包括今天，不包括未来）
                  const periodEnd = Math.min(weekEnd, now);
                  days = Math.max(1, Math.ceil((periodEnd - weekStart) / (24 * 60 * 60 * 1000)));
                } else if (statsView === 'month') {
                  total = getMonthTotal(statsDate);
                  const monthStart = getStartOfMonth(statsDate);
                  const monthEnd = getEndOfMonth(statsDate);
                  // 计算月份内已过去的实际天数
                  const periodEnd = Math.min(monthEnd, now);
                  days = Math.max(1, Math.ceil((periodEnd - monthStart) / (24 * 60 * 60 * 1000)));
                } else {
                  total = getYearTotal(statsDate);
                  const yearStart = getStartOfYear(statsDate);
                  const yearEnd = getEndOfYear(statsDate);
                  // 计算年份内已过去的实际天数
                  const periodEnd = Math.min(yearEnd, now);
                  days = Math.max(1, Math.ceil((periodEnd - yearStart) / (24 * 60 * 60 * 1000)));
                }
                
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
                期间最高
              </p>
              <p
                className="text-lg font-bold mt-1 transition-colors"
                style={{ color: colors.espresso }}
              >
                {periodStats.maxDay} mg
              </p>
              {periodStats.maxDayData?.name && (
                <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                  {periodStats.maxDayData.name}{statsView === 'month' ? '日' : ''}
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
                {periodStats.activeDays}/{statsView === 'year' ? periodStats.totalDays : periodStats.pastDays}
              </p>
              <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                活跃比例 {periodStats.consistencyRate}%
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
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3
            id="source-analysis-heading"
            className="text-xl font-semibold flex items-center transition-colors mb-2 sm:mb-0"
            style={{ color: colors.espresso }}
          >
            <PieChartIcon size={20} className="mr-2" /> 摄入来源分析
          </h3>

          {/* 排序选择器 */}
          <div className="flex gap-2">
            <button
              onClick={() => setPieChartSortBy('count')}
              className={`px-3 py-1 rounded text-xs transition-colors ${pieChartSortBy === 'count' ? 'text-white' : 'hover:bg-gray-100'
                }`}
              style={pieChartSortBy === 'count'
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.bgBase, color: colors.textSecondary }
              }
            >
              按次数
            </button>
            <button
              onClick={() => setPieChartSortBy('amount')}
              className={`px-3 py-1 rounded text-xs transition-colors ${pieChartSortBy === 'amount' ? 'text-white' : 'hover:bg-gray-100'
                }`}
              style={pieChartSortBy === 'amount'
                ? { backgroundColor: colors.accent }
                : { backgroundColor: colors.bgBase, color: colors.textSecondary }
              }
            >
              按摄入量
            </button>
          </div>
        </div>

        {caffeineDistribution.length > 0 ? (
          <PieChart
            data={caffeineDistribution}
            colors={colors}
            sortBy={pieChartSortBy}
            totalRecords={records.length}
          />
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

      {/* 咖啡因生活方式画像 */}
      <section
        aria-labelledby="lifestyle-analysis-heading"
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="lifestyle-analysis-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Users size={20} className="mr-2" /> 咖啡因生活方式画像
        </h3>
        {(() => {
          const daysRecorded = lifestyleAnalysis ? lifestyleAnalysis.totalDays : 0;
          if (lifestyleAnalysis && daysRecorded >= MIN_RECORD_DAYS) {
            return (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center px-4 py-2 rounded-full mb-3"
                    style={{ backgroundColor: colors.accent + '20' }}>
                    <Coffee size={20} className="mr-2" style={{ color: colors.accent }} />
                    <span className="text-lg font-semibold" style={{ color: colors.accent }}>
                      {lifestyleAnalysis.userType}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {lifestyleAnalysis.typeDescription}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg text-center shadow-inner" style={{ backgroundColor: colors.bgBase }}>
                    <p className="text-xs mb-1" style={{ color: colors.textMuted }}>日均摄入</p>
                    <p className="text-lg font-semibold" style={{ color: colors.espresso }}>
                      {lifestyleAnalysis.avgDailyAmount} mg
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {lifestyleAnalysis.avgDailyCount} 次/天
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center shadow-inner" style={{ backgroundColor: colors.bgBase }}>
                    <p className="text-xs mb-1" style={{ color: colors.textMuted }}>周末模式</p>
                    <p className="text-lg font-semibold" style={{ color: colors.espresso }}>
                      {lifestyleAnalysis.weekendPattern}
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      平日 {lifestyleAnalysis.weekdayAvg}mg vs 周末 {lifestyleAnalysis.weekendAvg}mg
                    </p>
                  </div>
                </div>

                <div
                  className="p-3 rounded-lg flex items-start"
                  style={{
                    backgroundColor: lifestyleAnalysis.userType === '重度使用者' || lifestyleAnalysis.userType === '高频依赖者' ? colors.warningBg : colors.infoBg,
                  }}
                >
                  <Sparkles
                    size={20}
                    className="mr-2 flex-shrink-0 mt-0.5"
                    style={{
                      color: lifestyleAnalysis.userType === '重度使用者' || lifestyleAnalysis.userType === '高频依赖者' ? colors.warningText : colors.infoText,
                    }}
                  />
                  <p
                    className="text-sm"
                    style={{
                      color: lifestyleAnalysis.userType === '重度使用者' || lifestyleAnalysis.userType === '高频依赖者' ? colors.warningText : colors.infoText,
                    }}
                  >
                    {lifestyleAnalysis.typeAdvice}
                  </p>
                </div>
              </>
            );
          } else if (records.length > 0) {
            const daysNeeded = MIN_RECORD_DAYS - daysRecorded;
            return (
              <MotivationalMessage
                colors={colors}
                title="需要更多数据解锁咖啡因画像"
                requiredDays={daysNeeded}
                icon={<Users size={48} className="mx-auto mb-4 opacity-70" style={{ color: colors.accent }} />}
              />
            );
          } else { // records.length === 0
            return (
              <div className="text-center py-8" style={{ color: colors.textMuted }}>
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无足够数据生成画像。</p>
                <p className="text-xs mt-1">开始记录，了解您的咖啡因习惯。</p>
              </div>
            );
          }
        })()}
      </section>

      {/* 详细统计分析卡片 */}
      <section
        aria-labelledby="detailed-stats-heading"
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
        {(() => {
          const daysRecorded = lifestyleAnalysis ? lifestyleAnalysis.totalDays : 0;
          if (detailedStats && daysRecorded >= MIN_RECORD_DAYS) {
            return (
              <>
                <div className="grid grid-cols-4 gap-2 text-sm mb-6">
                  <StatItem icon={<Calendar size={16} />} label="记录天数" value={detailedStats.totalDays} unit="天" />
                  <StatItem icon={<Coffee size={16} />} label="记录次数" value={records.length} unit="次" />
                  <StatItem icon={<AlertCircle size={16} />} label="超标天数" value={detailedStats.exceedDays} unit="天" colorClass={detailedStats.exceedDays > 0 ? 'text-orange-500' : ''} />
                  <StatItem icon={<Percent size={16} />} label="超标率" value={detailedStats.exceedRate} unit="%" colorClass={detailedStats.exceedRate > 20 ? 'text-red-500' : detailedStats.exceedRate > 10 ? 'text-orange-500' : ''} />

                  <StatItem icon={<Droplet size={16} />} label="平均单次" value={detailedStats.avgPerIntake} unit="mg" />
                  <StatItem icon={<ActivityIcon size={16} />} label="平均每日" value={detailedStats.avgDailyAmount} unit="mg" />
                  <StatItem icon={<Target size={16} />} label="最大单次" value={detailedStats.maxSingleIntake} unit="mg" />
                  <StatItem icon={<Moon size={16} />} label="睡前残留" value={detailedStats.avgCaffeineAtSleep} unit="mg" colorClass={detailedStats.avgCaffeineAtSleep > 30 ? 'text-orange-500' : ''} />
                  
                  <StatItem icon={<TrendingUp size={16} />} label="最长连续" value={detailedStats.maxStreak} unit="天" />
                  <StatItem icon={<Zap size={16} />} label="当前连续" value={detailedStats.currentStreak} unit="天" />
                  <StatItem icon={<Clock size={16} />} label="平均间隔" value={detailedStats.avgInterval} unit="h" />
                  <StatItem icon={<Brain size={16} />} label="平均时间" value={`${Math.floor(detailedStats.avgIntakeTime)}:${String(Math.round((detailedStats.avgIntakeTime % 1) * 60)).padStart(2, '0')}`} unit="" />
                </div>

                {/* 周度分析 */}
                <div
                  className="mb-6"
                  onClick={() => setSelectedWeekday(null)} // 点击此区域空白处清除
                >
                  <h4
                    className="font-semibold mb-3 text-sm"
                    style={{ color: colors.espresso }}
                    onClick={(e) => e.stopPropagation()} // 点击标题不清除
                  >
                    星期分布分析
                  </h4>
                  <div
                    className="grid grid-cols-7 gap-2"
                  // onClick handler removed from here, handled by parent div
                  >
                    {detailedStats.weekdayTotals.map((amount, index) => {
                      const maxAmount = Math.max(...detailedStats.weekdayTotals);
                      const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                      const isMax = index === detailedStats.maxWeekdayIndex;
                      const isSelected = selectedWeekday === index;
                      return (
                        <div key={index} className="text-center">
                          <div
                            className="h-16 rounded transition-colors mb-1 flex items-end justify-center cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: amount > 0 ? (isMax ? colors.accent : colors.grid) : colors.borderSubtle,
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                              boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // 点击柱状图区域不清除，并切换选中
                              setSelectedWeekday(selectedWeekday === index ? null : index);
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
                          <span
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                            onClick={(e) => e.stopPropagation()} // 点击文字不清除
                          >
                            {detailedStats.weekdayNames[index]}
                          </span>
                          {isSelected && (
                            <div
                              className="text-xs mt-1 font-medium"
                              style={{ color: colors.textPrimary }}
                              onClick={(e) => e.stopPropagation()} // 点击数值不清除
                            >
                              {Math.round(amount)}mg
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p
                    className="text-xs mt-2 text-center"
                    style={{ color: colors.textMuted }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    最常摄入: {detailedStats.weekdayNames[detailedStats.maxWeekdayIndex]}
                    ({Math.round(detailedStats.weekdayTotals[detailedStats.maxWeekdayIndex])}mg)
                  </p>
                </div>

                {/* 时间分布图 */}
                <div onClick={() => setSelectedHour(null)}>
                  <h4
                    className="font-semibold mb-3 text-sm"
                    style={{ color: colors.espresso }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    24小时摄入分布
                  </h4>
                  <div
                    className="grid grid-cols-12 gap-1 mb-2"
                  >
                    {detailedStats.hourlyDistribution.map((amount, hour) => {
                      const maxAmount = Math.max(...detailedStats.hourlyDistribution);

                      const heightRatio = maxAmount > 0 ? Math.sqrt(amount / maxAmount) : 0;
                      const height = heightRatio * 80;

                      const isSelected = selectedHour === hour;

                      const getBarColor = () => {
                        if (amount === 0) return colors.borderSubtle;
                        const ratio = maxAmount > 0 ? amount / maxAmount : 0;
                        if (ratio < 0.01) return colors.grid; // 极低值

                        // 颜色插值函数
                        const interpolateColor = (color1, color2, factor) => {
                          const result = color1.slice();
                          for (let i = 0; i < 3; i++) {
                            result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
                          }
                          return `rgb(${result.join(',')})`;
                        };

                        // 将 hex 颜色转换为 rgb 数组
                        const hexToRgb = (hex) => {
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return [r, g, b];
                        };

                        const safeRgb = hexToRgb(colors.safe);
                        const accentRgb = hexToRgb(colors.accent);
                        const warningRgb = hexToRgb(colors.warning);
                        const dangerRgb = hexToRgb(colors.danger);

                        if (ratio < 0.4) { // 0% to 40% -> safe to accent
                          return interpolateColor(safeRgb, accentRgb, ratio / 0.4);
                        } else if (ratio < 0.7) { // 40% to 70% -> accent to warning
                          return interpolateColor(accentRgb, warningRgb, (ratio - 0.4) / 0.3);
                        } else { // 70% to 100% -> warning to danger
                          return interpolateColor(warningRgb, dangerRgb, (ratio - 0.7) / 0.3);
                        }
                      };

                      return (
                        <div key={hour} className="flex flex-col items-center">
                          <div
                            className="w-full rounded-t transition-colors mb-1 cursor-pointer hover:opacity-80"
                            style={{
                              height: `${Math.max(height, 3)}px`,
                              backgroundColor: getBarColor(),
                              minHeight: '3px',
                              maxHeight: '80px',
                              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                              boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                            }}
                            title={`${hour}:00 - ${Math.round(amount)}mg`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHour(selectedHour === hour ? null : hour);
                            }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {hour}
                          </span>
                          {isSelected && (
                            <div
                              className="text-xs mt-1 font-medium"
                              style={{ color: colors.textPrimary }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {Math.round(amount)}mg
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p
                    className="text-xs text-center"
                    style={{ color: colors.textMuted }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    高峰时段: {detailedStats.peakHour}:00 ({detailedStats.peakAmount}mg)
                  </p>
                </div>
              </>
            );
          } else if (records.length > 0) {
            const daysNeeded = MIN_RECORD_DAYS - daysRecorded;
            return (
              <MotivationalMessage
                colors={colors}
                title="需要更多数据解锁详细统计"
                requiredDays={daysNeeded}
                icon={<BarChart2 size={48} className="mx-auto mb-4 opacity-70" style={{ color: colors.accent }} />}
              />
            );
          } else { // records.length === 0
            return (
              <div className="text-center py-8" style={{ color: colors.textMuted }}>
                <BarChart2 size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无足够数据进行详细分析。</p>
                <p className="text-xs mt-1">请先添加一些咖啡因摄入记录。</p>
              </div>
            );
          }
        })()}
      </section>

      {/* 健康分析报告卡片 */}
      <section
        aria-labelledby="health-analysis-heading"
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h3
          id="health-analysis-heading"
          className="text-xl font-semibold mb-6 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Heart size={20} className="mr-2" /> 健康分析报告
        </h3>
        {(() => {
          const daysRecorded = lifestyleAnalysis ? lifestyleAnalysis.totalDays : 0;
          if (detailedStats && lifestyleAnalysis && daysRecorded >= MIN_RECORD_DAYS) {
            return (
              <div className="space-y-6">
                {/* 仪表盘区域 */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Gauge
                    value={Math.round(getWeekTotal(new Date()) / ((new Date().getDay() === 0 ? 7 : new Date().getDay())) || 1)}
                    maxValue={effectiveMaxDaily}
                    label="本周日均摄入"
                    unit="mg"
                    colors={colors}
                  />
                  <Gauge
                    value={detailedStats.avgCaffeineAtSleep}
                    maxValue={50} // 设定50mg为影响睡眠的较高阈值
                    label="睡前残留咖啡因"
                    unit="mg"
                    colors={colors}
                  />
                  <Gauge
                    value={detailedStats.exceedRate}
                    maxValue={100}
                    label="超标天数比例"
                    unit="%"
                    colors={colors}
                  />
                </div>

                {/* 核心建议 */}
                <div className="space-y-3 text-sm" style={{ color: colors.textSecondary }}>
                  <div className="flex items-start p-3 rounded-lg" style={{ backgroundColor: colors.bgBase }}>
                    <Award size={18} className="mr-3 mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
                    <div>
                      <h4 className="font-semibold" style={{ color: colors.espresso }}>摄入画像</h4>
                      <p>
                        您被识别为“<strong style={{ color: colors.accent }}>{lifestyleAnalysis.userType}</strong>”。{lifestyleAnalysis.typeAdvice}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 rounded-lg" style={{ backgroundColor: colors.bgBase }}>
                    <Clock size={18} className="mr-3 mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
                    <div>
                      <h4 className="font-semibold" style={{ color: colors.espresso }}>睡眠建议</h4>
                      <p>
                        为减少对 <strong style={{ color: colors.espresso }}>{userSettings.plannedSleepTime}</strong> 睡眠的影响, 建议在 <strong className="font-bold" style={{ color: colors.accent }}>{calculateStopTime(userSettings.plannedSleepTime, 6)}</strong> 前停止摄入。
                        {detailedStats.peakHour >= calculateStopTime(userSettings.plannedSleepTime, 6) - 1 && (
                          <span style={{ color: colors.infoText }}> 您的摄入高峰 (<strong style={{ color: colors.accent }}>{detailedStats.peakHour}:00</strong>) 偏晚，请特别留意。</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {caffeineDistribution[0]?.name && (
                    <div className="flex items-start p-3 rounded-lg" style={{ backgroundColor: colors.bgBase }}>
                      <Coffee size={18} className="mr-3 mt-0.5 flex-shrink-0" style={{ color: colors.accent }} />
                      <div>
                        <h4 className="font-semibold" style={{ color: colors.espresso }}>主要来源</h4>
                        <p>
                          主要来源是 <strong style={{ color: colors.accent }}>{caffeineDistribution[0].name}</strong>，占总{pieChartSortBy === 'count' ? '次数' : '摄入量'}的 <strong style={{ color: colors.accent }}>{caffeineDistribution[0].percentage}%</strong>。可考虑适度调整。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          } else if (records.length > 0) {
            const daysNeeded = MIN_RECORD_DAYS - daysRecorded;
            return (
              <MotivationalMessage
                colors={colors}
                title="需要更多数据解锁健康分析报告"
                requiredDays={daysNeeded}
                icon={<Heart size={48} className="mx-auto mb-4 opacity-70" style={{ color: colors.accent }} />}
              />
            );
          } else { // records.length === 0
            return (
              <div className="text-center py-8" style={{ color: colors.textMuted }}>
                <Heart size={48} className="mx-auto mb-3 opacity-50" />
                <p>开始记录您的咖啡因摄入，以获取个性化健康报告。</p>
              </div>
            );
          }
        })()}
      </section>

      {/* 咖啡因知识卡片 */}
      <section
        aria-labelledby="caffeine-knowledge-heading"
        className="max-w-md w-full mb-5 rounded-xl p-6 shadow-lg border transition-colors break-inside-avoid mx-auto"
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
          className="space-y-4 text-sm transition-colors"
          style={{ color: colors.textSecondary }}
        >
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>推荐摄入量:</strong> FDA/Mayo Clinic 建议健康成人每日不超过 <MathFormula formula="400" /> mg。
            个性化推荐可按 <MathFormula formula="3-6" /> mg/kg 体重计算 (本应用默认使用 <MathFormula formula={userSettings.recommendedDosePerKg.toString()} /> mg/kg，可在设置中调整)。
          </li>
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>半衰期:</strong> 健康成人血浆半衰期 <MathFormula formula="t_{1/2}" /> 平均约为 <MathFormula formula="5" /> 小时 (范围 <MathFormula formula="1.5-9.5" /> 小时)。
            这是体内咖啡因量减少一半所需时间。您可以在设置中调整此值以匹配个人情况。
          </li>
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>代谢模型:</strong> 本应用使用一级消除动力学模型来估算体内咖啡因残留量，公式为 <MathFormula formula="C(t) = C_0 \times 0.5^{t/t_{1/2}}" />，
            其中消除速率常数 <MathFormula formula="k = \frac{\ln(2)}{t_{1/2}}" />。
          </li>
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>睡眠阈值:</strong> 多数研究建议睡前 <MathFormula formula="6" /> 小时避免摄入。
            本应用通过计算当前咖啡因含量降至设定的安全浓度阈值 (<MathFormula formula={`${userSettings.safeSleepThresholdConcentration.toFixed(1)}`} /> mg/L) 所需时间来提供建议睡眠时间。此阈值可在设置中调整。
          </li>
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>浓度估算:</strong> 体内浓度 (mg/L) 可通过公式 <MathFormula formula="C = \frac{\text{剂量(mg)}}{V_d \times \text{体重(kg)}}" /> 估算，
            其中典型分布容积 <MathFormula formula="V_d \approx 0.6" /> L/kg (可在设置调整)。
          </li>
          <li className="leading-relaxed">
            <strong style={{ color: colors.espresso }}>清除时间:</strong> 大约需要 <MathFormula formula="5" /> 个半衰期 (约 <MathFormula formula={(5 * userSettings.caffeineHalfLifeHours).toFixed(1)} /> 小时) 才能将体内咖啡因基本清除 (降至初始量的约 <MathFormula formula="3" />%)。
          </li>
        </ul>
      </section>
    </div>
  );
};

export default StatisticsView;