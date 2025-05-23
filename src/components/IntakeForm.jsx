import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import DrinkSelector from './DrinkSelector';
import { formatDatetimeLocal } from '../utils/timeUtils';
import { calculateCaffeineAmount } from '../utils/caffeineCalculations';
import { DEFAULT_CATEGORY, DRINK_CATEGORIES } from '../utils/constants';

/**
 * 咖啡因摄入表单组件
 * 用于添加或编辑咖啡因摄入记录
 * 
 * @param {Object} props
 * @param {Array} props.drinks - 饮品列表
 * @param {Function} props.onSubmit - 提交表单时的回调
 * @param {Function} props.onCancel - 取消表单时的回调
 * @param {Object} props.initialValues - 初始值（用于编辑模式）
 * @param {Object} props.colors - 颜色主题
 */
const IntakeForm = ({
  drinks,
  onSubmit,
  onCancel,
  initialValues = null,
  colors
}) => {
  // 表单状态
  const [selectedDrinkId, setSelectedDrinkId] = useState('');
  const [drinkVolume, setDrinkVolume] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [entryName, setEntryName] = useState('');
  const [intakeTime, setIntakeTime] = useState(formatDatetimeLocal(new Date()));

  // 选中的饮品
  const selectedDrink = drinks.find(d => d.id === selectedDrinkId);

  // 计算的咖啡因量（基于体积或重量）
  const calculatedAmount = selectedDrink && drinkVolume
    ? calculateCaffeineAmount(selectedDrink, parseFloat(drinkVolume))
    : null;

  // 加载初始值（用于编辑模式）
  useEffect(() => {
    if (initialValues) {
      setSelectedDrinkId(initialValues.drinkId || '');
      setDrinkVolume(initialValues.volume !== null ? initialValues.volume.toString() : '');
      setCustomAmount(initialValues.customAmount ? initialValues.customAmount.toString() : '');
      setEntryName(initialValues.name || '');
      setIntakeTime(formatDatetimeLocal(new Date(initialValues.timestamp || Date.now())));
    }
  }, [initialValues]);

  // 当选中饮品变化时，更新饮品体积和名称
  useEffect(() => {
    if (selectedDrinkId && !initialValues) {
      const drink = drinks.find(d => d.id === selectedDrinkId);
      if (drink) {
        setDrinkVolume(drink.defaultVolume?.toString() ?? '');
        setEntryName(drink.name);
        // 清除自定义量，因为选择了预设饮品，其计算方式已确定
        setCustomAmount('');
      }
    }
  }, [selectedDrinkId, drinks, initialValues]);

  // 清除饮品选择
  const handleClearSelection = () => {
    setSelectedDrinkId('');
    // 保留自定义量，因为用户可能想要手动输入
  };

  // 提交表单
  const handleSubmit = () => {
    let caffeineAmount = 0;
    let nameForRecord = '';
    let volume = null;
    let drinkIdForRecord = null;
    let customNameValue = null;
    const finalEntryName = entryName.trim();

    // 优先使用自定义量
    if (customAmount) {
      const parsedAmount = parseFloat(customAmount);
      if (!isNaN(parsedAmount) && parsedAmount >= 0) {
        caffeineAmount = Math.round(parsedAmount);
        const baseDrink = selectedDrinkId ? drinks.find(d => d.id === selectedDrinkId) : null;
        nameForRecord = finalEntryName || (baseDrink ? `${baseDrink.name} (手动)` : '自定义摄入');
        drinkIdForRecord = selectedDrinkId || null;
        if (drinkVolume) {
          const parsedVolume = parseFloat(drinkVolume);
          if (!isNaN(parsedVolume) && parsedVolume > 0) {
            volume = parsedVolume; // 如果 drinkVolume 有效且大于0，则记录
          }
        }
        if (baseDrink && finalEntryName && finalEntryName !== baseDrink.name) {
          customNameValue = finalEntryName;
        } else if (!baseDrink && finalEntryName) {
          customNameValue = finalEntryName;
        }
      } else {
        alert("请输入有效的自定义咖啡因摄入量 (必须大于或等于 0)。");
        return;
      }
    }
    // 如果没有自定义量，且选择了饮品，则根据体积计算
    else if (selectedDrinkId && drinkVolume) {
      const drink = drinks.find(d => d.id === selectedDrinkId);
      if (!drink) {
        alert("选择的饮品无效。");
        return;
      }

      const caffeineContent = drink.caffeineContent; // This specific variable might not be directly used if calculateCaffeineAmount takes the whole drink object
      const parsedVolume = parseFloat(drinkVolume);

      if (!isNaN(parsedVolume) && parsedVolume > 0) { // caffeineContent check is now inside calculateCaffeineAmount
        caffeineAmount = calculateCaffeineAmount(drink, parsedVolume);
        volume = parsedVolume;
        drinkIdForRecord = drink.id;
        nameForRecord = finalEntryName || drink.name;

        // 仅当自定义名称与基础饮品名称不同时，才存储自定义名称
        if (finalEntryName && finalEntryName !== drink.name) {
          customNameValue = finalEntryName;
        }
      } else {
        alert(selectedDrink?.calculationMode === 'perGram' ? "请输入有效的咖啡豆用量 (必须大于 0)。" : "请输入有效的容量 (必须大于 0)。");
        return;
      }
    }
    // 如果没有自定义量，也没有选择饮品，或选择了饮品但没有体积
    else {
      alert("请选择饮品并输入容量，或清除选择并输入自定义摄入量和名称。");
      return;
    }

    // 验证时间戳
    let timestamp;
    try {
      timestamp = new Date(intakeTime).getTime();
      if (isNaN(timestamp)) throw new Error("Invalid date format");
    } catch (e) {
      alert("请输入有效的摄入时间。");
      console.error("Invalid date/time value:", intakeTime);
      return;
    }

    // 创建记录对象
    const record = {
      id: initialValues?.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: nameForRecord,
      amount: caffeineAmount,
      volume: volume,
      timestamp,
      drinkId: drinkIdForRecord,
      customName: customNameValue,
      customAmount: customAmount ? parseFloat(customAmount) : null
    };

    // 调用提交回调
    onSubmit(record);
  };

  const volumeInputLabel = selectedDrink?.calculationMode === 'perGram' ? "咖啡豆用量 (g):" : "容量 (ml):";
  const volumeInputPlaceholder = selectedDrink?.calculationMode === 'perGram'
    ? `例如: ${selectedDrink?.defaultVolume ?? '15'}`
    : `例如: ${selectedDrink?.defaultVolume ?? '250'}`;
  const volumeInputMin = "1";
  const volumeHelpText = selectedDrink?.calculationMode === 'perGram'
    ? "输入咖啡豆用量(克)以计算咖啡因。如需直接输入含量，请清除饮品选择。"
    : "输入容量以计算咖啡因。如需直接输入含量，请清除饮品选择。";

  return (
    <div className="transition-all">
      <h2
        className="text-xl font-semibold mb-4 transition-colors"
        style={{ color: colors.espresso }}
      >
        {initialValues ? '编辑咖啡因摄入记录' : '添加咖啡因摄入记录'}
      </h2>

      {/* 饮品选择器 */}
      <DrinkSelector
        drinks={drinks}
        selectedDrinkId={selectedDrinkId}
        onSelectDrink={(id) => {
          if (selectedDrinkId === id) {
            setSelectedDrinkId('');
          } else {
            setSelectedDrinkId(id);
            setCustomAmount('');
          }
        }}
        onClearSelection={handleClearSelection}
        DEFAULT_CATEGORY={DEFAULT_CATEGORY}
        DRINK_CATEGORIES={DRINK_CATEGORIES}
        colors={colors}
      />

      {/* 摄入时间输入 */}
      <div className="mb-4">
        <label
          htmlFor="intakeTime"
          className="block mb-1 font-medium text-sm transition-colors"
          style={{ color: colors.textSecondary }}
        >
          摄入时间:
        </label>
        <input
          id="intakeTime"
          type="datetime-local"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
          style={{
            borderColor: colors.borderStrong,
            backgroundColor: colors.bgBase,
            color: colors.textPrimary
          }}
          value={intakeTime}
          onChange={(e) => setIntakeTime(e.target.value)}
          max={formatDatetimeLocal(new Date())}
        />
      </div>

      {/* 记录名称输入 */}
      <div className="mb-4">
        <label
          htmlFor="entryName"
          className="block mb-1 font-medium text-sm transition-colors"
          style={{ color: colors.textSecondary }}
        >
          记录名称:
        </label>
        <input
          id="entryName"
          type="text"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
          style={{
            borderColor: colors.borderStrong,
            backgroundColor: colors.bgBase,
            color: colors.textPrimary
          }}
          value={entryName}
          onChange={(e) => setEntryName(e.target.value)}
          placeholder={selectedDrink ? selectedDrink.name : "例如：午后提神咖啡"}
        />
        <p
          className="text-xs mt-1 transition-colors"
          style={{ color: colors.textMuted }}
        >
          {selectedDrinkId ? "可修改名称用于本次记录。" : "输入本次摄入的名称。"}
        </p>
      </div>

      {/* 容量/重量输入（条件渲染） */}
      {selectedDrinkId && (
        <div className="mb-4">
          <label
            htmlFor="drinkVolume"
            className="block mb-1 font-medium text-sm transition-colors"
            style={{ color: colors.textSecondary }}
          >
            {volumeInputLabel}
          </label>
          <input
            id="drinkVolume"
            type="number"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textPrimary
            }}
            value={drinkVolume}
            onChange={(e) => {
              setDrinkVolume(e.target.value);
              // 当通过容量/重量输入时，清除自定义摄入量
              if (e.target.value.trim() !== '') {
                setCustomAmount('');
              }
            }}
            placeholder={volumeInputPlaceholder}
            min={volumeInputMin}
          />
          {calculatedAmount !== null && (
            <div
              className="mt-1 text-xs transition-colors"
              style={{ color: colors.textMuted }}
            >
              预计咖啡因摄入量: {calculatedAmount} mg
            </div>
          )}
          <p
            className="text-xs mt-1 transition-colors"
            style={{ color: colors.textMuted }}
          >
            {volumeHelpText}
          </p>
        </div>
      )}

      {/* 自定义量输入 */}
      <div className="mb-4">
        <label
          htmlFor="customAmount"
          className="block mb-1 font-medium text-sm transition-colors"
          style={{ color: colors.textSecondary }}
        >
          摄入量 (mg):
        </label>
        <input
          id="customAmount"
          type="number"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
          style={{
            borderColor: colors.borderStrong,
            backgroundColor: colors.bgBase,
            color: colors.textPrimary
          }}
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            // 当用户开始输入自定义含量时，如果之前选择了饮品，则清除饮品选择和用量/体积
            // 这样可以避免混淆：是按饮品计算还是按自定义含量计算
            if (e.target.value.trim() !== '' && selectedDrinkId) {
              //保留饮品选择，让用户可以基于某个饮品手动调整总量
              //setSelectedDrinkId(''); 
              //setDrinkVolume('');
            }
          }}
          placeholder="直接输入咖啡因毫克数"
          min="0"
        />
        <p
          className="text-xs mt-1 transition-colors"
          style={{ color: colors.textMuted }}
        >
          {selectedDrinkId
            ? "如果在此输入，将覆盖上方按容量计算的值。"
            : "如果您不选择饮品，请在此直接输入咖啡因总量。"}
        </p>
      </div>

      {/* 表单按钮 */}
      <div className="flex space-x-3 mt-6">
        <button
          onClick={handleSubmit}
          className="flex-1 py-2.5 px-4 text-white rounded-md hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-md text-sm font-medium"
          style={{ backgroundColor: colors.accent }}
        >
          <Save size={16} className="mr-1.5" />
          {initialValues ? '保存修改' : '添加记录'}
        </button>
        <button
          onClick={onCancel}
          className="py-2.5 px-4 border rounded-md hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center text-sm font-medium"
          style={{
            borderColor: colors.borderStrong,
            color: colors.textSecondary
          }}
        >
          <X size={16} className="mr-1.5" /> 取消
        </button>
      </div>
    </div>
  );
};

export default IntakeForm;