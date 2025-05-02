import React, { useState } from 'react';
import {
    User, Weight, Target, Sliders, Clock, Moon,
    Droplet, Coffee, Plus, X, Save, Edit, Trash2,
    Download, Upload, RotateCcw, HelpCircle, Tag,
    CloudDownload, Server, Lock, Activity, TestTubeDiagonal // 替换 Server 图标
} from 'lucide-react';
import { formatDatetimeLocal } from '../utils/timeUtils';
import { initialPresetDrinks, DRINK_CATEGORIES, DEFAULT_CATEGORY } from '../utils/constants';

/**
 * 设置视图组件
 * 包含个人设置、代谢设置、饮品管理和数据管理
 *
 * @param {Object} props
 * @param {Object} props.userSettings - 用户设置
 * @param {Function} props.onUpdateSettings - 更新设置的回调
 * @param {Array} props.drinks - 饮品列表
 * @param {Function} props.setDrinks - 设置饮品列表的函数
 * @param {Set} props.originalPresetDrinkIds - 原始预设饮品ID集合
 * @param {Function} props.onManualSync - 手动同步的回调
 * @param {Object} props.syncStatus - 同步状态信息
 * @param {Array} props.records - 摄入记录
 * @param {Function} props.setRecords - 设置记录的函数
 * @param {Object} props.colors - 颜色主题
 */
