import React, { useMemo } from 'react';

/**
 * 热力图组件
 * 显示按星期几和小时的咖啡因摄入热力图
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.data - 热力图数据 [{weekday, hour, value}]
 * @param {Object} props.colors - 颜色主题
 */
const HeatmapChart = ({ data, colors }) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 创建热力图矩阵
  const heatmapMatrix = useMemo(() => {
    const matrix = {};
    const localWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const localHours = Array.from({ length: 24 }, (_, i) => i);
    
    // 初始化矩阵
    localWeekdays.forEach((_, dayIndex) => {
      matrix[dayIndex] = {};
      localHours.forEach(hour => {
        matrix[dayIndex][hour] = 0;
      });
    });

    // 填充数据
    data.forEach(item => {
      if (matrix[item.weekday] && matrix[item.weekday][item.hour] !== undefined) {
        matrix[item.weekday][item.hour] = item.value;
      }
    });

    return matrix;
  }, [data]);

  // 计算最大值用于颜色映射
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  // 根据值获取颜色
  const getColor = (value) => {
    if (value === 0) return colors.bgBase;
    
    const intensity = value / maxValue;
    
    // 使用渐变色：从浅咖啡色到深咖啡色
    if (intensity < 0.2) return '#FEF3C7'; // 极浅
    if (intensity < 0.4) return '#FDE68A'; // 浅
    if (intensity < 0.6) return '#FCD34D'; // 中浅
    if (intensity < 0.8) return '#FBBF24'; // 中
    return '#F59E0B'; // 深
  };

  // 检查是否有数据
  const hasData = data && data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div 
        className="flex items-center justify-center h-64 text-sm transition-colors"
        style={{ color: colors.textMuted }}
      >
        暂无足够数据生成热力图
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* 标题和说明 */}
        <div className="mb-3">
          <p className="text-xs text-center mb-2" style={{ color: colors.textSecondary }}>
            摄入时段分布（星期 × 小时）
          </p>
        </div>

        {/* 热力图表格 */}
        <div className="relative">
          {/* 小时标签 */}
          <div className="flex ml-12 mb-1">
            {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
              <div 
                key={hour} 
                className="flex-1 text-center text-xs"
                style={{ color: colors.textMuted }}
              >
                {hour}时
              </div>
            ))}
          </div>

          {/* 热力图主体 */}
          {weekdays.map((day, dayIndex) => (
            <div key={dayIndex} className="flex items-center mb-1">
              {/* 星期标签 */}
              <div 
                className="w-10 text-xs text-right mr-2"
                style={{ color: colors.textSecondary }}
              >
                {day}
              </div>
              
              {/* 小时格子 */}
              <div className="flex-1 flex gap-0.5">
                {hours.map(hour => {
                  const value = heatmapMatrix[dayIndex][hour];
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-6 rounded-sm transition-all hover:opacity-80 cursor-pointer relative group"
                      style={{ 
                        backgroundColor: getColor(value),
                        minWidth: '4px'
                      }}
                      title={`${day} ${hour}:00 - ${Math.round(value)}mg`}
                    >
                      {/* 悬停提示 */}
                      <div className="hidden group-hover:block absolute z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        {day} {hour}:00<br />
                        {Math.round(value)}mg
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs" style={{ color: colors.textMuted }}>少</span>
          <div className="flex gap-1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, idx) => (
              <div
                key={idx}
                className="w-6 h-4 rounded"
                style={{ backgroundColor: getColor(intensity * maxValue) }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: colors.textMuted }}>多</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;
