// webdavSync.js
// WebDAV 同步实用工具

// 导入 Capacitor 以检查平台
import { Capacitor } from '@capacitor/core';

// 导入常量以辅助合并 (如果需要，但尽量保持此文件独立)
// import { initialPresetDrinks, originalPresetDrinkIds } from './constants'; // Avoid if possible, pass if needed

const knownSettingKeys = [
    'weight', 'maxDailyCaffeine', 'recommendedDosePerKg',
    'safeSleepThresholdConcentration', 'volumeOfDistribution',
    'caffeineHalfLifeHours', 'themeMode', 'webdavEnabled',
    'webdavServer', 'webdavUsername', // 'webdavPassword' - handled separately for saving
    'webdavSyncFrequency', 'lastSyncTimestamp', 'develop', 'plannedSleepTime',
    'localLastModifiedTimestamp' // Ensure this is also considered if present
];

/**
 * WebDAV 同步客户端
 * 提供与 WebDAV 服务器连接和同步数据的功能。
 */
export default class WebDAVClient {
    constructor(server, username, password) {
        console.log('WebDAVClient 构造函数调用', {
            server: server ? `${server.substring(0, 20)}...` : 'undefined',
            username: username || 'undefined',
            hasPassword: !!password,
            platform: Capacitor.getPlatform()
        });

        if (!server || !username) {
           console.warn("WebDAVClient 使用不完整的凭据进行初始化。");
        }
        
        this.server = server ? (server.endsWith('/') ? server : `${server}/`) : '';
        this.username = username;
        this.password = password;
        this.fileName = 'caffeine-tracker-data.json';
        this.authHeader = (username && password) ? 'Basic ' + btoa(`${username}:${password}`) : null;
        this.userAgent = 'CaffeineTracker/1.0 (WebDAVClient)';
        this.platform = Capacitor.getPlatform();
        this.isNative = Capacitor.isNativePlatform();
        
        console.log('WebDAVClient 初始化完成', {
            serverUrl: this.server,
            hasAuthHeader: !!this.authHeader,
            platform: this.platform,
            isNative: this.isNative
        });
    }

    isConfigured() {
        const configured = !!this.server && !!this.username && !!this.password && !!this.authHeader;
        console.log('WebDAVClient 配置检查', {
            hasServer: !!this.server,
            hasUsername: !!this.username,
            hasPassword: !!this.password,
            hasAuthHeader: !!this.authHeader,
            configured
        });
        return configured;
    }

    /**
     * 创建标准化的fetch请求配置
     */
    createFetchOptions(method, additionalHeaders = {}, body = null) {
        const headers = {
            'Authorization': this.authHeader,
            'User-Agent': this.userAgent,
            ...additionalHeaders
        };

        const fetchOptions = {
            method,
            headers
        };

        if (body !== null) {
            fetchOptions.body = body;
        }

        // 只在Web平台添加CORS模式
        if (!this.isNative) {
            fetchOptions.mode = 'cors';
            fetchOptions.credentials = 'omit'; // 避免发送cookies
        }

        console.log('创建fetch配置', {
            method,
            platform: this.platform,
            isNative: this.isNative,
            hasBody: body !== null,
            headers: Object.keys(headers).reduce((acc, key) => {
                acc[key] = key === 'Authorization' ? '[HIDDEN]' : headers[key];
                return acc;
            }, {})
        });

        return fetchOptions;
    }

    /**
     * 执行HTTP请求并处理错误
     */
    async executeRequest(url, options, operation = 'request') {
        console.log(`开始执行 ${operation}`, {
            url: url.toString(),
            method: options.method,
            platform: this.platform
        });

        try {
            const response = await fetch(url.toString(), options);
            
            console.log(`${operation} 响应`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Array.from(response.headers.entries()).reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {})
            });