const SettingsView = ({
    userSettings,
    onUpdateSettings,
    drinks,
    setDrinks,
    originalPresetDrinkIds,
    onManualSync,
    syncStatus,
    records,
    setRecords,
    colors
}) => {
    // 饮品编辑状态
    const [showDrinkEditor, setShowDrinkEditor] = useState(false);
    const [editingDrink, setEditingDrink] = useState(null);
    const [newDrinkName, setNewDrinkName] = useState('');
    const [newDrinkCaffeine, setNewDrinkCaffeine] = useState('');
    const [newDrinkVolume, setNewDrinkVolume] = useState('');
    const [newDrinkCategory, setNewDrinkCategory] = useState(DEFAULT_CATEGORY);

    // WebDAV测试状态
    const [testingWebDAV, setTestingWebDAV] = useState(false);
    const [webDAVTestResult, setWebDAVTestResult] = useState(null);

    // 处理设置变更
    const handleSettingChange = (key, value) => {
        onUpdateSettings({ [key]: value });
    };

    // 验证数值输入范围
    const validateNumericSetting = (key, value, min, max, defaultValue) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < min || numValue > max) {
            onUpdateSettings({ [key]: defaultValue });
        }
    };

    // 处理添加/更新饮品
    const handleAddOrUpdateDrink = () => {
        const name = newDrinkName.trim();
        const caffeine = parseFloat(newDrinkCaffeine);
        const volume = newDrinkVolume.trim() === '' ? null : parseFloat(newDrinkVolume);
        const category = newDrinkCategory || DEFAULT_CATEGORY;

        if (!name || isNaN(caffeine) || caffeine < 0) {
            alert("请输入有效的饮品名称和非负的咖啡因含量 (mg/100ml)。");
            return;
        }

        if (volume !== null && (isNaN(volume) || volume <= 0)) {
            alert("默认容量必须是大于 0 的数字，或留空。");
            return;
        }

        // 检查重复名称（不区分大小写），排除正在编辑的饮品
        const existingDrink = drinks.find(drink =>
            drink.name.toLowerCase() === name.toLowerCase() &&
            drink.id !== editingDrink?.id
        );

        if (existingDrink) {
            alert(`名称为 "${name}" 的饮品已存在。请使用不同的名称。`);
            return;
        }

        const newDrinkData = {
            id: editingDrink?.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: name,
            caffeineContent: caffeine,
            defaultVolume: volume,
            category: category,
            isPreset: editingDrink?.isPreset ?? false, // 保持预设状态（如果在编辑预设），新饮品为自定义
        };

        if (editingDrink) {
            setDrinks(drinks.map(drink => drink.id === editingDrink.id ? newDrinkData : drink));
        } else {
            setDrinks(prevDrinks => [...prevDrinks, newDrinkData]);
        }

        resetDrinkForm();
    };

    // 删除饮品
    const deleteDrink = (id) => {
        const drinkToDelete = drinks.find(drink => drink.id === id);
        if (!drinkToDelete) return;

        // 防止删除原始预设饮品
        if (originalPresetDrinkIds.has(id)) {
            alert("无法删除原始预设饮品。您可以编辑它或添加新的自定义饮品。");
            return;
        }

        // 允许删除自定义饮品或用户添加/修改的预设（没有原始ID）
        if (window.confirm(`确定要删除饮品 "${drinkToDelete.name}" 吗？`)) {
            setDrinks(drinks.filter(drink => drink.id !== id));
        }
    };

    // 编辑饮品
    const editDrink = (drink) => {
        setEditingDrink(drink);
        setNewDrinkName(drink.name);
        setNewDrinkCaffeine(drink.caffeineContent.toString());
        setNewDrinkVolume(drink.defaultVolume?.toString() ?? '');
        setNewDrinkCategory(drink.category || DEFAULT_CATEGORY);
        setShowDrinkEditor(true);
    };

    // 重置饮品表单
    const resetDrinkForm = () => {
        setShowDrinkEditor(false);
        setEditingDrink(null);
        setNewDrinkName('');
        setNewDrinkCaffeine('');
        setNewDrinkVolume('');
        setNewDrinkCategory(DEFAULT_CATEGORY);
    };

    // 测试WebDAV连接
    const testWebDAVConnection = async () => {
        setTestingWebDAV(true);
        setWebDAVTestResult(null);

        try {
            // 动态导入WebDAV客户端
            const WebDAVClientModule = await import('../utils/webdavSync');
            const WebDAVClient = WebDAVClientModule.default;

            if (!WebDAVClient) {
                throw new Error("无法加载WebDAV客户端。");
            }

            const client = new WebDAVClient(
                userSettings.webdavServer,
                userSettings.webdavUsername,
                userSettings.webdavPassword
            );

            const result = await client.testConnection();
            setWebDAVTestResult(result);
        } catch (error) {
            console.error("测试WebDAV连接时出错:", error);
            setWebDAVTestResult({
                success: false,
                message: `连接错误: ${error.message}`
            });
        } finally {
            setTestingWebDAV(false);
        }
    };

    // 导出数据
    const exportData = () => {
        try {
            const exportData = {
                records,
                userSettings,
                drinks,
                exportTimestamp: Date.now(),
                version: '1.0.1'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            const exportFileDefaultName = `caffeine-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
        } catch (error) {
            console.error("导出数据失败:", error);
            alert("导出数据时发生错误。");
        }
    };

    // 导入数据
    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // 检查基本结构
                if (data && Array.isArray(data.records) &&
                    typeof data.userSettings === 'object' &&
                    data.userSettings !== null &&
                    Array.isArray(data.drinks)) {

                    // 简单验证饮品结构
                    if (data.drinks.length > 0) {
                        const firstDrink = data.drinks[0];
                        if (!firstDrink ||
                            typeof firstDrink.id === 'undefined' ||
                            typeof firstDrink.name === 'undefined' ||
                            typeof firstDrink.caffeineContent === 'undefined') {
                            throw new Error("饮品列表格式不正确。");
                        }
                    }

                    if (window.confirm('导入数据将覆盖当前所有记录、设置和饮品列表。确定要继续吗？')) {
                        // 验证和清理导入的设置
                        const importedSettings = { ...userSettings }; // 从当前设置开始
                        for (const key in data.userSettings) {
                            // 只导入存在于当前设置且类型匹配的键
                            if (key in userSettings &&
                                typeof data.userSettings[key] === typeof userSettings[key]) {
                                importedSettings[key] = data.userSettings[key];
                            }
                        }
                        // 确保同步相关设置也被导入（如果存在）
                        ['webdavEnabled', 'webdavServer', 'webdavUsername', 'webdavPassword', 'webdavSyncFrequency'].forEach(key => {
                            if (key in data.userSettings && typeof data.userSettings[key] === typeof userSettings[key]) {
                                importedSettings[key] = data.userSettings[key];
                            }
                        });


                        // 验证和清理导入的饮品
                        const validatedDrinks = data.drinks.map(d => ({
                            id: d.id || `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                            name: d.name || '未知饮品',
                            caffeineContent: typeof d.caffeineContent === 'number' ? d.caffeineContent : 0,
                            defaultVolume: typeof d.defaultVolume === 'number' ? d.defaultVolume : null,
                            category: DRINK_CATEGORIES.includes(d.category) ? d.category : DEFAULT_CATEGORY,
                            isPreset: d.isPreset === true, // 保留 isPreset 状态
                        }));

                        // 应用导入的数据
                        setRecords(data.records.sort((a, b) => b.timestamp - a.timestamp)); // 确保记录排序
                        onUpdateSettings(importedSettings); // 更新设置
                        setDrinks(validatedDrinks); // 更新饮品列表
                        alert('数据导入成功！');
                    }
                } else {
                    alert('导入失败：数据格式不正确或缺少必要部分 (需要 records, userSettings, drinks)。');
                }
            } catch (error) {
                alert(`导入失败：无法解析文件或文件格式错误。错误: ${error.message}`);
                console.error('导入错误:', error);
            } finally {
                event.target.value = null; // 重置文件输入，以便可以再次选择相同的文件
            }
        };

        reader.onerror = () => {
            alert('读取文件时出错。');
            console.error('File reading error:', reader.error);
            event.target.value = null;
        };

        reader.readAsText(file);
    };

    // 清除所有数据
    const clearAllData = () => {
        if (window.confirm('警告：确定要清除所有本地存储的数据吗？此操作无法撤销！')) {
            setRecords([]);
            onUpdateSettings({ ...userSettings, lastSyncTimestamp: null }); // 重置同步时间戳
            setDrinks([...initialPresetDrinks]); // 恢复默认饮品
            localStorage.removeItem('caffeineRecords');
            localStorage.removeItem('caffeineSettings');
            localStorage.removeItem('caffeineDrinks');
            alert('所有本地数据已清除！');
        }
    };

    return (
        <>
            {/* 个人设置卡片 */}
            <div
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <User size={20} className="mr-2" /> 个人参数
                </h2>
                <div className="space-y-4">
                    {/* 体重 */}
                    <div>
                        <label
                            htmlFor="userWeight"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Weight size={14} className="inline mr-1" />体重 (kg):
                        </label>
                        <input
                            id="userWeight"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.weight}
                            onChange={(e) => handleSettingChange('weight', e.target.value === '' ? '' : parseInt(e.target.value))}
                            onBlur={(e) => validateNumericSetting('weight', e.target.value, 20, 300, 60)}
                            min="20"
                            max="300"
                            placeholder="60"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于计算个性化推荐摄入量和估算浓度。
                        </p>
                    </div>

                    {/* 通用每日最大摄入量 */}
                    <div>
                        <label
                            htmlFor="maxDailyCaffeine"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Target size={14} className="inline mr-1" />通用每日最大摄入量 (mg):
                        </label>
                        <input
                            id="maxDailyCaffeine"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.maxDailyCaffeine}
                            onChange={(e) => handleSettingChange('maxDailyCaffeine', e.target.value === '' ? '' : parseInt(e.target.value))}
                            onBlur={(e) => validateNumericSetting('maxDailyCaffeine', e.target.value, 0, 2000, 400)}
                            min="0"
                            max="2000"
                            placeholder="400"
                        />
                        <div
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            通用指南上限 (如 400mg)。设为 0 将使用默认值 400。
                        </div>
                    </div>

                    {/* 个性化推荐剂量 */}
                    <div>
                        <label
                            htmlFor="recommendedDosePerKg"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Target size={14} className="inline mr-1" />个性化推荐剂量 (mg/kg):
                        </label>
                        <input
                            id="recommendedDosePerKg"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.recommendedDosePerKg}
                            onChange={(e) => handleSettingChange('recommendedDosePerKg', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('recommendedDosePerKg', e.target.value, 1, 10, 5)}
                            min="1"
                            max="10"
                            step="0.5"
                            placeholder="5"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            建议范围 3-6 mg/kg。应用将取此计算值与通用上限中的较低者作为您的有效上限。
                        </p>
                    </div>
                </div>
            </div>

            {/* 代谢与睡眠设置卡片 */}
            <div
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Sliders size={20} className="mr-2" /> 代谢与睡眠设置
                </h2>
                <div className="space-y-4">
                    {/* 咖啡因半衰期 */}
                    <div>
                        <label
                            htmlFor="caffeineHalfLife"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Clock size={14} className="inline mr-1" />咖啡因半衰期 (小时):
                        </label>
                        <input
                            id="caffeineHalfLife"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.caffeineHalfLifeHours}
                            onChange={(e) => handleSettingChange('caffeineHalfLifeHours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('caffeineHalfLifeHours', e.target.value, 1, 24, 4)}
                            min="1"
                            max="24"
                            step="0.5"
                            placeholder="4"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            影响体内咖啡因代谢速度估算，平均为 4 小时，个体差异大 (1.5-9.5h)。
                        </p>
                    </div>

                    {/* 分布容积 */}
                    <div>
                        <label
                            htmlFor="volumeOfDistribution"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Droplet size={14} className="inline mr-1" />分布容积 (L/kg):
                        </label>
                        <input
                            id="volumeOfDistribution"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.volumeOfDistribution}
                            onChange={(e) => handleSettingChange('volumeOfDistribution', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('volumeOfDistribution', e.target.value, 0.1, 1.5, 0.6)}
                            min="0.1"
                            max="1.5"
                            step="0.1"
                            placeholder="0.6"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于估算浓度，典型值约为 0.6 L/kg。
                        </p>
                    </div>

                    {/* 睡前安全浓度阈值 */}
                    <div>
                        <label
                            htmlFor="safeSleepThresholdConcentration"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Moon size={14} className="inline mr-1" />睡前安全浓度阈值 (mg/L):
                        </label>
                        <input
                            id="safeSleepThresholdConcentration"
                            type="number"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.safeSleepThresholdConcentration}
                            onChange={(e) => handleSettingChange('safeSleepThresholdConcentration', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            onBlur={(e) => validateNumericSetting('safeSleepThresholdConcentration', e.target.value, 0, 10, 1.5)}
                            min="0"
                            max="10"
                            step="0.1"
                            placeholder="1.5"
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            当体内咖啡因浓度低于此值时，对睡眠影响较小（估算）。建议 1.5 mg/L 左右，敏感者可降低。
                        </p>
                    </div>

                    {/* 计划睡眠时间 */}
                    <div>
                        <label
                            htmlFor="plannedSleepTime"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Moon size={14} className="inline mr-1" />计划睡眠时间:
                        </label>
                        <input
                            id="plannedSleepTime"
                            type="time"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.plannedSleepTime}
                            onChange={(e) => handleSettingChange('plannedSleepTime', e.target.value || '22:00')}
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            用于提供更个性化的睡眠建议。
                        </p>
                    </div>
                </div>
            </div>

            {/* WebDAV同步设置卡片 */}
            <div
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <CloudDownload size={20} className="mr-2" /> WebDAV 同步
                </h2>
                <div className="space-y-4">
                    {/* 启用WebDAV */}
                    <div className="flex items-center">
                        <input
                            id="webdavEnabled"
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" // 使用 indigo 颜色
                            checked={userSettings.webdavEnabled}
                            onChange={(e) => handleSettingChange('webdavEnabled', e.target.checked)}
                        />
                        <label
                            htmlFor="webdavEnabled"
                            className="font-medium transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            启用WebDAV同步
                        </label>
                    </div>

                    {/* 服务器地址 */}
                    <div>
                        <label
                            htmlFor="webdavServer"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Server size={14} className="inline mr-1" /> WebDAV服务器地址:
                        </label>
                        <input
                            id="webdavServer"
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavServer || ''}
                            onChange={(e) => handleSettingChange('webdavServer', e.target.value)}
                            placeholder="https://example.com/webdav/"
                            disabled={!userSettings.webdavEnabled}
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            输入完整的WebDAV服务器URL，例如：https://cloud.example.com/dav/files/
                        </p>
                    </div>

                    {/* 用户名 */}
                    <div>
                        <label
                            htmlFor="webdavUsername"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <User size={14} className="inline mr-1" /> WebDAV用户名:
                        </label>
                        <input
                            id="webdavUsername"
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavUsername || ''}
                            onChange={(e) => handleSettingChange('webdavUsername', e.target.value)}
                            placeholder="用户名"
                            disabled={!userSettings.webdavEnabled}
                        />
                    </div>

                    {/* 密码 */}
                    <div>
                        <label
                            htmlFor="webdavPassword"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Lock size={14} className="inline mr-1" /> WebDAV密码:
                        </label>
                        <input
                            id="webdavPassword"
                            type="password"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary
                            }}
                            value={userSettings.webdavPassword || ''}
                            onChange={(e) => handleSettingChange('webdavPassword', e.target.value)}
                            placeholder="密码或应用专用密码"
                            disabled={!userSettings.webdavEnabled}
                        />
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            建议使用应用专用密码而非主账户密码。密码将安全地存储在本地。
                        </p>
                    </div>

                    {/* 同步频率 (已修改) */}
                    <div>
                        <label
                            htmlFor="webdavSyncFrequency"
                            className="block mb-1 font-medium text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <Activity size={14} className="inline mr-1" /> 同步模式:
                        </label>
                        <select
                            id="webdavSyncFrequency"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            style={{
                                borderColor: colors.borderStrong,
                                backgroundColor: colors.bgBase,
                                color: colors.textPrimary,
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, // 添加下拉箭头样式
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                                paddingRight: '2.5rem', // 为箭头腾出空间
                            }}
                            value={userSettings.webdavSyncFrequency || 'manual'}
                            onChange={(e) => handleSettingChange('webdavSyncFrequency', e.target.value)}
                            disabled={!userSettings.webdavEnabled}
                        >
                            <option value="manual">手动同步</option>
                            <option value="startup">启动时同步</option>
                            {/* <option value="hourly">每小时同步</option> */} {/* 移除 */}
                            {/* <option value="daily">每日同步</option> */}   {/* 移除 */}
                        </select>
                    </div>

                    {/* 操作按钮 (样式已修改) */}
                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={testWebDAVConnection}
                            className="py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!userSettings.webdavEnabled || !userSettings.webdavServer || !userSettings.webdavUsername || !userSettings.webdavPassword || testingWebDAV}
                        >
                            <TestTubeDiagonal size={16} className="mr-1.5" /> {/* 使用新图标 */}
                            {testingWebDAV ? '测试中...' : '测试连接'}
                        </button>
                        <button
                            onClick={onManualSync}
                            className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed" // 修改了颜色和 hover 效果
                            disabled={!userSettings.webdavEnabled || !userSettings.webdavServer || !userSettings.webdavUsername || !userSettings.webdavPassword || syncStatus.inProgress}
                        >
                            <CloudDownload size={16} className="mr-1.5" />
                            {syncStatus.inProgress ? '同步中...' : '立即同步'}
                        </button>
                    </div>

                    {/* 测试结果 */}
                    {webDAVTestResult && (
                        <div className={`p-3 rounded-lg text-sm ${webDAVTestResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {webDAVTestResult.message}
                        </div>
                    )}

                    {/* 同步状态 */}
                    {syncStatus.lastSyncTime && (
                        <div className="text-sm transition-colors" style={{ color: colors.textMuted }}>
                            上次同步: {formatDatetimeLocal(syncStatus.lastSyncTime).replace('T', ' ')}
                            {syncStatus.lastSyncResult && ` (${syncStatus.lastSyncResult.success ? '成功' : '失败'}: ${syncStatus.lastSyncResult.message})`}
                        </div>
                    )}
                     {!syncStatus.lastSyncTime && userSettings.webdavEnabled && (
                        <div className="text-sm transition-colors" style={{ color: colors.textMuted }}>
                           尚未同步过。
                        </div>
                    )}
                </div>
            </div>

            {/* 饮品管理卡片 */}
            <div
                className="mb-5 rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Coffee size={20} className="mr-2" /> 饮品管理
                </h2>
                {/* 饮品编辑器/添加按钮 */}
                {showDrinkEditor ? (
                    <div
                        className="mb-4 p-4 border rounded-lg transition-colors"
                        style={{
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle
                        }}
                    >
                        <h3
                            className="font-semibold mb-3 text-base transition-colors"
                            style={{ color: colors.espresso }}
                        >
                            {editingDrink ? '编辑饮品' : '添加新饮品'}
                        </h3>

                        {/* 饮品名称 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkName"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                饮品名称:
                            </label>
                            <input
                                id="newDrinkName"
                                type="text"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkName}
                                onChange={(e) => setNewDrinkName(e.target.value)}
                                placeholder="例如：自制冷萃 (大杯)"
                            />
                        </div>

                        {/* 咖啡因含量 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkCaffeine"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                咖啡因含量 (mg/100ml):
                            </label>
                            <input
                                id="newDrinkCaffeine"
                                type="number"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkCaffeine}
                                onChange={(e) => setNewDrinkCaffeine(e.target.value)}
                                placeholder="每100ml的咖啡因毫克数"
                                min="0"
                                step="1"
                            />
                        </div>

                        {/* 默认容量 */}
                        <div className="mb-3">
                            <label
                                htmlFor="newDrinkVolume"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                默认容量 (ml, 可选):
                            </label>
                            <input
                                id="newDrinkVolume"
                                type="number"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary
                                }}
                                value={newDrinkVolume}
                                onChange={(e) => setNewDrinkVolume(e.target.value)}
                                placeholder="例如: 350 (留空则无默认)"
                                min="1"
                                step="1"
                            />
                        </div>

                        {/* 分类 */}
                        <div className="mb-4">
                            <label
                                htmlFor="newDrinkCategory"
                                className="block mb-1 text-sm font-medium transition-colors"
                                style={{ color: colors.textSecondary }}
                            >
                                分类:
                            </label>
                            <select
                                id="newDrinkCategory"
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 text-sm appearance-none transition-colors"
                                style={{
                                    borderColor: colors.borderStrong,
                                    backgroundColor: colors.bgCard,
                                    color: colors.textPrimary,
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em',
                                    paddingRight: '2.5rem',
                                }}
                                value={newDrinkCategory}
                                onChange={(e) => setNewDrinkCategory(e.target.value)}
                                // 允许更改分类，除非是*原始*预设
                                disabled={editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id)}
                            >
                                {DRINK_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            {editingDrink?.id && originalPresetDrinkIds.has(editingDrink.id) && (
                                <p
                                    className="text-xs mt-1 transition-colors"
                                    style={{ color: colors.textMuted }}
                                >
                                    原始预设饮品的分类不可更改。
                                </p>
                            )}
                        </div>

                        {/* 保存/取消按钮 */}
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <button
                                onClick={handleAddOrUpdateDrink}
                                className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 text-sm shadow flex items-center justify-center font-medium"
                            >
                                <Save size={16} className="mr-1.5" /> {editingDrink ? '保存修改' : '添加饮品'}
                            </button>
                            <button
                                onClick={resetDrinkForm}
                                className="flex-1 py-2 px-3 border rounded-md hover:bg-gray-100 transition-colors duration-200 text-sm flex items-center justify-center font-medium"
                                style={{
                                    borderColor: colors.borderStrong,
                                    color: colors.textSecondary
                                }}
                            >
                                <X size={16} className="mr-1.5" /> 取消
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowDrinkEditor(true)}
                        className="w-full py-2.5 mb-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center text-sm shadow font-medium"
                    >
                        <Plus size={16} className="mr-1.5" /> 添加自定义饮品
                    </button>
                )}

                {/* 饮品列表 */}
                <div
                    className="divide-y transition-colors"
                    style={{ borderColor: colors.borderSubtle }}
                >
                    <h3
                        className="font-medium mb-2 text-base pt-3 transition-colors"
                        style={{ color: colors.espresso }}
                    >
                        饮品列表:
                    </h3>
                    <p
                        className="text-xs mb-3 flex items-center pt-2 transition-colors"
                        style={{ color: colors.textMuted }}
                    >
                        <HelpCircle size={14} className="mr-1 flex-shrink-0" />
                        品牌饮品数据为公开信息整理或估算值，可能存在误差，仅供参考。您可以编辑这些预设值或添加自定义饮品。
                    </p>
                    <ul
                        className="pt-2 space-y-2 max-h-72 overflow-y-auto text-sm pr-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                        style={{ scrollbarColor: `${colors.borderStrong} transparent` }}
                    >
                        {/* 按分类顺序对饮品排序，然后自定义在前，预设在后，再按字母顺序 */}
                        {drinks
                            .sort((a, b) => {
                                const catA = a.category || DEFAULT_CATEGORY;
                                const catB = b.category || DEFAULT_CATEGORY;
                                const indexA = DRINK_CATEGORIES.indexOf(catA);
                                const indexB = DRINK_CATEGORIES.indexOf(catB);

                                if (indexA !== indexB) {
                                    if (indexA === -1) return 1; // 未知分类排最后
                                    if (indexB === -1) return -1;
                                    return indexA - indexB; // 按分类顺序
                                }
                                // 同一分类内，自定义在前
                                if (!a.isPreset && b.isPreset) return -1;
                                if (a.isPreset && !b.isPreset) return 1;
                                // 同为自定义或同为预设，按名称排序
                                return a.name.localeCompare(b.name);
                            })
                            .map(drink => {
                                const isOriginalPreset = originalPresetDrinkIds.has(drink.id);
                                return (
                                    <li
                                        key={drink.id}
                                        className={`flex justify-between items-center p-3 rounded-lg border transition-colors`}
                                        style={{
                                            backgroundColor: !drink.isPreset ? colors.customDrinkBg : colors.bgBase,
                                            borderColor: !drink.isPreset ? colors.customDrinkBorder : colors.borderSubtle
                                        }}
                                    >
                                        <div className="flex-1 overflow-hidden mr-2">
                                            <div
                                                className="font-medium truncate transition-colors"
                                                style={{
                                                    color: !drink.isPreset ? colors.customDrinkText : colors.espresso
                                                }}
                                                title={drink.name}
                                            >
                                                {drink.name}
                                            </div>
                                            <div
                                                className="text-xs mt-0.5 transition-colors"
                                                style={{
                                                    color: !drink.isPreset ? colors.customDrinkText : colors.textMuted
                                                }}
                                            >
                                                <span className="inline-flex items-center mr-2">
                                                    <Tag size={12} className="mr-0.5" />{drink.category || DEFAULT_CATEGORY}
                                                </span>
                                                <span>{drink.caffeineContent}mg/100ml</span>
                                                {drink.defaultVolume && <span className="ml-1">({drink.defaultVolume}ml)</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 space-x-1 ml-2">
                                            {/* 允许编辑所有饮品 */}
                                            <button
                                                onClick={() => editDrink(drink)}
                                                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-150" // 增加 hover 效果
                                                style={{ color: colors.textSecondary }}
                                                aria-label="编辑饮品"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            {/* 仅允许删除非原始预设（自定义或用户添加） */}
                                            {!isOriginalPreset ? (
                                                <button
                                                    onClick={() => deleteDrink(drink.id)}
                                                    className="p-1.5 text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150"
                                                    aria-label="删除饮品"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <span
                                                    className="p-1.5 text-gray-400 cursor-not-allowed"
                                                    title="原始预设饮品不可删除"
                                                >
                                                    <Trash2 size={14} />
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                </div>
            </div>

            {/* 数据管理卡片 */}
            <div
                className="rounded-xl p-6 shadow-lg border transition-colors"
                style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderSubtle
                }}
            >
                <h2
                    className="text-xl font-semibold mb-4 flex items-center transition-colors"
                    style={{ color: colors.espresso }}
                >
                    <Sliders size={20} className="mr-2" /> 数据管理
                </h2>
                <div className="space-y-4">
                    {/* 导出数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            导出数据:
                        </h3>
                        <button
                            onClick={exportData}
                            className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"
                        >
                            <Download size={16} className="mr-1.5" /> 导出所有数据 (.json)
                        </button>
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            将所有记录、设置和饮品列表导出为 JSON 文件备份。
                        </p>
                    </div>

                    {/* 导入数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            导入数据:
                        </h3>
                        <label className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center cursor-pointer shadow text-sm font-medium">
                            <Upload size={16} className="mr-1.5" /> 选择文件导入数据
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={importData}
                            />
                        </label>
                        <p
                            className="text-xs mt-1 transition-colors"
                            style={{ color: colors.textMuted }}
                        >
                            从之前导出的 JSON 文件恢复数据。注意：这将覆盖当前所有数据。
                        </p>
                    </div>

                    {/* 清除数据 */}
                    <div>
                        <h3
                            className="font-medium mb-1 text-sm transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            清除数据:
                        </h3>
                        <button
                            onClick={clearAllData}
                            className="w-full py-2.5 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center shadow text-sm font-medium"
                        >
                            <RotateCcw size={16} className="mr-1.5" /> 清除所有本地数据
                        </button>
                        <p className="text-xs text-red-500 mt-1">
                            警告：此操作将永久删除所有记录、设置和自定义饮品，并重置为初始预设。
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsView;