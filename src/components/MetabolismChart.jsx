import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

/**
 * 咖啡因代谢曲线图组件
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.metabolismChartData - 代谢曲线数据
 * @param {Object} props.userSettings - 用户设置
 * @param {Function} props.formatTime - 时间格式化函数
 * @param {Function} props.estimateAmountFromConcentration - 浓度转咖啡因量的函数
 * @param {Object} props.colors - 颜色主题
 */
const MetabolismChart = ({ 
  metabolismChartData, 
  userSettings, 
  formatTime, 
  estimateAmountFromConcentration,
  colors
}) => {
  // 获取当前时间戳
  const now = useMemo(() => Date.now(), []);
  
  // 计算睡眠安全目标咖啡因量
  const safeTargetAmount = useMemo(() => {
    const { safeSleepThresholdConcentration, weight, volumeOfDistribution } = userSettings;
    return estimateAmountFromConcentration(
      safeSleepThresholdConcentration, 
      weight, 
      volumeOfDistribution
    );
  }, [userSettings, estimateAmountFromConcentration]);

  // 计算y轴最大值
  const yMax = useMemo(() => {
    // 找出图表数据中的最大咖啡因量
    const maxCaffeineValue = metabolismChartData.length > 0
      ? Math.max(...metabolismChartData.map(d => d.caffeine))
      : 50; // 如果没有数据，默认为50
      
    // 取最大咖啡因量和安全睡眠量中的较大值，并向上取整到10的倍数
    return Math.ceil(Math.max(maxCaffeineValue, safeTargetAmount ?? 0) * 1.1 / 10) * 10;
  }, [metabolismChartData, safeTargetAmount]);

  // 格式化tooltip标签
  const formatTooltipLabel = (unixTime) => formatTime(unixTime);
  
  // 格式化tooltip值
  const formatTooltipValue = (value) => [
    `${value.toFixed(1)} mg`, 
    '体内含量'
  ];

  return (
    <div className="mt-4 min-h-[280px] p-4 rounded-lg transition-colors" style={{ backgroundColor: colors.bgBase }}>
      <h3 className="text-center text-sm font-medium mb-3 transition-colors" style={{ color: colors.textSecondary }}>
        咖啡因代谢曲线 (mg)
      </h3>
      
      {metabolismChartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={metabolismChartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 30 }} // 增加了边距提高可读性
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              opacity={0.7}
            />
            
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              tick={{ fontSize: 11, fill: colors.textMuted }}
              label={{ 
                value: "时间", 
                position: "insideBottom", 
                dy: 15, 
                fill: colors.textMuted, 
                fontSize: 12 
              }}
              stroke={colors.textMuted}
            />
            
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 11, fill: colors.textMuted }}
              label={{ 
                value: "咖啡因 (mg)", 
                angle: -90, 
                position: "insideLeft", 
                dx: -10, 
                fill: colors.textMuted, 
                fontSize: 12 
              }}
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
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
              animationDuration={200}
            />
            
            {/* 咖啡因含量曲线 */}
            <Line
              type="monotone"
              dataKey="caffeine"
              stroke={colors.chartLine}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: colors.chartLine, 
                stroke: colors.bgCard, 
                strokeWidth: 2 
              }}
              name="体内含量"
              animationDuration={750}
            />
            
            {/* 当前时间参考线 */}
            <ReferenceLine
              x={now}
              stroke={colors.chartNowLine}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{ 
                value: "现在", 
                position: "insideTopLeft", 
                fill: colors.chartNowLine, 
                fontSize: 10, 
                dy: -5 
              }}
            />
            
            {/* 安全睡眠阈值参考线 */}
            {safeTargetAmount !== null && safeTargetAmount >= 0 && (
              <ReferenceLine
                y={safeTargetAmount}
                stroke={colors.chartSleepLine}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                label={{ 
                  value: `睡眠阈值 (~${safeTargetAmount.toFixed(0)}mg)`, 
                  position: "insideBottomRight", 
                  fill: colors.chartSleepLine, 
                  fontSize: 10, 
                  dy: 10, 
                  dx: -5 
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-60 text-sm transition-colors" style={{ color: colors.textMuted }}>
          {metabolismChartData.length > 0 ? "正在生成图表..." : "添加摄入记录以查看代谢曲线。"}
        </div>
      )}
      
      <p className="text-xs mt-3 text-center transition-colors" style={{ color: colors.textMuted }}>
        图表显示基于您记录的摄入量和半衰期 ({userSettings.caffeineHalfLifeHours}小时) 的估算体内咖啡因含量 (mg) 变化。
      </p>
    </div>
  );
};

export default MetabolismChart;