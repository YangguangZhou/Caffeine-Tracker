// caffeineCalculations.js - 咖啡因计算相关工具函数

/**
 * 计算单次摄入的咖啡因在特定时间点的剩余量。
 * 使用基于半衰期的一级消除动力学公式。
 * M(t) = M0 * (0.5)^(t / t_half)
 * 
 * @param {number} initialAmount - 初始咖啡因量 (mg)
 * @param {number} intakeTimestamp - 摄入时间戳 (毫秒)
 * @param {number} calculationTimestamp - 计算时间点的时间戳 (毫秒)
 * @param {number} halfLifeHours - 咖啡因半衰期（小时）
 * @returns {number} 剩余咖啡因量 (mg)，如果计算时间早于摄入时间则返回0
 */
export const calculateRemainingCaffeine = (initialAmount, intakeTimestamp, calculationTimestamp, halfLifeHours) => {
  // 验证输入
  if (calculationTimestamp < intakeTimestamp || halfLifeHours <= 0 || initialAmount <= 0) {
    return 0;
  }

  // 计算经过的小时数
  const hoursElapsed = (calculationTimestamp - intakeTimestamp) / (1000 * 60 * 60);

  // 计算剩余量
  const remaining = initialAmount * Math.pow(0.5, hoursElapsed / halfLifeHours);

  // 确保结果非负
  return Math.max(0, remaining);
};

/**
 * 计算特定时间点系统中所有记录的总咖啡因量。
 * 
 * @param {Array} records - 摄入记录数组
 * @param {number} calculationTimestamp - 计算时间点的时间戳 (毫秒)
 * @param {number} halfLifeHours - 咖啡因半衰期（小时）
 * @returns {number} 指定时间的总咖啡因量 (mg)
 */
export const getTotalCaffeineAtTime = (records, calculationTimestamp, halfLifeHours) => {
  let total = 0;

  records.forEach(record => {
    if (record && typeof record.timestamp === 'number' && typeof record.amount === 'number') {
      total += calculateRemainingCaffeine(
        record.amount,
        record.timestamp,
        calculationTimestamp,
        halfLifeHours
      );
    }
  });

  return total;
};

/**
 * 估算当前咖啡因水平降至目标量所需的时间。
 * 使用反向衰减公式: t = t_half * log2(C_current / C_target)
 * 
 * @param {number} currentAmount - 当前咖啡因量 (mg)
 * @param {number} targetAmount - 目标咖啡因量 (mg)
 * @param {number} halfLifeHours - 咖啡因半衰期（小时）
 * @returns {number|null} 所需时间（小时），如果计算不可能或不需要则返回null
 */
export const calculateHoursToReachTarget = (currentAmount, targetAmount, halfLifeHours) => {
  // 验证输入
  if (currentAmount <= targetAmount || targetAmount < 0 || halfLifeHours <= 0) {
    return 0; // 已经低于或等于目标，或输入无效
  }

  // 避免目标为0时的log(无穷大)，使用一个小值
  if (targetAmount === 0) targetAmount = 0.1;

  // 计算所需小时数
  const hoursNeeded = halfLifeHours * Math.log2(currentAmount / targetAmount);

  return isFinite(hoursNeeded) && hoursNeeded >= 0 ? hoursNeeded : null;
};

/**
 * 基于总量、体重和分布容积计算估计的咖啡因浓度(mg/L)。
 * C = Amount / (Vd * Weight)
 * 
 * @param {number} totalAmountMg - 体内总咖啡因量 (mg)
 * @param {number} weightKg - 用户体重 (kg)
 * @param {number} volumeOfDistribution - 分布容积 (L/kg)
 * @returns {number|null} 估计浓度 (mg/L) 或输入无效时为null
 */
export const estimateConcentration = (totalAmountMg, weightKg, volumeOfDistribution) => {
  // 验证输入
  if (totalAmountMg < 0 || weightKg <= 0 || volumeOfDistribution <= 0) {
    return null;
  }

  // 计算总分布容积（升）
  const totalVolumeL = volumeOfDistribution * weightKg;

  // 计算浓度
  return totalAmountMg / totalVolumeL;
};

/**
 * 计算对应目标浓度的估计咖啡因量 (mg)。
 * Amount = TargetConcentration * Vd * Weight
 * 
 * @param {number} targetConcentrationMgL - 目标浓度 (mg/L)
 * @param {number} weightKg - 用户体重 (kg)
 * @param {number} volumeOfDistribution - 分布容积 (L/kg)
 * @returns {number|null} 估计量 (mg) 或输入无效时为null
 */
export const estimateAmountFromConcentration = (targetConcentrationMgL, weightKg, volumeOfDistribution) => {
  // 验证输入
  if (targetConcentrationMgL < 0 || weightKg <= 0 || volumeOfDistribution <= 0) {
    return null;
  }

  // 计算总分布容积（升）
  const totalVolumeL = volumeOfDistribution * weightKg;

  // 计算量
  return targetConcentrationMgL * totalVolumeL;
};

/**
 * 计算摄入特定饮品的咖啡因量
 * 
 * @param {Object} drink - 饮品对象，包含 calculationMode, caffeineContent (mg/100ml), caffeinePerGram (mg/g)
 * @param {number} inputValue - 容量 (ml) 或重量 (g)，取决于 drink.calculationMode
 * @returns {number} 咖啡因量 (mg)
 */
export const calculateCaffeineAmount = (drink, inputValue) => {
  if (!drink || typeof inputValue !== 'number' || inputValue <= 0) {
    return 0;
  }

  if (drink.calculationMode === 'perGram') {
    if (typeof drink.caffeinePerGram !== 'number' || drink.caffeinePerGram < 0) {
      return 0;
    }
    return Math.round(drink.caffeinePerGram * inputValue);
  } else { // 默认为 'per100ml'
    if (typeof drink.caffeineContent !== 'number' || drink.caffeineContent < 0) {
      return 0;
    }
    return Math.round((drink.caffeineContent * inputValue) / 100);
  }
};

/**
 * 生成指定时间范围内的咖啡因代谢曲线数据
 * 
 * @param {Array} records - 摄入记录数组
 * @param {number} halfLifeHours - 咖啡因半衰期（小时）
 * @param {number} hoursBefore - 当前时间之前的小时数
 * @param {number} hoursAfter - 当前时间之后的小时数
 * @param {number} pointsPerHour - 每小时的数据点数
 * @returns {Array} 代谢曲线数据数组
 */
export const generateMetabolismChartData = (records, halfLifeHours,
  hoursBefore = 6, hoursAfter = 18,
  pointsPerHour = 4) => {
  const now = Date.now();
  const data = [];

  const startTime = now - hoursBefore * 60 * 60 * 1000;
  const endTime = now + hoursAfter * 60 * 60 * 1000;
  const interval = (60 / pointsPerHour) * 60 * 1000; // 间隔（毫秒）

  for (let time = startTime; time <= endTime; time += interval) {
    const caffeineLevel = getTotalCaffeineAtTime(records, time, halfLifeHours);
    data.push({
      time: time,
      // timeLabel: formatTime(time), // 可用于工具提示
      caffeine: parseFloat(caffeineLevel.toFixed(1)), // 四舍五入以便显示
    });
  }

  return data;
};