            return response;
        } catch (error) {
            console.error(`${operation} 请求失败`, {
                error: error.message,
                stack: error.stack,
                name: error.name,
                platform: this.platform,
                url: url.toString(),
                method: options.method
            });
            throw error;
        }
    }

    async testConnection() {
        console.log("开始WebDAV连接测试...");
        
        if (!this.isConfigured()) {
            const error = "缺少WebDAV配置信息 (服务器, 用户名, 或密码)";
            console.error("配置检查失败:", error);
            return { success: false, message: error };
        }

        if (!this.server.startsWith('http')) {
            const error = "服务器URL必须以http://或https://开头";
            console.error("URL格式错误:", error);
            return { success: false, message: error };
        }

        try {
            const url = new URL(this.fileName, this.server);
            console.log(`测试连接URL: ${url.toString()}`);

            const fetchOptions = this.createFetchOptions('OPTIONS');
            const response = await this.executeRequest(url, fetchOptions, 'OPTIONS连接测试');

            if (response.ok) {
                console.log("连接测试成功");
                return { success: true, message: "连接成功 (服务器可达且OPTIONS请求成功)" };
            } else {
                const errorMsg = `连接失败: ${response.status} ${response.statusText} (OPTIONS请求)`;
                console.error("连接测试失败:", errorMsg);
                return { success: false, message: errorMsg };
            }
        } catch (error) {
            console.error("WebDAV连接测试异常:", {
                message: error.message,
                stack: error.stack,
                platform: this.platform
            });
            
            let message = `连接错误: ${error.message}`;
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                message += " (请检查网络连接、服务器URL和CORS配置)";
            }
            if (error.message.toLowerCase().includes('method not allowed') || 
                error.message.toLowerCase().includes('expected one of')) {
                message += " (服务器可能不支持OPTIONS请求或客户端限制了该方法)";
            }
            return { success: false, message: message };
        }
    }

    async checkFileExists() {
        console.log("检查远程文件是否存在...");
        
        if (!this.isConfigured()) {
            console.warn("未配置WebDAV，无法检查文件");
            return false;
        }

        try {
            const url = new URL(this.fileName, this.server);
            const fetchOptions = this.createFetchOptions('HEAD');
            const response = await this.executeRequest(url, fetchOptions, 'HEAD文件检查');
            
            const exists = response.ok;
            console.log(`文件存在检查结果: ${exists}`);
            return exists;
        } catch (error) {
            console.error("检查文件存在性时出错:", {
                message: error.message,
                platform: this.platform
            });
            return false;
        }
    }

    async downloadData() {
        console.log("开始下载远程数据...");
        
        if (!this.isConfigured()) {
            const error = "WebDAV未配置，无法下载数据";
            console.error(error);
            throw new Error(error);
        }

        try {
            const url = new URL(this.fileName, this.server);
            const fetchOptions = this.createFetchOptions('GET');
            const response = await this.executeRequest(url, fetchOptions, 'GET下载数据');

            if (response.status === 404) {
                console.log("远程文件未找到 (404)");
                return null;
            }

            if (!response.ok) {
                const error = `下载数据失败: ${response.status} ${response.statusText}`;
                console.error(error);
                throw new Error(error);
            }

            const contentType = response.headers.get('content-type');
            console.log(`下载响应内容类型: ${contentType}`);

            const text = await response.text();
            console.log(`下载的原始文本长度: ${text.length}`);

            let data;
            try {
                data = JSON.parse(text);
                console.log("JSON解析成功");
            } catch (parseError) {
                console.error("JSON解析失败:", {
                    error: parseError.message,
                    textPreview: text.substring(0, 200)
                });
                throw new Error(`下载的数据JSON格式无效: ${parseError.message}`);
            }

            // 数据结构验证
            if (typeof data !== 'object' || data === null) {
                throw new Error("下载的数据格式无效 (非对象或为null)");
            }

            // 验证核心数据结构
            const coreKeys = ['records', 'drinks', 'userSettings', 'version'];
            const missingKeys = coreKeys.filter(key => !data.hasOwnProperty(key));
            if (missingKeys.length > 0) {
                console.warn(`下载的数据缺少核心键: ${missingKeys.join(', ')}`);
            }

            // 详细的数据验证
            if (data.records && !Array.isArray(data.records)) {
                throw new Error("下载的数据中 'records' 必须是数组");
            }
            if (data.drinks && !Array.isArray(data.drinks)) {
                throw new Error("下载的数据中 'drinks' 必须是数组");
            }
            if (data.userSettings && typeof data.userSettings !== 'object') {
                throw new Error("下载的数据中 'userSettings' 必须是对象");
            }

            console.log("数据下载和验证成功:", {
                recordsCount: data.records ? data.records.length : 0,
                drinksCount: data.drinks ? data.drinks.length : 0,
                hasUserSettings: !!data.userSettings,
                version: data.version,
                syncTimestamp: data.syncTimestamp
            });

            return data;
        } catch (error) {
            console.error("下载数据过程中发生错误:", {
                message: error.message,
                stack: error.stack,
                platform: this.platform
            });
            throw error;
        }
    }

    async uploadData(data) {
        console.log("开始上传数据...");
        
        if (!this.isConfigured()) {
            const error = "WebDAV未配置，无法上传数据";
            console.error(error);
            throw new Error(error);
        }
        
        if (typeof data !== 'object' || data === null) {
            const error = "无效的上传数据 (非对象)";
            console.error(error);
            throw new Error(error);
        }

        // 创建上传数据的深拷贝，避免修改原始对象
        let dataToUpload;
        try {
            dataToUpload = JSON.parse(JSON.stringify(data));
            if (dataToUpload.userSettings && dataToUpload.userSettings.hasOwnProperty('webdavPassword')) {
                delete dataToUpload.userSettings.webdavPassword;
            }
            console.log("上传数据准备完成:", {
                recordsCount: dataToUpload.records ? dataToUpload.records.length : 0,
                drinksCount: dataToUpload.drinks ? dataToUpload.drinks.length : 0,
                hasUserSettings: !!dataToUpload.userSettings,
                syncTimestamp: dataToUpload.syncTimestamp
            });
        } catch (error) {
            console.error("准备上传数据时出错:", error.message);
            throw new Error(`数据序列化失败: ${error.message}`);
        }

        try {
            const url = new URL(this.fileName, this.server);
            const jsonString = JSON.stringify(dataToUpload);
            console.log(`上传JSON字符串长度: ${jsonString.length}`);

            const fetchOptions = this.createFetchOptions('PUT', {
                'Content-Type': 'application/json'
            }, jsonString);

            const response = await this.executeRequest(url, fetchOptions, 'PUT上传数据');

            if (!response.ok) {
                const error = `上传数据失败: ${response.status} ${response.statusText}`;
                console.error(error);
                throw new Error(error);
            }

            console.log("数据上传成功");
            return { success: true, message: "数据上传成功" };
        } catch (error) {
            console.error("上传数据过程中发生错误:", {
                message: error.message,
                stack: error.stack,
                platform: this.platform
            });
            throw error;
        }
    }

    /**
     * 比较本地和远程数据的时间戳以确定哪个更新。
     * @param {number|null|undefined} localTs 本地时间戳。
     * @param {number|null|undefined} remoteTs 远程时间戳。
     * @returns {'local_newer' | 'remote_newer' | 'equal' | 'only_local' | 'only_remote' | 'no_timestamps'} 比较结果。
     */
    compareTimestamps(localTs, remoteTs) {
        const localTimestamp = localTs || 0; // Treat null/undefined as 0 for comparison
        const remoteTimestamp = remoteTs || 0;

        if (localTimestamp === 0 && remoteTimestamp === 0) return 'no_timestamps';
        if (localTimestamp > 0 && remoteTimestamp === 0) return 'only_local';
        if (remoteTimestamp > 0 && localTimestamp === 0) return 'only_remote';
        
        if (localTimestamp > remoteTimestamp) return 'local_newer';
        if (remoteTimestamp > localTimestamp) return 'remote_newer';
        return 'equal';
    }

    /**
     * 合并本地和远程数据。
     * 策略：
     * 1. 合并记录和饮品：保留来自两个来源的所有唯一项（按 ID）。
     * 2. 合并设置：对于已知键，优先使用具有较新整体时间戳的来源中的值。
     * 3. 更新时间戳：为合并后的数据设置新的 syncTimestamp。
     * @param {Object} localData 本地数据对象。
     * @param {Object} remoteData 远程数据对象。
     * @param {Array} initialPresetDrinks 预设饮品列表 (用于确保预设饮品存在或更新).
     * @param {Set} originalPresetDrinkIds 原始预设饮品ID集合 (用于识别哪些是不可删除的核心预设).
     * @returns {Object} 合并后的数据对象。
     */
    mergeData(localData, remoteData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        console.log("正在合并本地和远程数据...");
        // Fallback for syncTimestamp if it's missing from localData (e.g. very old app version or first sync)
        // localData.syncTimestamp is actually localData.userSettings.localLastModifiedTimestamp in practice from CaffeineTracker.jsx
        const localTs = localData?.syncTimestamp || localData?.userSettings?.localLastModifiedTimestamp || 0;
        const remoteTs = remoteData?.syncTimestamp || 0;

        const comparison = this.compareTimestamps(localTs, remoteTs);
        const isRemotePrimary = comparison === 'remote_newer' || comparison === 'only_remote';

        const primarySource = isRemotePrimary ? remoteData : localData;
        const secondarySource = isRemotePrimary ? localData : remoteData;
        console.log(`合并的主要来源 (基于 syncTimestamp): ${isRemotePrimary ? '远程' : '本地'} (LocalTS: ${localTs}, RemoteTS: ${remoteTs})`);

        // --- 合并记录 ---
        const recordMap = new Map();
        const allRecords = [...(localData.records || []), ...(remoteData.records || [])];
        allRecords.forEach(record => {
            if (!record || !record.id) {
                console.warn("发现无效记录，已跳过:", record);
                return;
            }
            const existing = recordMap.get(record.id);
            if (existing) {
                const tsExisting = existing.updatedAt || existing.timestamp || 0;
                const tsCurrent = record.updatedAt || record.timestamp || 0;
                if (tsCurrent > tsExisting) {
                    recordMap.set(record.id, { ...record });
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) { // Timestamps are identical and not zero
                    // Prefer primary source if timestamps are identical
                    const primaryRecords = primarySource.records || [];
                    if (primaryRecords.some(r => r.id === record.id && (r.updatedAt || r.timestamp || 0) === tsCurrent)) {
                        recordMap.set(record.id, { ...record });
                    }
                }
                // If one has updatedAt and the other doesn't, prefer the one with updatedAt if it's newer or equal.
                // This is implicitly handled by using (updatedAt || timestamp).
            } else {
                recordMap.set(record.id, { ...record });
            }
        });
        const mergedRecords = Array.from(recordMap.values());
        console.log(`合并后的记录数: ${mergedRecords.length}`);

        // --- 合并饮品 ---
        const drinkMap = new Map();
        const allDrinks = [...(localData.drinks || []), ...(remoteData.drinks || [])];

        allDrinks.forEach(drink => {
            if (!drink || !drink.id || typeof drink.name !== 'string') {
                console.warn("发现无效饮品，已跳过:", drink);
                return;
            }
            const existing = drinkMap.get(drink.id);
            if (existing) {
                const tsExisting = existing.updatedAt || 0;
                const tsCurrent = drink.updatedAt || 0;

                if (tsCurrent > tsExisting) {
                    drinkMap.set(drink.id, { ...drink });
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) {
                    const primaryDrinks = primarySource.drinks || [];
                    if (primaryDrinks.some(d => d.id === drink.id && (d.updatedAt || 0) === tsCurrent)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                } else if (tsCurrent > 0 && tsExisting === 0) { // Current has timestamp, existing doesn't
                    drinkMap.set(drink.id, { ...drink });
                }
                // If existing has timestamp and current doesn't (tsExisting > 0 && tsCurrent === 0), keep existing.
                // If both are 0, prefer primary source (if current is from primary)
                else if (tsExisting === 0 && tsCurrent === 0) {
                    const primaryDrinks = primarySource.drinks || [];
                     if (primaryDrinks.some(d => d.id === drink.id)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                }

            } else {
                drinkMap.set(drink.id, { ...drink });
            }
        });
        
        // Ensure all original preset drinks are present and correctly marked
        initialPresetDrinks.forEach(presetDrink => {
            const existingDrink = drinkMap.get(presetDrink.id);
            if (originalPresetDrinkIds.has(presetDrink.id)) { // Only operate on original presets
                if (!existingDrink) {
                    // If an original preset is missing entirely, add it back.
                    // This handles cases where a user might have (somehow) deleted an original preset,
                    // or a new version of the app introduces a preset that wasn't synced before.
                    drinkMap.set(presetDrink.id, { ...presetDrink, updatedAt: presetDrink.updatedAt || 0, isPreset: true });
                } else {
                    // If it exists, ensure its 'isPreset' flag is true and potentially update with latest preset definition
                    // if the existing one has an older or no 'updatedAt' compared to the 'initialPresetDrinks' definition.
                    // This is complex because users can modify presets.
                    // For now, the merge logic above (based on updatedAt) should handle user modifications.
                    // Here, we just ensure 'isPreset' is true for original presets.
                    drinkMap.set(presetDrink.id, { ...existingDrink, isPreset: true });
                }
            }
        });

        const mergedDrinks = Array.from(drinkMap.values())
            .filter(d => d && d.id && typeof d.name === 'string') // Final validation
            .map(drink => ({ // Ensure essential fields for presets if they were somehow lost
                ...drink,
                isPreset: originalPresetDrinkIds.has(drink.id) ? true : (drink.isPreset || false),
                category: drink.category || (originalPresetDrinkIds.has(drink.id) ? initialPresetDrinks.find(p=>p.id===drink.id)?.category : '其他'),
            }));

        console.log(`合并后的饮品数: ${mergedDrinks.length}`);


        // --- 合并用户设置 ---
        const mergedSettings = {};
        const primarySettings = primarySource?.userSettings || {};
        const secondarySettings = secondarySource?.userSettings || {};

        // 遍历已知键以确保结构并优先考虑主要来源
        knownSettingKeys.forEach(key => {
            // 显式跳过密码合并
            if (key === 'webdavPassword') return; // Already handled below

            // If primary source has the key and it's valid type (or it's 'develop')
            if (primarySettings.hasOwnProperty(key)) {
                if (key === 'develop' && typeof primarySettings[key] !== 'boolean') {
                    // Try secondary if primary 'develop' is invalid
                    if (secondarySettings.hasOwnProperty(key) && typeof secondarySettings[key] === 'boolean') {
                        mergedSettings[key] = secondarySettings[key];
                    } else {
                        // Fallback to a default if both are invalid (e.g., false for develop)
                        // This part depends on having defaultSettings available or hardcoding
                        mergedSettings[key] = false; // Default for develop
                    }
                } else {
                    mergedSettings[key] = primarySettings[key];
                }
            }
            // Else if secondary source has the key and it's valid
            else if (secondarySettings.hasOwnProperty(key)) {
                 if (key === 'develop' && typeof secondarySettings[key] !== 'boolean') {
                     // Fallback to default if secondary 'develop' is invalid
                     mergedSettings[key] = false; // Default for develop
                 } else {
                    mergedSettings[key] = secondarySettings[key];
                 }
            }
            // If key is missing in both, it won't be added unless defaultSettings are iterated here
        });
        // Ensure local webdavPassword is preserved if it exists.
        // It's stripped before upload and not expected from download.
        // It should come from the original localData passed into performSync, not the primary/secondary source.
        if (localData?.userSettings?.webdavPassword) {
             mergedSettings.webdavPassword = localData.userSettings.webdavPassword;
        }
        // Also, ensure localLastModifiedTimestamp from the local userSettings is preserved if it's the absolute newest,
        // or take the one from the primary source if that's newer.
        // However, syncTimestamp for the merged data will be Date.now().
        // localLastModifiedTimestamp is more about tracking local changes for the *next* sync.
        // The userSettings from primarySource should be preferred for most settings.
        // Let's ensure localLastModifiedTimestamp is handled correctly:
        // If localData was primary, its localLastModifiedTimestamp is already in primarySettings.
        // If remoteData was primary, we might want to keep localData's localLastModifiedTimestamp if it's newer
        // than remoteData's (which wouldn't have a 'localLastModifiedTimestamp' in the same sense).
        // For simplicity, the merged userSettings will get values from primary/secondary.
        // The CaffeineTracker component will manage its own userSettings.localLastModifiedTimestamp.
        // The syncTimestamp of the merged data is the key for future comparisons.
        if (localData?.userSettings?.localLastModifiedTimestamp && localData.userSettings.localLastModifiedTimestamp > (primarySettings.localLastModifiedTimestamp || 0)) {
            mergedSettings.localLastModifiedTimestamp = localData.userSettings.localLastModifiedTimestamp;
        }


        console.log("设置已合并。" , mergedSettings);


        // 创建最终的合并数据结构
        const mergedResult = {
            records: mergedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
            drinks: mergedDrinks,
            userSettings: mergedSettings,
            syncTimestamp: Date.now(), // 为合并后的数据设置新的时间戳
            version: primarySource.version || secondarySource.version || 'unknown' // Preserve version from source
        };
        console.log(`合并完成。新时间戳: ${mergedResult.syncTimestamp}`);
        return mergedResult;
    }

    /**
     * 执行同步操作。
     * 获取远程数据，比较时间戳，并决定是上传、下载还是合并。
     * @param {Object} localData 当前的本地数据 (records, drinks, userSettings, syncTimestamp)。
     * @returns {Promise<{success: boolean, message: string, data: Object|null, timestamp: number|null}>}
     * 同步结果。'data' 包含同步后应在本地使用的数据。
     * 'timestamp' 是 'data' 的时间戳。失败时返回 null 数据。
     */
    async performSync(localData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        console.log("=== 开始WebDAV同步过程 ===");
        console.log("同步参数:", {
            platform: this.platform,
            isNative: this.isNative,
            hasLocalData: !!localData,
            localRecordsCount: localData?.records?.length || 0,
            localDrinksCount: localData?.drinks?.length || 0,
            localSyncTimestamp: localData?.syncTimestamp,
            initialPresetDrinksCount: initialPresetDrinks.length,
            originalPresetDrinkIdsCount: originalPresetDrinkIds.size
        });

        if (!this.isConfigured()) {
            const error = "WebDAV未配置";
            console.error("同步中止:", error);
            return {
                success: false,
                message: error,
                data: null,
                timestamp: null
            };
        }

        // 确保 localData 是一个对象
        const currentLocalData = typeof localData === 'object' && localData !== null 
            ? localData 
            : { records: [], drinks: [], userSettings: {}, version: 'unknown', syncTimestamp: 0 };
        
        const localTs = currentLocalData.userSettings?.localLastModifiedTimestamp || currentLocalData.syncTimestamp || null;
        console.log("本地时间戳:", localTs);

        try {
            // 1. 下载远程数据
            console.log("步骤1: 下载远程数据");
            let remoteData = null;
            try {
                remoteData = await this.downloadData();
                console.log("远程数据下载结果:", {
                    hasData: !!remoteData,
                    remoteRecordsCount: remoteData?.records?.length || 0,
                    remoteDrinksCount: remoteData?.drinks?.length || 0,
                    remoteSyncTimestamp: remoteData?.syncTimestamp
                });
            } catch (downloadError) {
                console.error("下载远程数据失败，详细错误:", {
                    message: downloadError.message,
                    stack: downloadError.stack,
                    platform: this.platform
                });

                // 检查是否可以进行初始上传
                if (!localTs && (currentLocalData.records?.length > 0 || currentLocalData.drinks?.length > 0 || 
                    Object.keys(currentLocalData.userSettings || {}).filter(k => k !== 'webdavPassword').length > 0)) {
                    console.warn("下载失败，但本地数据似乎是新的，尝试初始上传");
                    try {
                        const uploadTimestamp = localTs || Date.now();
                        const initialUploadData = { 
                            ...currentLocalData, 
                            syncTimestamp: uploadTimestamp,
                            userSettings: { ...(currentLocalData.userSettings || {}) }
                        };

                        await this.uploadData(initialUploadData);
                        
                        const returnData = { ...initialUploadData };
                        if (localData?.userSettings?.webdavPassword) {
                            returnData.userSettings = { 
                                ...returnData.userSettings, 
                                webdavPassword: localData.userSettings.webdavPassword 
                            };
                        }

                        console.log("初始上传成功");
                        return {
                            success: true,
                            message: "首次同步或本地较新：已上传本地数据",
                            data: returnData,
                            timestamp: uploadTimestamp
                        };
                    } catch (uploadError) {
                        console.error("初始上传也失败:", {
                            message: uploadError.message,
                            stack: uploadError.stack
                        });
                        return { 
                            success: false, 
                            message: `同步失败：无法下载远程数据且上传初始数据失败 (${uploadError.message})`, 
                            data: null, 
                            timestamp: null 
                        };
                    }
                } else {
                    return { 
                        success: false, 
                        message: `同步失败：无法下载远程数据 (${downloadError.message})`, 
                        data: null, 
                        timestamp: null 
                    };
                }
            }

            // 2. 比较并决定操作
            console.log("步骤2: 比较时间戳并决定操作");
            const remoteTs = remoteData?.syncTimestamp || null;
            const comparison = this.compareTimestamps(localTs, remoteTs);
            console.log(`时间戳比较结果: ${comparison} (本地: ${localTs}, 远程: ${remoteTs})`);

            let finalData = null;
            let message = "";
            let action = "none";

            // 根据比较结果执行操作
            switch (comparison) {
                case 'local_newer': 
                case 'only_local': 
                    action = "upload";
                    console.log("执行操作: 上传本地数据 (本地较新或仅本地存在)");
                    const uploadTs = localTs || Date.now();
                    finalData = { 
                        ...currentLocalData, 
                        syncTimestamp: uploadTs,
                        userSettings: { ...(currentLocalData.userSettings || {}) }
                    };
                    await this.uploadData(finalData);
                    message = "同步成功：本地数据已上传";
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
                    break;

                case 'remote_newer': 
                case 'only_remote':
                    action = "merge"; 
                    console.log("执行操作: 合并本地和远程数据（远程较新或仅远程存在）");
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    await this.uploadData(finalData);
                    message = "同步成功：已合并本地和远程数据";
                    break;
                
                case 'equal':
                    action = "merge";
                    console.log("执行操作: 时间戳相等，执行合并以确保数据一致性");
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    await this.uploadData(finalData);
                    message = "同步成功：数据已合并/验证";
                    break;

                case 'no_timestamps':
                    action = "merge";
                    console.log("执行操作: 本地和远程均无时间戳，执行合并");
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    await this.uploadData(finalData);
                    message = "同步成功：无时间戳数据已合并";
                    break;

                default:
                    action = "no_action";
                    console.log("执行操作: 未定义的时间戳比较结果，未执行操作");
                    finalData = currentLocalData;
                    message = "同步警告：无法确定操作，未更改数据";
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings && !finalData.userSettings.webdavPassword) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
            }

            console.log("同步操作完成:", {
                action,
                finalDataTimestamp: finalData?.syncTimestamp,
                finalRecordsCount: finalData?.records?.length || 0,
                finalDrinksCount: finalData?.drinks?.length || 0
            });

            return { 
                success: true, 
                message: message, 
                data: finalData, 
                timestamp: finalData?.syncTimestamp || localTs 
            };

        } catch (error) {
            console.error("同步过程中发生严重错误:", {
                message: error.message,
                stack: error.stack,
                platform: this.platform
            });
            
            // 尝试返回当前本地数据以防止UI中的数据丢失
            const returnLocalDataOnError = { ...currentLocalData };
            if (localData?.userSettings?.webdavPassword && returnLocalDataOnError.userSettings) {
                returnLocalDataOnError.userSettings.webdavPassword = localData.userSettings.webdavPassword;
            }
            
            return { 
                success: false, 
                message: `同步失败: ${error.message}`, 
                data: returnLocalDataOnError,
                timestamp: localTs 
            };
        } finally {
            console.log("=== WebDAV同步过程结束 ===");
        }
    }
}