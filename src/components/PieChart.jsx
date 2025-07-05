import React, { useState, useRef, useEffect } from 'react';

/**
 * 饼状图组件
 * 用于显示咖啡因摄入来源分布
 */
const PieChart = ({ data, colors = {}, sortBy = 'count', totalRecords = 0 }) => {
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const chartRef = useRef(null);

  // 当排序方式改变时触发动画
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 200); // 与CSS transition时间保持一致

    return () => clearTimeout(timer);
  }, [sortBy]);

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
  let otherItemCount = 0;

  data.forEach(item => {
    if (item.percentage >= threshold) {
      mainItems.push(item);
    } else {
      otherTotal += item.amount;
      otherCount += item.percentage;
      otherItemCount += item.count;
    }
  });

  // 如果有"其他"项目，添加到主列表
  if (otherTotal > 0) {
    mainItems.push({
      id: 'others',
      name: '其他',
      amount: Math.round(otherTotal),
      count: otherItemCount,
      percentage: Math.round(otherCount)
    });
  }

  // 计算每个扇形的角度
  let currentAngle = 0;
  const sectors = mainItems.map((item, index) => {
    const isLastItem = index === mainItems.length - 1;
    let angle;

    if (isLastItem) {
      angle = 360 - currentAngle;
    } else {
      angle = (item.percentage / 100) * 360;
    }

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      startAngle: Math.round(startAngle * 1000) / 1000,
      endAngle: Math.round(endAngle * 1000) / 1000,
      angle: Math.round(angle * 1000) / 1000,
      color: chartColors[index % chartColors.length]
    };
  });

  const createPath = (startAngle, endAngle, outerRadius = 90, innerRadius = 0) => {
    if (Math.abs(endAngle - startAngle) >= 359.9) {
      return `M 100 ${100 - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 100 ${100 + outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 100 ${100 - outerRadius} Z`;
    }

    const start = polarToCartesian(100, 100, outerRadius, endAngle);
    const end = polarToCartesian(100, 100, outerRadius, startAngle);
    const angleDiff = endAngle - startAngle;
    const largeArcFlag = angleDiff > 180 ? "1" : "0";

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
      x: Math.round((centerX + (radius * Math.cos(angleInRadians))) * 1000) / 1000,
      y: Math.round((centerY + (radius * Math.sin(angleInRadians))) * 1000) / 1000
    };
  };

  const handleSectorClick = (sector) => {
    setSelectedSectorId(selectedSectorId === sector.id ? null : sector.id);
  };

  const handleChartClick = (e) => {
    // 检查点击是否在图表容器内但不是扇形
    if (chartRef.current && chartRef.current.contains(e.target)) {
      // 如果点击的不是路径元素，清空选中状态
      if (e.target.tagName !== 'path') {
        setSelectedSectorId(null);
      }
    }
  };

  const handleContainerClick = (e) => {
    // 点击组件根容器的空白处时，清除选中状态
    setSelectedSectorId(null);
  };

  const currentSelectedSectorData = selectedSectorId ? sectors.find(s => s.id === selectedSectorId) : null;

  return (
    <div
      className="flex flex-col items-center gap-6"
      onClick={handleContainerClick}
    >
      {/* 饼状图 */}
      <div
        className="flex-shrink-0"
        ref={chartRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: isTransitioning ? 0.3 : 1,
          transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="drop-shadow-sm cursor-pointer"
        >
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="transparent"
            onClick={() => setSelectedSectorId(null)}
          />
          {sectors.map((sector, index) => (
            <g key={sector.id + '-' + sortBy}>
              <path
                d={createPath(sector.startAngle, sector.endAngle)}
                fill={sector.color}
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="cursor-pointer"
                style={{
                  filter: selectedSectorId === sector.id ? 'brightness(1.2)' : 'none',
                  transform: selectedSectorId === sector.id ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: '100px 100px',
                  opacity: selectedSectorId && selectedSectorId !== sector.id ? 0.7 : 1,
                  transition: 'transform 0.3s cubic-bezier(.4,2,.3,1), opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => {
                  if (!(selectedSectorId && selectedSectorId === sector.id)) {
                    e.currentTarget.style.opacity = selectedSectorId ? '0.7' : '1';
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSectorClick(sector);
                }}
                title={`${sector.name}: ${sortBy === 'count' ? `${sector.count}次 (${Math.round(sector.percentage)}%)` : `${sector.amount}mg (${Math.round(sector.percentage)}%)`}`}
              />
            </g>
          ))}
        </svg>

        {/* 点击提示信息 */}
        {currentSelectedSectorData && (
          <div
            className="mt-3 p-3 rounded-lg border-2 text-center"
            style={{
              backgroundColor: currentSelectedSectorData.color + '20',
              borderColor: currentSelectedSectorData.color,
              color: defaultColors.textPrimary,
              opacity: isTransitioning ? 0.3 : 1,
              transition: 'opacity 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()} // 阻止冒泡
          >
            <div className="font-semibold text-sm">{currentSelectedSectorData.name}</div>
            <div className="text-xs mt-1" style={{ color: defaultColors.textSecondary }}>
              {sortBy === 'count'
                ? `${currentSelectedSectorData.count}次 • ${Math.round(currentSelectedSectorData.percentage)}% • ${currentSelectedSectorData.amount}mg`
                : `${currentSelectedSectorData.amount}mg • ${Math.round(currentSelectedSectorData.percentage)}% • ${currentSelectedSectorData.count}次`
              }
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div
        className="flex-1 min-w-0"
        onClick={(e) => e.stopPropagation()} // 阻止事件冒泡到根容器
        style={{
          opacity: isTransitioning ? 0.3 : 1,
          transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
        }}
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
                backgroundColor: selectedSectorId === sector.id ? sector.color + '20' : 'transparent'
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
                    ? `${sector.count}次 (${Math.round(sector.percentage)}%) • ${sector.amount}mg`
                    : `${sector.amount}mg (${Math.round(sector.percentage)}%) • ${sector.count}次`
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
