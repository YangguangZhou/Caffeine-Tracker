import React, { useState, useRef } from 'react';

/**
 * 饼状图组件
 * 用于显示咖啡因摄入来源分布
 */
const PieChart = ({ data, colors = {}, sortBy = 'count', totalRecords = 0 }) => {
  const [selectedSector, setSelectedSector] = useState(null);
  const chartRef = useRef(null);

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
  let otherItemCount = 0; // 修复：记录"其他"项目的实际次数

  data.forEach(item => {
    if (item.percentage >= threshold) {
      mainItems.push(item);
    } else {
      otherTotal += item.amount;
      otherCount += item.percentage;
      otherItemCount += item.count; // 修复：累加实际次数
    }
  });

  // 如果有"其他"项目，添加到主列表
  if (otherTotal > 0) {
    mainItems.push({
      id: 'others',
      name: '其他',
      amount: Math.round(otherTotal),
      count: otherItemCount, // 修复：使用正确的次数
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
    // 检查点击是否在图表容器内但不是扇形
    if (chartRef.current && chartRef.current.contains(e.target)) {
      // 如果点击的不是路径元素，清空选中状态
      if (e.target.tagName !== 'path') {
        setSelectedSector(null);
      }
    }
  };

  const handleContainerClick = (e) => {
    // 点击组件根容器的空白处时，清除选中状态
    setSelectedSector(null);
  };

  return (
    <div 
      className="flex flex-col items-center gap-6" 
      onClick={handleContainerClick} // 添加到根容器
    >
      {/* 饼状图 */}
      <div 
        className="flex-shrink-0" 
        ref={chartRef}
        onClick={(e) => e.stopPropagation()} // 阻止事件冒泡到根容器
      >
        <svg 
          width="200" 
          height="200" 
          viewBox="0 0 200 200" 
          className="drop-shadow-sm cursor-pointer"
          // onClick={handleChartClick} // 此处的 handleChartClick 确保SVG背景点击也清除
        >
          {/* 添加透明背景圆形来确保点击检测 */}
          <circle
            cx="100"
            cy="100"
            r="95" // 确保半径足够大以覆盖整个饼图区域
            fill="transparent"
            onClick={() => setSelectedSector(null)} // 点击SVG背景清除
          />
          {sectors.map((sector, index) => (
            <g key={sector.id}>
              <path
                d={createPath(sector.startAngle, sector.endAngle)}
                fill={sector.color}
                stroke="white"
                strokeWidth="3"
                className="cursor-pointer"
                style={{
                  filter: selectedSector?.id === sector.id ? 'brightness(1.2)' : 'none',
                  transform: selectedSector?.id === sector.id ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: '100px 100px',
                  transition: 'transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out',
                  opacity: selectedSector && selectedSector.id !== sector.id ? 0.7 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => {
                  if (!(selectedSector && selectedSector.id === sector.id)) {
                     e.currentTarget.style.opacity = selectedSector ? '0.7' : '1';
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation(); // 阻止冒泡到SVG背景或根容器
                  handleSectorClick(sector);
                }}
                title={`${sector.name}: ${sortBy === 'count' ? `${sector.count}次 (${sector.percentage}%)` : `${sector.percentage}% (${sector.amount}mg)`}`}
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
            onClick={(e) => e.stopPropagation()} // 阻止冒泡
          >
            <div className="font-semibold text-sm">{selectedSector.name}</div>
            <div className="text-xs mt-1" style={{ color: defaultColors.textSecondary }}>
              {sortBy === 'count' 
                ? `${selectedSector.count}次 • ${selectedSector.percentage}% • ${selectedSector.amount}mg`
                : `${selectedSector.percentage}% • ${selectedSector.amount}mg • ${selectedSector.count}次`
              }
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div 
        className="flex-1 min-w-0"
        onClick={(e) => e.stopPropagation()} // 阻止事件冒泡到根容器
      >
        <div className="grid grid-cols-2 gap-1"> {/* 统一使用两列布局 */}
          {sectors.map((sector) => (
            <div 
              key={sector.id} 
              className="flex items-center text-xs py-1 px-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors" // 统一使用紧凑padding
              onClick={(e) => {
                e.stopPropagation(); // 阻止冒泡
                handleSectorClick(sector);
              }}
              style={{
                backgroundColor: selectedSector?.id === sector.id ? sector.color + '20' : 'transparent'
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0 border" // 统一使用小图标尺寸
                style={{ 
                  backgroundColor: sector.color,
                  borderColor: 'white'
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate text-xs leading-tight" // 统一使用紧凑行高
                  style={{ color: defaultColors.textPrimary }}
                  title={sector.name}
                >
                  {sector.name}
                </div>
                <div
                  className="text-xs leading-tight" // 统一使用紧凑行高
                  style={{ color: defaultColors.textMuted }}
                >
                  {sortBy === 'count' 
                    ? `${sector.count}次 ${sector.percentage}%` // 统一使用简化显示
                    : `${sector.percentage}% ${sector.count}次` // 统一使用简化显示
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 总计信息 */}
        <div
          className="mt-3 pt-2 border-t text-sm" // 统一使用紧凑间距
          style={{ borderColor: defaultColors.borderSubtle, color: defaultColors.textMuted }}
        >
          <div className="flex justify-between items-center text-xs mb-1">
            <span>总摄入量</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {data.reduce((sum, item) => sum + item.amount, 0)}mg
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span>总次数</span>
            <span className="font-medium" style={{ color: defaultColors.espresso }}>
              {totalRecords}次
            </span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PieChart;
