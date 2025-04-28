import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

/**
 * 统计图表组件
 * 用于显示周/月/年的咖啡因摄入统计
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.data - 图表数据
 * @param {string} props.view - 图表视图类型 ('week', 'month', 'year')
 * @param {number} props.effectiveMaxDaily - 每日推荐最大摄入量
 * @param {Function} props.formatYAxisTick - Y轴刻度格式化函数
 * @param {Object} props.colors - 颜色主题
 */
const StatsChart = ({ 
  data, 
  view, 
  effectiveMaxDaily, 
  formatYAxisTick = (value) => Math.round(value),
  colors
}) => {
  // 检查是否有数据
  const hasData = data && data.some(d => d.value > 0);
  
  // 如果没有数据，显示提示信息
  if (!hasData) {
    return (
      <div 
        key="chart-no-data" 
        className="flex items-center justify-center h-64 text-sm transition-colors" 
        style={{ color: colors.textMuted }}
      >
        {view === 'week' 
          ? '本周没有数据' 
          : view === 'month' 
            ? '本月没有数据' 
            : '本年没有数据'
        }
      </div>
    );
  }

  // 设置图表标题
  let title = '';
  if (view === 'week') title = '每日摄入量 (mg)';
  if (view === 'month') title = '每日摄入量 (mg)';
  if (view === 'year') title = '每月摄入量 (mg)';

  // 找出数据中的最大值
  const maxValue = Math.max(...data.map(d => d.value));
  
  // 根据视图类型确定Y轴最大值
  let yMax;
  if (view === 'week' || view === 'month') {
    // 周/月视图：包含每日最大值
    yMax = Math.ceil(Math.max(maxValue, effectiveMaxDaily) * 1.1 / 50) * 50;
  } else {
    // 年视图：基于月总量
    yMax = Math.ceil(maxValue * 1.1 / 100) * 100;
  }
  
  // 设置Y轴域
  const yAxisDomain = [0, yMax];

  // 格式化tooltip标签
  const formatTooltipLabel = (label, payload) => {
    const entry = payload?.[0]?.payload;
    if (entry?.date && (view === 'week' || view === 'month')) {
      return `${entry.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} (${label})`;
    }
    return label;
  };

  // 格式化tooltip值
  const formatTooltipValue = (value) => [
    `${Math.round(value)} mg`, 
    '摄入量'
  ];

  // 确定柱状图大小
  const getBarSize = () => {
    if (view === 'month') return 10;
    if (view === 'year') return 15;
    return 20; // 周视图默认
  };

  // 获取柱状图颜色
  const getBarColor = (entry) => {
    if (view === 'week' || view === 'month') {
      // 周/月视图：基于每日最大值着色
      if (entry.value > effectiveMaxDaily) return colors.danger;
      if (entry.value > effectiveMaxDaily * 0.75) return colors.warning;
      if (entry.value > 0) return colors.safe;
      return '#e5e7eb'; // 零值使用浅灰色
    } else {
      // 年视图：使用一致的颜色
      if (entry.value > 0) return colors.espresso; // 有数据的月份使用深色
      return '#e5e7eb'; // 零值使用浅灰色
    }
  };

  return (
    <>
      <h3 
        className="text-center text-sm font-medium transition-colors mb-3" 
        style={{ color: colors.textSecondary }}
      >
        {title}
      </h3>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart 
          data={data} 
          margin={{ top: 5, right: 20, left: 15, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={colors.grid} 
            opacity={0.7}
          />
          
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: colors.textMuted }} 
            stroke={colors.textMuted}
          />
          
          <YAxis 
            domain={yAxisDomain} 
            tick={{ fontSize: 10, fill: colors.textMuted }} 
            tickFormatter={formatYAxisTick} 
            stroke={colors.textMuted}
          />
          
          <Tooltip
            contentStyle={{ 
              backgroundColor: colors.tooltipBg, 
              border: `1px solid ${colors.borderStrong}`, 
              borderRadius: '8px', 
              color: colors.tooltipText, 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}
            formatter={formatTooltipValue}
            labelFormatter={formatTooltipLabel}
            animationDuration={200}
          />
          
          {/* 条件渲染参考线：仅在周/月视图中显示 */}
          {(view === 'week' || view === 'month') && (
            <ReferenceLine 
              y={effectiveMaxDaily} 
              label={{ 
                value: `上限 (${effectiveMaxDaily}mg)`, 
                position: 'insideTopRight', 
                fill: colors.danger, 
                fontSize: 10 
              }} 
              stroke={colors.danger} 
              strokeDasharray="3 3" 
            />
          )}
          
          <Bar 
            dataKey="value" 
            name="摄入量" 
            barSize={getBarSize()}
            animationDuration={750}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry)} 
                radius={[4, 4, 0, 0]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

export default StatsChart;