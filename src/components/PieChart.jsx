import React from 'react';

/**
 * 饼状图组件
 * 用于显示咖啡因摄入来源分布
 */
const PieChart = ({ data, colors = {} }) => {
  // 提供默认颜色值以防止 undefined 错误
  const defaultColors = {
    textMuted: '#6b7280',
    textPrimary: '#111827',
    espresso: '#6b21a8',
    latte: '#a855f7',
    cappuccino: '#c084fc',
    accent: '#d97706',
    warning: '#f59e0b',
    danger: '#dc2626',
    safe: '#059669',
    borderSubtle: '#e5e7eb',
    ...colors
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: defaultColors.textMuted }}>
        <p>暂无数据</p>
      </div>
    );
  }

  // 预定义颜色
  const chartColors = [
    defaultColors.espresso,
    defaultColors.latte,
    defaultColors.cappuccino,
    defaultColors.accent,
    defaultColors.warning,
    defaultColors.danger,
    defaultColors.safe,
    '#8B4513', // saddle brown
    '#D2691E', // chocolate
    '#CD853F', // peru
  ];

  // 合并小于5%的项目为"其他"
  const threshold = 5;
  let mainItems = [];
  let otherTotal = 0;
  let otherCount = 0;

  data.forEach(item => {
    if (item.percentage >= threshold) {
      mainItems.push(item);
    } else {
      otherTotal += item.amount;
      otherCount += item.percentage;
    }
  });

  // 如果有"其他"项目，添加到主列表
  if (otherTotal > 0) {
    mainItems.push({
      id: 'others',
      name: '其他',
      amount: Math.round(otherTotal),
      percentage: Math.round(otherCount)
    });
  }

  // 计算每个扇形的角度
  let currentAngle = 0;
  const sectors = mainItems.map((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    return {
      ...item,
      startAngle,
      endAngle,
      color: chartColors[index % chartColors.length]
    };
  });

  // 将角度转换为SVG路径
  const createPath = (startAngle, endAngle, outerRadius = 90, innerRadius = 0) => {
    const start = polarToCartesian(100, 100, outerRadius, endAngle);
    const end = polarToCartesian(100, 100, outerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const outerArc = [
      "M", start.x, start.y, 
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    if (innerRadius > 0) {
      const innerStart = polarToCartesian(100, 100, innerRadius, endAngle);
      const innerEnd = polarToCartesian(100, 100, innerRadius, startAngle);
      return [
        outerArc,
        "L", innerEnd.x, innerEnd.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
        "Z"
      ].join(" ");
    } else {
      return [outerArc, "L", 100, 100, "Z"].join(" ");
    }
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* 饼状图 */}
      <div className="flex-shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
          {sectors.map((sector, index) => (
            <path
              key={sector.id}
              d={createPath(sector.startAngle, sector.endAngle)}
              fill={sector.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title={`${sector.name}: ${sector.percentage}% (${sector.amount}mg)`}
            />
          ))}
        </svg>
      </div>

      {/* 图例 */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sectors.map((sector) => (
            <div key={sector.id} className="flex items-center text-sm">
              <div
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: sector.color }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate"
                  style={{ color: defaultColors.textPrimary }}
                  title={sector.name}
                >
                  {sector.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: defaultColors.textMuted }}
                >
                  {sector.percentage}% ({sector.amount}mg)
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 总计信息 */}
        <div
          className="mt-4 pt-3 border-t text-sm"
          style={{ borderColor: defaultColors.borderSubtle, color: defaultColors.textMuted }}
        >
          <div className="flex justify-between items-center">
            <span>总摄入量</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {data.reduce((sum, item) => sum + item.amount, 0)}mg
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>记录来源</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {mainItems.length}种{otherTotal > 0 ? '（含其他）' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;
