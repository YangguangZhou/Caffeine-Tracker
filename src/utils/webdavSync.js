// WebDAV 同步实用工具

import { Capacitor } from '@capacitor/core';
import { getPresetIconColor, DEFAULT_CATEGORY } from './constants';

const knownSettingKeys = [
    'weight', 'maxDailyCaffeine', 'recommendedDosePerKg',
    'safeSleepThresholdConcentration', 'volumeOfDistribution',
    'caffeineHalfLifeHours',
    'webdavSyncFrequency', 'lastSyncTimestamp', 'develop', 'plannedSleepTime',
    'localLastModifiedTimestamp'
];

/**
 * WebDAV 同步客户端
 */
export default class WebDAVClient {
    constructor(server, username, password) {
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
            serverUrl: this.server ? this.server.substring(0, 30) + '...' : '未设置',
            hasAuthHeader: !!this.authHeader,
            platform: this.platform,
            isNative: this.isNative
        });
    }

    isConfigured() {
        const configured = !!this.server && !!this.username && !!this.password && !!this.authHeader;
        return configured;
    }

    // 创建请求配置
    createFetchOptions(method, additionalHeaders = {}, body = null) {
        const currentAuthHeader = (this.username && this.password) ? 'Basic ' + btoa(`${this.username}:${this.password}`) : null;

        const headers = {
            'User-Agent': this.userAgent,
            ...additionalHeaders
        };

        // 添加认证头
        if (currentAuthHeader) {
            if (this.isNative || method !== 'OPTIONS') {
                headers['Authorization'] = currentAuthHeader;
            }
        }

        const fetchOptions = {
            method,
            headers
        };

        if (body !== null) {
            fetchOptions.body = body;
        }

        // 平台相关配置
        if (this.isNative) {
            // 原生平台无需CORS设置
        } else {
            // Web平台需要CORS设置
            fetchOptions.mode = 'cors';
            fetchOptions.credentials = 'omit';
            fetchOptions.cache = 'no-cache';
        }

        return fetchOptions;
    }

    // 执行HTTP请求
    async executeRequest(url, options, operation = 'request') {
        console.log(`开始执行 ${operation}`, {
            url: url.toString(),
            method: options.method,
            platform: this.platform,
            isNative: this.isNative
        });

        try {
            const response = await fetch(url.toString(), options);

            console.log(`${operation} 响应状态: ${response.status} ${response.statusText}`, {
                ok: response.ok,
                type: response.type
            });

            return response;
        } catch (error) {
            console.error(`${operation} 请求失败`, {
                error: error.message,
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
            let response;
            let testMethod = 'HEAD';

            try {
                // 尝试HEAD请求
                const fetchOptions = this.createFetchOptions('HEAD');
                response = await this.executeRequest(url, fetchOptions, 'HEAD连接测试');

                if (response.ok || response.status === 404) {
                    return {
                        success: true,
                        message: `连接成功 (${response.status} ${response.statusText} via HEAD)`
                    };
                } else if (response.status === 401) {
                    return {
                        success: false,
                        message: `认证失败 (401): 请检查用户名和密码`
                    };
                } else if (response.status === 403) {
                    return {
                        success: false,
                        message: `权限被拒绝 (403): 用户可能没有访问权限`
                    };
                } else if (response.status === 405) {
                    console.log("HEAD请求不被支持，尝试OPTIONS请求");
                    testMethod = 'OPTIONS';
                } else {
                    return {
                        success: false,
                        message: `连接失败: ${response.status} ${response.statusText} (HEAD请求)`
                    };
                }
            } catch (headError) {
                console.warn("HEAD请求失败，尝试OPTIONS请求:", headError.message);
                testMethod = 'OPTIONS';
            }

            if (testMethod === 'OPTIONS') {
                try {
                    const fetchOptions = this.createFetchOptions('OPTIONS');
                    response = await this.executeRequest(url, fetchOptions, 'OPTIONS连接测试');

                    if (response.ok) {
                        return {
                            success: true,
                            message: `连接成功 (${response.status} ${response.statusText} via OPTIONS)`
                        };
                    } else if (response.status === 401) {
                        return {
                            success: false,
                            message: `认证失败 (401): 请检查用户名和密码`
                        };
                    } else if (response.status === 403) {
                        return {
                            success: false,
                            message: `权限被拒绝 (403): 用户可能没有访问权限`
                        };
                    } else {
                        return {
                            success: false,
                            message: `连接失败: ${response.status} ${response.statusText} (OPTIONS请求)`
                        };
                    }
                } catch (optionsError) {
                    console.error("OPTIONS请求也失败:", optionsError.message);
                    throw optionsError;
                }
            }

        } catch (error) {
            console.error("WebDAV连接测试异常:", {
                message: error.message,
                platform: this.platform,
                name: error.name
            });

            let message = `连接错误: ${error.message}`;

            // 错误类型判断
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                if (this.isNative) {
                    message += " (请检查网络连接和服务器地址)";
                } else {
                    message += " (请检查网络连接、服务器URL和CORS配置)";
                }
            } else if (error.message.toLowerCase().includes('cors')) {
                message += " (CORS跨域问题：请在服务器端配置允许跨域访问)";
            } else if (error.message.toLowerCase().includes('network')) {
                message += " (网络连接问题：请检查网络状态)";
            } else if (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('certificate')) {
                message += " (SSL证书问题：请检查HTTPS配置)";
            } else if (error.message.toLowerCase().includes('timeout')) {
                message += " (请求超时：请检查服务器响应速度)";
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
                console.log("远程文件未找到 (404) - 这是正常的，表示首次同步");
                return null;
            }

            if (response.status === 401) {
                throw new Error("认证失败 (401): 用户名或密码错误");
            }

            if (response.status === 403) {
                throw new Error("权限被拒绝 (403): 用户没有读取权限");
            }

            if (!response.ok) {
                const error = `下载数据失败: ${response.status} ${response.statusText}`;
                console.error(error);
                throw new Error(error);
            }

            const text = await response.text();

            if (text.length === 0) {
                console.warn("下载的文件为空");
                return null;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error("JSON解析失败:", {
                    error: parseError.message,
                    textPreview: text.substring(0, 100),
                    textLength: text.length
                });
                throw new Error(`下载的数据JSON格式无效: ${parseError.message}`);
            }

            // 数据验证
            if (typeof data !== 'object' || data === null) {
                throw new Error("下载的数据格式无效 (非对象或为null)");
            }

            const coreKeys = ['records', 'drinks', 'userSettings', 'version'];
            const missingKeys = coreKeys.filter(key => !data.hasOwnProperty(key));
            if (missingKeys.length > 0) {
                console.warn(`下载的数据缺少核心键: ${missingKeys.join(', ')}`);
            }

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
                platform: this.platform,
                hasAuth: !!this.authHeader
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

        // 准备上传数据
        let dataToUpload;
        try {
            dataToUpload = JSON.parse(JSON.stringify(data));
            if (dataToUpload.userSettings && dataToUpload.userSettings.hasOwnProperty('webdavPassword')) {
                delete dataToUpload.userSettings.webdavPassword;
            }
            // 同步到远端时，不上传以下本地设备相关/敏感配置，避免覆盖其他设备配置
            if (dataToUpload.userSettings) {
                delete dataToUpload.userSettings.themeMode;
                delete dataToUpload.userSettings.webdavEnabled;
                delete dataToUpload.userSettings.webdavServer;
                delete dataToUpload.userSettings.webdavUsername;
            }
        } catch (error) {
            console.error("准备上传数据时出错:", error.message);
            throw new Error(`数据序列化失败: ${error.message}`);
        }

        try {
            const url = new URL(this.fileName, this.server);
            const jsonString = JSON.stringify(dataToUpload, null, 2);

            const fetchOptions = this.createFetchOptions('PUT', {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': jsonString.length.toString()
            }, jsonString);

            const response = await this.executeRequest(url, fetchOptions, 'PUT上传数据');

            if (response.status === 401) {
                throw new Error("认证失败 (401): 用户名或密码错误");
            }

            if (response.status === 403) {
                throw new Error("权限被拒绝 (403): 用户没有写入权限");
            }

            if (response.status === 507) {
                throw new Error("存储空间不足 (507): 服务器空间已满");
            }

            if (!response.ok) {
                const error = `上传数据失败: ${response.status} ${response.statusText}`;
                console.error(error);

                try {
                    const responseText = await response.text();
                    if (responseText) {
                        console.error("服务器错误详情:", responseText);
                    }
                } catch (textError) {
                    console.warn("无法读取错误响应:", textError.message);
                }

                throw new Error(error);
            }

            console.log("数据上传成功");
            return { success: true, message: "数据上传成功" };
        } catch (error) {
            console.error("上传数据过程中发生错误:", {
                message: error.message,
                platform: this.platform,
                hasAuth: !!this.authHeader
            });
            throw error;
        }
    }

    // 比较时间戳
    compareTimestamps(localTs, remoteTs) {
        const localTimestamp = localTs || 0;
        const remoteTimestamp = remoteTs || 0;

        if (localTimestamp === 0 && remoteTimestamp === 0) return 'no_timestamps';
        if (localTimestamp > 0 && remoteTimestamp === 0) return 'only_local';
        if (remoteTimestamp > 0 && localTimestamp === 0) return 'only_remote';

        if (localTimestamp > remoteTimestamp) return 'local_newer';
        if (remoteTimestamp > localTimestamp) return 'remote_newer';
        return 'equal';
    }

    // 合并本地和远程数据
    mergeData(localData, remoteData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        console.log("正在合并本地和远程数据...");

        const localTs = localData?.syncTimestamp || localData?.userSettings?.localLastModifiedTimestamp || 0;
        const remoteTs = remoteData?.syncTimestamp || 0;

        const comparison = this.compareTimestamps(localTs, remoteTs);
        const isRemotePrimary = comparison === 'remote_newer' || comparison === 'only_remote';

        const primarySource = isRemotePrimary ? remoteData : localData;
        const secondarySource = isRemotePrimary ? localData : remoteData;
        console.log(`合并的主要来源 (基于 syncTimestamp): ${isRemotePrimary ? '远程' : '本地'} (LocalTS: ${localTs}, RemoteTS: ${remoteTs})`);

        // 合并记录
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
                } else if (tsCurrent === tsExisting && tsCurrent !== 0) {
                    const primaryRecords = primarySource.records || [];
                    if (primaryRecords.some(r => r.id === record.id && (r.updatedAt || r.timestamp || 0) === tsCurrent)) {
                        recordMap.set(record.id, { ...record });
                    }
                }
            } else {
                recordMap.set(record.id, { ...record });
            }
        });
        const mergedRecords = Array.from(recordMap.values());
        console.log(`合并后的记录数: ${mergedRecords.length}`);

        // 合并饮品
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
                } else if (tsCurrent > 0 && tsExisting === 0) {
                    drinkMap.set(drink.id, { ...drink });
                } else if (tsExisting === 0 && tsCurrent === 0) {
                    const primaryDrinks = primarySource.drinks || [];
                    if (primaryDrinks.some(d => d.id === drink.id)) {
                        drinkMap.set(drink.id, { ...drink });
                    }
                }
            } else {
                drinkMap.set(drink.id, { ...drink });
            }
        });

        // 确保原始预设饮品存在
        initialPresetDrinks.forEach(presetDrink => {
            const existingDrink = drinkMap.get(presetDrink.id);
            if (originalPresetDrinkIds.has(presetDrink.id)) {
                if (!existingDrink) {
                    drinkMap.set(presetDrink.id, { ...presetDrink, updatedAt: presetDrink.updatedAt || 0, isPreset: true });
                } else {
                    drinkMap.set(presetDrink.id, { ...existingDrink, isPreset: true });
                }
            }
        });

        const mergedDrinks = Array.from(drinkMap.values())
            .filter(d => d && d.id && typeof d.name === 'string')
            .map(drink => {
                const isOriginalPreset = originalPresetDrinkIds.has(drink.id);
                const resolvedIsPreset = isOriginalPreset ? true : !!drink.isPreset;
                const presetDefinition = isOriginalPreset
                    ? initialPresetDrinks.find(p => p.id === drink.id)
                    : null;

                const resolvedCategory = drink.category || presetDefinition?.category || DEFAULT_CATEGORY;
                const iconColor = drink.iconColor
                    || presetDefinition?.iconColor
                    || getPresetIconColor(drink.id, resolvedCategory);

                return {
                    ...drink,
                    isPreset: resolvedIsPreset,
                    category: drink.category || (isOriginalPreset ? presetDefinition?.category : '其他'),
                    iconColor,
                };
            });

        console.log(`合并后的饮品数: ${mergedDrinks.length}`);

        // 合并用户设置
        const mergedSettings = {};
        const primarySettings = primarySource?.userSettings || {};
        const secondarySettings = secondarySource?.userSettings || {};

        knownSettingKeys.forEach(key => {
            if (key === 'webdavPassword') return;

            if (key === 'themeMode' || key === 'webdavEnabled' || key === 'webdavServer' || key === 'webdavUsername') {
                return;
            }

            if (primarySettings.hasOwnProperty(key)) {
                if (key === 'develop' && typeof primarySettings[key] !== 'boolean') {
                    if (secondarySettings.hasOwnProperty(key) && typeof secondarySettings[key] === 'boolean') {
                        mergedSettings[key] = secondarySettings[key];
                    } else {
                        mergedSettings[key] = false;
                    }
                } else {
                    mergedSettings[key] = primarySettings[key];
                }
            }
            else if (secondarySettings.hasOwnProperty(key)) {
                if (key === 'develop' && typeof secondarySettings[key] !== 'boolean') {
                    mergedSettings[key] = false;
                } else {
                    mergedSettings[key] = secondarySettings[key];
                }
            }
        });

        // 保留本地WebDAV密码
        if (localData?.userSettings?.webdavPassword) {
            mergedSettings.webdavPassword = localData.userSettings.webdavPassword;
        }

        // 处理localLastModifiedTimestamp
        if (localData?.userSettings?.localLastModifiedTimestamp && localData.userSettings.localLastModifiedTimestamp > (primarySettings.localLastModifiedTimestamp || 0)) {
            mergedSettings.localLastModifiedTimestamp = localData.userSettings.localLastModifiedTimestamp;
        }

        const mergedResult = {
            records: mergedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
            drinks: mergedDrinks,
            userSettings: mergedSettings,
            syncTimestamp: Date.now(),
            version: primarySource.version || secondarySource.version || 'unknown'
        };
        console.log(`合并完成。新时间戳: ${mergedResult.syncTimestamp}`);
        return mergedResult;
    }

    // 执行同步操作
    async performSync(localData, initialPresetDrinks = [], originalPresetDrinkIds = new Set()) {
        console.log("=== 开始WebDAV同步过程 ===");
        console.log("同步参数 (计数):", {
            platform: this.platform,
            isNative: this.isNative,
            hasLocalData: !!localData,
            localRecordsCount: localData?.records?.length || 0,
            localDrinksCount: localData?.drinks?.length || 0,
            localSyncTimestamp: localData?.syncTimestamp || localData?.userSettings?.localLastModifiedTimestamp,
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

        const currentLocalData = typeof localData === 'object' && localData !== null
            ? localData
            : { records: [], drinks: [], userSettings: {}, version: 'unknown', syncTimestamp: 0 };

        const localTs = currentLocalData.userSettings?.localLastModifiedTimestamp || currentLocalData.syncTimestamp || null;

        try {
            // 下载远程数据
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
                            message: uploadError.message
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

            // 判断数据是否有意义（非空）
            const isLocalDataMeaningful = (currentLocalData.records?.length > 0) || 
                                         (currentLocalData.drinks?.length > 0) || 
                                         (Object.keys(currentLocalData.userSettings || {}).filter(k => 
                                             k !== 'webdavPassword' && 
                                             k !== 'themeMode' && 
                                             k !== 'webdavEnabled' && 
                                             k !== 'webdavServer' && 
                                             k !== 'webdavUsername'
                                         ).length > 0);

            const isRemoteDataMeaningful = remoteData && (
                (remoteData.records?.length > 0) || 
                (remoteData.drinks?.length > 0) || 
                (Object.keys(remoteData.userSettings || {}).filter(k => 
                    k !== 'webdavPassword' && 
                    k !== 'themeMode' && 
                    k !== 'webdavEnabled' && 
                    k !== 'webdavServer' && 
                    k !== 'webdavUsername'
                ).length > 0)
            );

            console.log("数据有效性检查:", {
                isLocalDataMeaningful,
                isRemoteDataMeaningful,
                localRecords: currentLocalData.records?.length || 0,
                remoteRecords: remoteData?.records?.length || 0,
                localDrinks: currentLocalData.drinks?.length || 0,
                remoteDrinks: remoteData?.drinks?.length || 0
            });

            // 比较并决定操作
            const remoteTs = remoteData?.syncTimestamp || null;
            let comparison = this.compareTimestamps(localTs, remoteTs);

            // 修复：新设备数据丢失问题
            // 如果本地没有记录，但远程有记录，说明可能是新设备或数据被清除
            // 此时应优先信任远程数据，避免本地空数据覆盖远程数据
            const localHasRecords = currentLocalData.records && currentLocalData.records.length > 0;
            const remoteHasRecords = remoteData && remoteData.records && remoteData.records.length > 0;
            
            if (!localHasRecords && remoteHasRecords) {
                 console.log("检测到潜在的新设备状态 (本地无记录，远程有记录): 强制视为远程数据较新，以防止数据丢失");
                 comparison = 'remote_newer';
            }

            console.log(`时间戳比较结果: ${comparison} (本地: ${localTs}, 远程: ${remoteTs})`);

            let finalData = null;
            let message = "";
            let action = "none";

            // 根据比较结果和数据有效性执行操作
            switch (comparison) {
                case 'local_newer':
                case 'only_local':
                    // 如果本地数据为空但远程有数据，不要上传空数据
                    if (!isLocalDataMeaningful && isRemoteDataMeaningful) {
                        action = "download";
                        console.log("执行操作: 使用远程数据 (本地为空，远程有内容)");
                        finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                        message = "同步成功：已从服务器下载数据";
                    } else if (isLocalDataMeaningful) {
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
                    } else {
                        // 本地和远程都为空
                        action = "no_action";
                        console.log("执行操作: 本地和远程都为空，无需操作");
                        finalData = currentLocalData;
                        message = "同步完成：无数据需要同步";
                    }
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
                    break;

                case 'remote_newer':
                case 'only_remote':
                    action = "merge";
                    console.log("执行操作: 合并本地和远程数据（远程较新或仅远程存在）");
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    // 只有在合并后的数据有意义时才上传
                    const isMergedDataMeaningful = (finalData.records?.length > 0) || (finalData.drinks?.length > 0);
                    if (isMergedDataMeaningful) {
                        await this.uploadData(finalData);
                        message = "同步成功：已合并本地和远程数据";
                    } else {
                        message = "同步成功：已下载远程数据";
                    }
                    break;

                case 'equal':
                    action = "merge";
                    console.log("执行操作: 时间戳相等，执行合并以确保数据一致性");
                    finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                    // 检查是否需要上传
                    const needsUpload = isLocalDataMeaningful || isRemoteDataMeaningful;
                    if (needsUpload) {
                        await this.uploadData(finalData);
                        message = "同步成功：数据已合并/验证";
                    } else {
                        message = "同步完成：无数据需要同步";
                    }
                    break;

                case 'no_timestamps':
                    // 无时间戳时，优先保留有数据的一方
                    if (isRemoteDataMeaningful && !isLocalDataMeaningful) {
                        action = "download";
                        console.log("执行操作: 使用远程数据 (无时间戳，远程有数据，本地为空)");
                        finalData = { ...remoteData };
                        if (localData?.userSettings?.webdavPassword) {
                            finalData.userSettings = {
                                ...finalData.userSettings,
                                webdavPassword: localData.userSettings.webdavPassword
                            };
                        }
                        message = "同步成功：已从服务器下载数据";
                    } else if (isLocalDataMeaningful && !isRemoteDataMeaningful) {
                        action = "upload";
                        console.log("执行操作: 上传本地数据 (无时间戳，本地有数据，远程为空)");
                        finalData = {
                            ...currentLocalData,
                            syncTimestamp: Date.now(),
                            userSettings: { ...(currentLocalData.userSettings || {}) }
                        };
                        await this.uploadData(finalData);
                        message = "同步成功：本地数据已上传";
                    } else if (isLocalDataMeaningful && isRemoteDataMeaningful) {
                        action = "merge";
                        console.log("执行操作: 合并数据 (无时间戳，本地和远程都有数据)");
                        finalData = this.mergeData(currentLocalData, remoteData, initialPresetDrinks, originalPresetDrinkIds);
                        await this.uploadData(finalData);
                        message = "同步成功：无时间戳数据已合并";
                    } else {
                        action = "no_action";
                        console.log("执行操作: 本地和远程都为空，无需操作");
                        finalData = currentLocalData;
                        message = "同步完成：无数据需要同步";
                    }
                    if (localData?.userSettings?.webdavPassword && finalData.userSettings && !finalData.userSettings.webdavPassword) {
                        finalData.userSettings.webdavPassword = localData.userSettings.webdavPassword;
                    }
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
                platform: this.platform
            });

            // 返回本地数据防止数据丢失
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
