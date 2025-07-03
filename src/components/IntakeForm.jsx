import React, { useState, useEffect } from 'react';
import { Save, X, Clock, Coffee, Calculator, Zap, Plus, Minus, HelpCircle, PlusCircle, Edit2 } from 'lucide-react'; // Added HelpCircle, PlusCircle, Edit2
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
  colors,
  lastRecord = null
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
    let finalCustomAmount = null;

    // 尝试解析自定义摄入量
    const parsedCustomAmount = parseFloat(customAmount);
    if (customAmount && !isNaN(parsedCustomAmount) && parsedCustomAmount >= 0) {
      finalCustomAmount = Math.round(parsedCustomAmount);
    }

    // 优先使用有效的自定义量
    if (finalCustomAmount !== null) {
      caffeineAmount = finalCustomAmount;
      const baseDrink = selectedDrinkId ? drinks.find(d => d.id === selectedDrinkId) : null;
      nameForRecord = finalEntryName || (baseDrink ? `${baseDrink.name} (自定义量)` : '自定义摄入');
      drinkIdForRecord = selectedDrinkId || null;
      if (drinkVolume) {
        const parsedVolume = parseFloat(drinkVolume);
        if (!isNaN(parsedVolume) && parsedVolume > 0) {
          volume = parsedVolume;
        }
      }
      if (baseDrink && finalEntryName && finalEntryName !== baseDrink.name) {
        customNameValue = finalEntryName;
      } else if (!baseDrink && finalEntryName) {
        customNameValue = finalEntryName;
      }
    }
    // 如果没有有效的自定义量，且选择了饮品，则根据体积计算
    else if (selectedDrinkId && drinkVolume) {
      const drink = drinks.find(d => d.id === selectedDrinkId);
      if (!drink) {
        alert("选择的饮品无效。");
        return;
      }

      const parsedVolume = parseFloat(drinkVolume);

      if (!isNaN(parsedVolume) && parsedVolume > 0) {
        caffeineAmount = calculateCaffeineAmount(drink, parsedVolume);
        volume = parsedVolume;
        drinkIdForRecord = drink.id;
        nameForRecord = finalEntryName || drink.name;

        if (finalEntryName && finalEntryName !== drink.name) {
          customNameValue = finalEntryName;
        }
      } else {
        alert(selectedDrink?.calculationMode === 'perGram' ? "请输入有效的咖啡豆用量 (必须大于 0)。" : "请输入有效的容量 (必须大于 0)。");
        return;
      }
    }
    // 如果两种方式都无法确定摄入量
    else {
      alert("请选择饮品并输入容量/用量，或清除选择并输入自定义摄入量和名称。");
      return;
    }
    
    // 最终检查 caffeineAmount 是否有效
    if (caffeineAmount <= 0 && !initialValues) { // 允许编辑为0mg
       if (!confirm("咖啡因摄入量为0mg或无效，是否继续？这可能用于记录无咖啡因饮品或清除错误条目。")) {
            // 用户选择不继续，可以在这里给 customAmount 或 drinkVolume 设置焦点
            return;
       }
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
      customAmount: finalCustomAmount // Store the validated custom amount
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
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xl font-semibold transition-colors flex items-center"
          style={{ color: colors.espresso }}
        >
          {initialValues ? <Edit2 size={20} className="mr-2" /> : <PlusCircle size={20} className="mr-2" />}
          {initialValues ? '编辑记录' : '添加记录'}
        </h2>
        
        {/* 快速重复上次记录按钮 */}
        {!initialValues && lastRecord && (
          <button
            type="button"
            onClick={() => {
              if (lastRecord.drinkId) {
                setSelectedDrinkId(lastRecord.drinkId);
                setDrinkVolume(lastRecord.volume?.toString() || '');
                setCustomAmount(lastRecord.customAmount?.toString() || '');
              } else {
                setCustomAmount(lastRecord.amount.toString());
                setDrinkVolume(lastRecord.volume?.toString() || '');
              }
              setEntryName(lastRecord.name || '');
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 hover:shadow-sm flex items-center"
            style={{
              backgroundColor: colors.bgBase,
              borderColor: colors.borderSubtle,
              color: colors.textSecondary
            }}
          >
            <Clock size={12} className="mr-1" />
            重复上次
          </button>
        )}
      </div>

      {/* 简化提示信息 */}
      {!initialValues && (
        <div 
          className="mb-2 p-2 text-xs rounded-md flex items-start"
          style={{ backgroundColor: colors.infoBg, color: colors.infoText, borderColor: colors.infoText, borderWidth: '1px', borderStyle: 'solid' }}
        >
          <HelpCircle size={14} className="mr-1.5 flex-shrink-0 mt-px" />
          <span>提示：可从下方历史记录中快速重复或复制条目。</span>
        </div>
      )}

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

      {/* 记录名称和摄入时间并排 */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label
            htmlFor="entryName"
            className="block mb-1 font-medium text-sm transition-colors flex items-center"
            style={{ color: colors.textSecondary }}
          >
            <Coffee size={14} className="mr-1.5" />
            记录名称:
          </label>
          <input
            id="entryName"
            type="text"
            className="w-full p-1.5 border rounded-md focus:outline-none focus:ring-2 text-sm transition-all duration-200"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              '--tw-ring-color': colors.accent + '40'
            }}
            value={entryName}
            onChange={(e) => setEntryName(e.target.value)}
            placeholder={selectedDrink ? selectedDrink.name : "提神咖啡"}
          />
        </div>
        <div>
          <label
            htmlFor="intakeTime"
            className="block mb-1 font-medium text-sm transition-colors flex items-center"
            style={{ color: colors.textSecondary }}
          >
            <Clock size={14} className="mr-1.5" />
            摄入时间:
          </label>
          <input
            id="intakeTime"
            type="datetime-local"
            className="w-full p-1.5 border rounded-md focus:outline-none focus:ring-2 text-sm transition-all duration-200"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              '--tw-ring-color': colors.accent + '40'
            }}
            value={intakeTime}
            onChange={(e) => setIntakeTime(e.target.value)}
            max={formatDatetimeLocal(new Date())}
          />
        </div>
      </div>

      {/* 容量/重量输入 - 移除条件，始终显示 */}
      <div className="mb-2">
        <label
          htmlFor="drinkVolume"
          className="block mb-1 font-medium text-sm transition-colors flex items-center"
          style={{ color: colors.textSecondary }}
        >
          <Calculator size={14} className="mr-1.5" />
          {selectedDrink?.calculationMode === 'perGram' ? "咖啡豆用量 (g):" : "容量 (ml):"}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(drinkVolume) || 0;
              const step = selectedDrink?.calculationMode === 'perGram' ? 1 : 10; // finer step for grams
              const newValue = Math.max(0, current - step);
              setDrinkVolume(newValue.toString());
              // 仅在选择了饮品时清除自定义量
              if(selectedDrinkId) {
                setCustomAmount('');
              }
            }}
            className="p-1.5 border rounded-md transition-all duration-200 hover:shadow-sm"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textSecondary
            }}
            disabled={!drinkVolume || parseFloat(drinkVolume) <= 0}
          >
            <Minus size={14} />
          </button>
          <input
            id="drinkVolume"
            type="number"
            className="flex-1 p-1.5 border rounded-md focus:outline-none focus:ring-2 text-sm transition-all duration-200 text-center"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              '--tw-ring-color': colors.accent + '40'
            }}
            value={drinkVolume}
            onChange={(e) => {
              setDrinkVolume(e.target.value);
              if (e.target.value.trim() !== '' && selectedDrinkId) {
                setCustomAmount('');
              }
            }}
            placeholder={volumeInputPlaceholder}
            min={volumeInputMin}
          />
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(drinkVolume) || 0;
              const step = selectedDrink?.calculationMode === 'perGram' ? 1 : 10; // finer step for grams
              const newValue = current + step;
              setDrinkVolume(newValue.toString());
              // 仅在选择了饮品时清除自定义量
              if(selectedDrinkId) {
                setCustomAmount('');
              }
            }}
            className="p-1.5 border rounded-md transition-all duration-200 hover:shadow-sm"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textSecondary
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        
        {/* 添加常见容量预设 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedDrink?.calculationMode === 'perGram' ? 
            [10, 15, 18, 20, 22, 25].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setDrinkVolume(amount.toString());
                  if(selectedDrinkId) {
                    setCustomAmount('');
                  }
                }}
                className="px-2 py-0.5 text-xs rounded-full border transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: drinkVolume === amount.toString() ? colors.accent + '20' : colors.bgBase,
                  borderColor: drinkVolume === amount.toString() ? colors.accent : colors.borderSubtle,
                  color: drinkVolume === amount.toString() ? colors.accent : colors.textMuted
                }}
              >
                {amount}g
              </button>
            )) : 
            [150, 200, 250, 300, 350, 450, 500, 650].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setDrinkVolume(amount.toString());
                  if(selectedDrinkId) {
                    setCustomAmount('');
                  }
                }}
                className="px-2 py-0.5 text-xs rounded-full border transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: drinkVolume === amount.toString() ? colors.accent + '20' : colors.bgBase,
                  borderColor: drinkVolume === amount.toString() ? colors.accent : colors.borderSubtle,
                  color: drinkVolume === amount.toString() ? colors.accent : colors.textMuted
                }}
              >
                {amount}ml
              </button>
            ))
          }
        </div>
        
        {calculatedAmount !== null && !customAmount && selectedDrinkId && (
          <div
            className="mt-1 p-1.5 rounded-md text-sm font-medium flex items-center transition-colors"
            style={{ 
              backgroundColor: colors.accent + '20',
              color: colors.textPrimary
            }}
          >
            <Zap size={14} className="mr-1.5" style={{ color: colors.accent }} />
            预计咖啡因摄入量: <span className="font-bold ml-1" style={{ color: colors.accent }}>{calculatedAmount} mg</span>
          </div>
        )}
        {selectedDrinkId && (
          <p
            className="text-xs mt-1 transition-colors"
            style={{ color: colors.textMuted }}
          >
            {volumeHelpText} {customAmount ? <strong style={{ color: colors.warningText }}>当前将使用下方指定的自定义摄入量。</strong> : ""}
          </p>
        )}
      </div>

      {/* 自定义量输入 */}
      <div className="mb-2">
        <label
          htmlFor="customAmount"
          className="block mb-1 font-medium text-sm transition-colors flex items-center"
          style={{ color: colors.textSecondary }}
        >
          <Zap size={14} className="mr-1.5" />
          摄入量 (mg):
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(customAmount) || 0;
              const step = current > 50 ? 10 : 5; // smaller step for smaller values
              const newValue = Math.max(0, current - step);
              setCustomAmount(newValue.toString());
            }}
            className="p-1.5 border rounded-md transition-all duration-200 hover:shadow-sm"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textSecondary
            }}
            disabled={!customAmount || parseFloat(customAmount) <= 0}
          >
            <Minus size={14} />
          </button>
          <input
            id="customAmount"
            type="number"
            className="flex-1 p-1.5 border rounded-md focus:outline-none focus:ring-2 text-sm transition-all duration-200 text-center"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textPrimary,
              '--tw-ring-color': colors.accent + '40'
            }}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
            }}
            placeholder="直接输入咖啡因毫克数"
            min="0"
          />
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(customAmount) || 0;
              const step = current >= 50 ? 10 : 5;
              const newValue = current + step;
              setCustomAmount(newValue.toString());
            }}
            className="p-1.5 border rounded-md transition-all duration-200 hover:shadow-sm"
            style={{
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgBase,
              color: colors.textSecondary
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        
        {/* 快速选择常用剂量 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {[25, 50, 75, 100, 150, 200].map(amount => (
            <button
              key={amount}
              type="button"
              onClick={() => setCustomAmount(amount.toString())}
              className="px-2 py-0.5 text-xs rounded-full border transition-all duration-200 hover:shadow-sm"
              style={{
                backgroundColor: customAmount === amount.toString() ? colors.accent + '20' : colors.bgBase,
                borderColor: customAmount === amount.toString() ? colors.accent : colors.borderSubtle,
                color: customAmount === amount.toString() ? colors.accent : colors.textMuted
              }}
            >
              {amount}mg
            </button>
          ))}
        </div>
        
        <p
          className="text-xs mt-1 transition-colors"
          style={{ color: colors.textMuted }}
        >
          {selectedDrinkId
            ? "填写此处将优先使用此数值作为总摄入量，取代上方按饮品和容量计算的结果。"
            : "可直接指定咖啡因总量，或结合上方容量手动记录。"}
        </p>
      </div>

      {/* 表单按钮 */}
      <div className="flex space-x-3 mt-3 pt-2 border-t" style={{ borderColor: colors.borderSubtle }}>
        <button
          onClick={handleSubmit}
          className="flex-1 py-2 px-4 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm font-medium transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: colors.accent }}
        >
          <Save size={16} className="mr-2" />
          {initialValues ? '保存修改' : '添加记录'}
        </button>
        <button
          onClick={onCancel}
          className="py-2 px-4 border rounded-lg hover:shadow-md transition-all duration-200 flex items-center justify-center text-sm font-medium transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            borderColor: colors.borderStrong,
            color: colors.textSecondary,
            backgroundColor: colors.bgBase
          }}
        >
          <X size={16} className="mr-2" /> 取消
        </button>
      </div>
    </div>
  );
};

export default IntakeForm;