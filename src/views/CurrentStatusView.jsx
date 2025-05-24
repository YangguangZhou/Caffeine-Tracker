import React, { useState } from 'react';
import {
  Activity, Clock, Edit, Trash2, Plus,
  AlertCircle, Moon, Calendar, Droplet
} from 'lucide-react';
import MetabolismChart from '../components/MetabolismChart';
import IntakeForm from '../components/IntakeForm';
import { formatTime, formatDate } from '../utils/timeUtils';

/**
 * 当前状态视图组件
 * 显示当前咖啡因状态、代谢曲线和摄入历史
 */
const CurrentStatusView = ({
  currentCaffeineAmount,
  currentCaffeineConcentration,
  optimalSleepTime,
  hoursUntilSafeSleep,
  userStatus,
  healthAdvice,
  records,
  drinks,
  metabolismChartData,
  userSettings,
  percentFilled,
  todayTotal,
  effectiveMaxDaily,
  personalizedRecommendation,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  estimateAmountFromConcentration,
  colors
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const handleAddRecordClick = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = (record) => {
    if (editingRecord) {
      onEditRecord(record);
    } else {
      onAddRecord(record);
    }
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  // 根据健康建议类型确定样式
  const getHealthAdviceStyles = () => {
    let styleProps = {
      bgColor: colors.infoBg,
      textColor: colors.infoText,
      borderColor: colors.infoText,
    };

    switch (healthAdvice.type) {
      case 'success':
        styleProps.bgColor = colors.successBg;
        styleProps.textColor = colors.successText;
        styleProps.borderColor = colors.successText;
        break;
      case 'warning':
        styleProps.bgColor = colors.warningBg;
        styleProps.textColor = colors.warningText;
        styleProps.borderColor = colors.warningText;
        break;
      case 'danger':
        styleProps.bgColor = colors.dangerBg;
        styleProps.textColor = colors.dangerText;
        styleProps.borderColor = colors.dangerText;
        break;
    }

    return {
      backgroundColor: styleProps.bgColor,
      color: styleProps.textColor,
      borderColor: styleProps.borderColor,
      borderWidth: '1px',
      borderStyle: 'solid',
    };
  };

  return (
    <>
      <section
        aria-labelledby="current-status-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="current-status-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Activity size={20} className="mr-2" /> 当前状态
        </h2>

        {/* 半圆进度表 */}
        <div className="relative w-full flex justify-center my-6">
          <svg width="240" height="160" viewBox="0 0 240 160">
            {/* 背景轨道 */}
            <path
              d="M20,130 A100,100 0 0,1 220,130"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* 前景进度 */}
            <path
              d="M20,130 A100,100 0 0,1 220,130"
              fill="none"
              stroke="url(#caffeine-gauge-gradient)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray="314.16"
              strokeDashoffset={314.16 - (314.16 * percentFilled / 100)}
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="caffeine-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.safe} />
                <stop offset="75%" stopColor={colors.warning} />
                <stop offset="100%" stopColor={colors.danger} />
              </linearGradient>
            </defs>
            {/* 标签 */}
            <text x="20" y="155" fontSize="12" fill={colors.textMuted} textAnchor="start">0</text>
            <text x="120" y="155" fontSize="12" fill={colors.textMuted} textAnchor="middle">{Math.round(effectiveMaxDaily / 2)}</text>
            <text x="220" y="155" fontSize="12" fill={colors.textMuted} textAnchor="end">{effectiveMaxDaily}+</text>
            {/* 中心文字 */}
            <text x="120" y="100" fontSize="32" fontWeight="bold" fill={colors.espresso} textAnchor="middle">{Math.round(currentCaffeineAmount)}</text>
            <text x="120" y="120" fontSize="14" fill={colors.textMuted} textAnchor="middle">mg 当前含量</text>
            {/* 浓度显示 */}
            {currentCaffeineConcentration > 0 && (
              <text x="120" y="135" fontSize="10" fill={colors.textMuted} textAnchor="middle">(约 {currentCaffeineConcentration.toFixed(1)} mg/L)</text>
            )}
          </svg>
        </div>

        {/* 状态文本 */}
        <div className="text-center mb-4 mt-2">
          <h3 className={`text-lg font-semibold ${userStatus.color}`}>
            {userStatus.status}
          </h3>
          <p
            className="mt-1 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            {userStatus.recommendation}
          </p>

          {/* 健康建议 */}
          <aside
            aria-label="健康建议"
            className={`mt-3 text-sm p-3 rounded-lg`}
            style={getHealthAdviceStyles()}
          >
            <div className="flex items-center justify-center">
              <AlertCircle size={16} className="inline-block mr-1.5 flex-shrink-0" />
              <span>{healthAdvice.advice}</span>
            </div>
          </aside>
        </div>

        {/* 摘要统计 */}
        <div
          className="grid grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t transition-colors"
          style={{
            color: colors.textSecondary,
            borderColor: colors.borderSubtle
          }}
        >
          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            今日总摄入: <br />
            <span
              className="font-semibold text-base transition-colors"
              style={{ color: colors.espresso }}
            >
              {todayTotal} mg
            </span>
          </div>
          <div
            className="text-center p-2 rounded transition-colors"
            style={{ backgroundColor: colors.bgBase }}
          >
            每日推荐上限: <br />
            <span
              className="font-semibold text-base transition-colors"
              style={{ color: colors.espresso }}
            >
              {effectiveMaxDaily} mg
            </span>
            {personalizedRecommendation && effectiveMaxDaily !== personalizedRecommendation && (
              <span className="text-xs block">
                ({personalizedRecommendation}mg 基于体重)
              </span>
            )}
          </div>
        </div>

        {/* 最佳睡眠时间 */}
        <div
          className="mt-3 text-sm text-center p-3 rounded-lg border"
          style={{
            backgroundColor: colors.infoBg,
            color: colors.infoText,
            borderColor: colors.infoText,
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          <p className="flex items-center justify-center">
            <Moon size={16} className="inline-block mr-1.5" />
            {optimalSleepTime === 'N/A'
              ? `无法计算建议睡眠时间 (检查设置)`
              : optimalSleepTime === '现在'
                ? `根据阈值 (<${userSettings.safeSleepThresholdConcentration.toFixed(1)}mg/L)，现在可以入睡`
                : `建议最早睡眠时间: ${optimalSleepTime}`
            }
          </p>
          {hoursUntilSafeSleep !== null && hoursUntilSafeSleep > 0 && (
            <p className="text-xs mt-1">
              (约 {hoursUntilSafeSleep.toFixed(1)} 小时后达到安全阈值)
            </p>
          )}
        </div>
      </section>

      {/* 代谢曲线图卡片 */}
      <section
        aria-labelledby="metabolism-chart-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="metabolism-chart-heading"
          className="text-xl font-semibold mb-2 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          咖啡因代谢曲线
        </h2>
        <MetabolismChart
          metabolismChartData={metabolismChartData}
          userSettings={userSettings}
          formatTime={formatTime}
          estimateAmountFromConcentration={estimateAmountFromConcentration}
          colors={colors}
        />
      </section>

      {/* 添加/编辑表单卡片 */}
      <section
        aria-labelledby="intake-form-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2 id="intake-form-heading" className="sr-only">添加或编辑摄入记录</h2>
        {showForm ? (
          <IntakeForm
            drinks={drinks}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            initialValues={editingRecord}
            colors={colors}
          />
        ) : (
          <button
            onClick={handleAddRecordClick}
            className="w-full py-3 text-white rounded-md hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-md font-medium"
            style={{ backgroundColor: colors.accent }}
          >
            <Plus size={18} className="mr-1.5" /> 添加咖啡因摄入记录
          </button>
        )}
      </section>

      {/* 摄入历史卡片 */}
      <section
        aria-labelledby="intake-history-heading"
        className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle
        }}
      >
        <h2
          id="intake-history-heading"
          className="text-xl font-semibold mb-4 flex items-center transition-colors"
          style={{ color: colors.espresso }}
        >
          <Clock size={20} className="mr-2" /> 摄入历史
        </h2>

        {records.length === 0 ? (
          <p
            className="text-center py-4 transition-colors"
            style={{ color: colors.textMuted }}
          >
            暂无记录。添加您的第一条咖啡因摄入记录吧！
          </p>
        ) : (
          <ul
            className="divide-y max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full transition-colors"
            style={{
              borderColor: colors.borderSubtle,
              scrollbarColor: `${colors.borderStrong} transparent`
            }}
          >
            {records.map(record => (
              <li key={record.id} className="py-3.5 flex justify-between items-center">
                <div className="flex-1 overflow-hidden mr-2">
                  <p
                    className="font-medium text-sm truncate transition-colors"
                    style={{ color: colors.textPrimary }}
                    title={record.name}
                  >
                    {record.name} - <span style={{ color: colors.accent }}>{record.amount} mg</span>
                    {record.customName && record.drinkId && (
                      <span className="text-xs text-gray-500 ml-1 italic">
                        (来自: {drinks.find(d => d.id === record.drinkId)?.name ?? '未知饮品'})
                      </span>
                    )}
                    {!record.customName && record.drinkId && record.volume === null && (
                      <span className="text-xs text-gray-500 ml-1 italic">(手动)</span>
                    )}
                  </p>
                  <div
                    className="text-xs flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1" /> {formatDate(record.timestamp)}
                    </span>
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" /> {formatTime(record.timestamp)}
                    </span>
                    {record.volume && (
                      <span className="flex items-center">
                        <Droplet size={12} className="mr-1" /> {record.volume} ml
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditRecord(record)}
                    className="p-1.5 rounded-full hover:bg-amber-100 transition-colors duration-150"
                    style={{ color: colors.textSecondary }}
                    aria-label={`编辑 ${record.name} 记录`}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(record.id)}
                    className="p-1.5 rounded-full hover:bg-red-100 transition-colors duration-150 text-red-600"
                    aria-label={`删除 ${record.name} 记录`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default CurrentStatusView;