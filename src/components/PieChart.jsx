import React, { useState } from 'react';

/**
 * 饼状图组件
 * 用于显示咖啡因摄入来源分布
 */
const PieChart = ({ data, colors = {} }) => {
  const [selectedSector, setSelectedSector] = useState(null);

  // 提供默认颜色值以防止 undefined 错误
  const defaultColors = {
    textMuted: '#6b7280',
    textPrimary: '#111827',
    textSecondary: '#9ca3af',
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

  // 使用更有区分度的咖啡色调
  const chartColors = [
    '#8B4513', // saddle brown - 深棕色
    '#D2691E', // chocolate - 巧克力色
    '#CD853F', // peru - 秘鲁色
    '#A0522D', // sienna - 赭石色
    '#B22222', // fire brick - 火砖色
    '#DAA520', // goldenrod - 金麒麟色
    '#BC8F8F', // rosy brown - 玫瑰棕
    '#F4A460', // sandy brown - 沙棕色
    '#DEB887', // burlywood - 实木色
    '#D2B48C', // tan - 棕褐色
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

  const handleSectorClick = (sector) => {
    setSelectedSector(selectedSector?.id === sector.id ? null : sector);
  };

  const handleChartClick = (e) => {
    // 如果点击的是空白区域（即 SVG 背景），清空选中状态
    if (e.target.tagName === 'svg') {
      setSelectedSector(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* 饼状图 */}
      <div className="flex-shrink-0">
        <svg 
          width="200" 
          height="200" 
          viewBox="0 0 200 200" 
          className="drop-shadow-sm cursor-pointer"
          onClick={handleChartClick}
        >
          {sectors.map((sector, index) => (
            <g key={sector.id}>
              <path
                d={createPath(sector.startAngle, sector.endAngle)}
                fill={sector.color}
                stroke="white"
                strokeWidth="3"
                className="hover:opacity-80 transition-all duration-200 cursor-pointer"
                style={{
                  filter: selectedSector?.id === sector.id ? 'brightness(1.2)' : 'none',
                  transform: selectedSector?.id === sector.id ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: '100px 100px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSectorClick(sector);
                }}
                title={`${sector.name}: ${sector.percentage}% (${sector.amount}mg)`}
              />
            </g>
          ))}
        </svg>
        
        {/* 点击提示信息 */}
        {selectedSector && (
          <div 
            className="mt-3 p-3 rounded-lg border-2 text-center"
            style={{ 
              backgroundColor: selectedSector.color + '20',
              borderColor: selectedSector.color,
              color: defaultColors.textPrimary
            }}
          >
            <div className="font-semibold text-sm">{selectedSector.name}</div>
            <div className="text-xs mt-1" style={{ color: defaultColors.textSecondary }}>
              {selectedSector.percentage}% • {selectedSector.amount}mg
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 gap-1">
          {sectors.map((sector) => (
            <div 
              key={sector.id} 
              className="flex items-center text-xs py-1 px-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleSectorClick(sector)}
              style={{
                backgroundColor: selectedSector?.id === sector.id ? sector.color + '20' : 'transparent'
              }}
            >
              <div
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0 border"
                style={{ 
                  backgroundColor: sector.color,
                  borderColor: 'white'
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate text-xs"
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
          <div className="flex justify-between items-center text-xs">
            <span>总摄入量</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {data.reduce((sum, item) => sum + item.amount, 0)}mg
            </span>
          </div>
          <div className="flex justify-between items-center mt-1 text-xs">
            <span>记录来源</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {mainItems.length}种{otherTotal > 0 ? '（含其他）' : ''}
            </span>
          </div>
        </div>
        
        {/* 点击提示 */}
        <div className="mt-2 text-xs text-center" style={{ color: defaultColors.textMuted }}>
          点击扇形或图例查看详情 • 点击空白处清空选中
        </div>
      </div>
    </div>
  );
};

export default PieChart;
