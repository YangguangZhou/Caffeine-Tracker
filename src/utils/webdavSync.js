// webdavSync.js
// WebDAV 同步实用工具

// 导入常量以辅助合并 (如果需要，但尽量保持此文件独立)
// import { initialPresetDrinks, originalPresetDrinkIds } from './constants'; // Avoid if possible, pass if needed

const knownSettingKeys = [
    'weight', 'maxDailyCaffeine', 'recommendedDosePerKg',
    'safeSleepThresholdConcentration', 'volumeOfDistribution',
    'caffeineHalfLifeHours', 'themeMode', 'webdavEnabled',
    'webdavServer', 'webdavUsername', /* 'webdavPassword' - 避免合并密码 */
    'webdavSyncFrequency', 'lastSyncTimestamp', 'develop', 'plannedSleepTime' // Added plannedSleepTime
];

/**
 * WebDAV 同步客户端
 * 提供与 WebDAV 服务器连接和同步数据的功能。
 */
export default class WebDAVClient {
    /**
     * 构造函数
     * @param {string} server WebDAV 服务器 URL
     * @param {string} username 用户名
     * @param {string} password 密码
     */
    constructor(server, username, password) {
        // 如果服务器或用户名为空，则发出警告
        if (!server || !username) {
           console.warn("WebDAVClient 使用不完整的凭据进行初始化。");
        }
        // 确保服务器 URL 以 '/' 结尾，如果未提供则为空字符串
        this.server = server ? (server.endsWith('/') ? server : `${server}/`) : '';
        this.username = username;
        this.password = password; // 在内部存储密码以供请求使用
        this.fileName = 'caffeine-tracker-data.json'; // 数据文件名
        // 仅当用户名和密码都存在时才构造 Authorization 头部
        this.authHeader = (username && password) ? 'Basic ' + btoa(`${username}:${password}`) : null;
    }

    /**
     * 检查客户端是否已配置为执行 WebDAV 操作。
     * @returns {boolean} 如果服务器、用户名和密码都已设置，则返回 true。
     */
    isConfigured() {
        return !!this.server && !!this.username && !!this.password && !!this.authHeader;
    }

    /**
     * 测试 WebDAV 连接。
     * @returns {Promise<{success: boolean, message: string}>} 连接测试结果。
     */
    async testConnection() {
        console.log("正在测试 WebDAV 连接...");
        // 检查配置是否完整
        if (!this.isConfigured()) {
            return { success: false, message: "缺少WebDAV配置信息 (服务器, 用户名, 或密码)" };
        }
        // 检查服务器 URL 格式
        if (!this.server.startsWith('http')) {
             return { success: false, message: "服务器URL必须以http://或https://开头" };
        }

        try {
            // 构造请求 URL
            const url = new URL(this.fileName, this.server);
            console.log(`正在发送 PROPFIND 请求至: ${url.toString()}`);

            // 发送 PROPFIND 请求测试连接
            const response = await fetch(url.toString(), {
                method: 'PROPFIND',
                headers: {
                    'Authorization': this.authHeader,
                    'Depth': '0', // 只检查资源本身
                    'Content-Type': 'application/xml' // WebDAV 服务器通常需要
                }
            });

            console.log(`PROPFIND 响应状态: ${response.status}`);
            // 2xx 状态码表示成功，404 表示文件未找到但服务器可达且认证可能通过。
            if (response.ok || response.status === 404) {
                console.log("连接测试成功。");
                return { success: true, message: "连接成功" };
            } else {
                 console.error(`连接测试失败: ${response.status} ${response.statusText}`);
                // 根据状态码提供更具体的反馈（如果可能）
                let message = `连接失败: ${response.status} ${response.statusText}`;
                if (response.status === 401) message = "连接失败：身份验证错误 (用户名或密码错误)";
                if (response.status === 403) message = "连接失败：权限不足";
                return { success: false, message: message };
            }
        } catch (error) {
            console.error("WebDAV 连接测试错误:", error);
            // 根据需要处理特定错误类型（例如网络错误）
            let message = `连接错误: ${error.message}`;
            if (error instanceof TypeError) { // 通常表示网络问题或 CORS 问题
              message = "连接错误：无法访问服务器，请检查网络连接、URL或CORS设置。";
            }
            return { success: false, message: message };
        }
    }

    /**
     * 检查远程文件是否存在。
     * @returns {Promise<boolean>} 如果文件存在则返回 true。
     */
    async checkFileExists() {
        // 如果未配置，则无法检查
        if (!this.isConfigured()) return false;

        try {
            const url = new URL(this.fileName, this.server);
            // 使用 HEAD 请求以提高效率
            const response = await fetch(url.toString(), {
                method: 'HEAD',
                headers: {
                    'Authorization': this.authHeader
                }
            });
            console.log(`文件检查的 HEAD 请求状态: ${response.status}`);
            // 2xx 状态码表示文件存在
            return response.ok;
        } catch (error) {
            console.error("检查文件是否存在时出错:", error);
            // 出错时假定文件不存在或无法访问
            return false;
        }
    }

    /**
     * 下载远程数据。
     * @returns {Promise<Object|null>} 下载的数据对象，如果文件未找到则返回 null。其他失败则抛出错误。
     */
    async downloadData() {
        console.log("尝试下载远程数据...");
        // 如果未配置，则无法下载
        if (!this.isConfigured()) {
             console.warn("无法下载数据：WebDAV 未配置。");
             throw new Error("WebDAV未配置，无法下载数据");
        }

        try {
            const url = new URL(this.fileName, this.server);
             console.log(`正在发送 GET 请求至: ${url.toString()}`);
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });

            console.log(`GET 响应状态: ${response.status}`);
            // 如果文件未找到 (404)，则优雅地返回 null。
            if (response.status === 404) {
                console.log("远程文件未找到。");
                return null;
            }

            // 对于其他非成功状态码，抛出错误。
            if (!response.ok) {
                throw new Error(`下载失败: ${response.status} ${response.statusText}`);
            }

            // 解析 JSON 数据。
            const data = await response.json();
            console.log("远程数据下载成功。");
            // 对下载的数据结构进行基本验证（可选但推荐）
            if (typeof data !== 'object' || data === null) {
                 throw new Error("下载的数据格式无效 (非对象)");
            }
            // 验证核心数据结构
            const coreKeys = ['records', 'drinks', 'userSettings', 'version'];
            for (const key of coreKeys) {
                if (!data.hasOwnProperty(key)) {
                    console.warn(`下载的数据缺少关键字段: ${key}。可能导致同步问题。`);
                }
            }

            if (data.records && !Array.isArray(data.records)) {
                 throw new Error("下载的数据格式无效 ('records' 不是数组)");
            }
             if (data.drinks && !Array.isArray(data.drinks)) {
                 throw new Error("下载的数据格式无效 ('drinks' 不是数组)");
            }
             if (data.userSettings && typeof data.userSettings !== 'object') {
                 throw new Error("下载的数据格式无效 ('userSettings' 不是对象)");
            }
             // --- 新增: 验证 develop 字段类型 ---
             if (data.userSettings && data.userSettings.hasOwnProperty('develop') && typeof data.userSettings.develop !== 'boolean') {
                console.warn("下载的数据格式警告: 'develop' 字段不是布尔值，将尝试使用默认值或忽略。");
                // 在合并阶段处理，而不是在这里删除
             }
             // 验证版本字段
             if (data.hasOwnProperty('version') && typeof data.version !== 'string') {
                console.warn("下载的数据格式警告: 'version' 字段不是字符串。");
             }


            return data;
        } catch (error) {
            console.error("下载数据时出错:", error);
            // 将错误重新抛出，由调用函数 (performSync) 处理。
            // 这可以防止在可能不正确的假设下继续执行。
            throw error;
        }
    }

    /**
     * 上传数据到 WebDAV 服务器。
     * @param {Object} data 要上传的数据对象。
     * @returns {Promise<{success: boolean, message: string}>} 上传结果。失败时抛出错误。
     */
    async uploadData(data) {
         console.log("尝试上传数据...");
         // 如果未配置，则无法上传
         if (!this.isConfigured()) {
             console.warn("无法上传数据：WebDAV 未配置。");
             throw new Error("WebDAV未配置，无法上传数据");
         }
         // 检查上传数据是否为有效对象
         if (typeof data !== 'object' || data === null) {
              throw new Error("无效的上传数据 (非对象)");
         }

        try {
            const url = new URL(this.fileName, this.server);
            console.log(`正在发送 PUT 请求至: ${url.toString()}`);

            // 使用 PUT 上传/覆盖文件。
            const response = await fetch(url.toString(), {
                method: 'PUT',
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json' // 指定内容类型
                },
                body: JSON.stringify(data) // 将数据转换为 JSON 字符串
            });

            console.log(`PUT 响应状态: ${response.status}`);
            // 检查响应状态码 (200 OK, 201 Created, 204 No Content 通常表示成功)。
            if (!response.ok) {
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }

            console.log("数据上传成功。");
            return { success: true, message: "数据上传成功" };
        } catch (error) {
            console.error("上传数据时出错:", error);
            // 将错误重新抛出，由调用函数处理。
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
     * @returns {Object} 合并后的数据对象。
     */
    mergeData(localData, remoteData) { // Removed initialPresetDrinks, originalPresetDrinkIds as params
        console.log("正在合并本地和远程数据...");
        const localTs = localData?.syncTimestamp;
        const remoteTs = remoteData?.syncTimestamp;

        const comparison = this.compareTimestamps(localTs, remoteTs);
        // Determine primary source based on newer timestamp. If equal or one is missing, local might be preferred or specific logic applied.
        // For simplicity, if remote is newer, it's primary. Otherwise, local is primary (covers local_newer, only_local, equal, no_timestamps where local might have data).
        const isRemotePrimary = comparison === 'remote_newer' || comparison === 'only_remote';

        const primarySource = isRemotePrimary ? remoteData : localData;
        const secondarySource = isRemotePrimary ? localData : remoteData;
        console.log(`合并的主要来源 (基于时间戳): ${isRemotePrimary ? '远程' : '本地'}`);

        // --- 合并记录 ---
        const recordMap = new Map();
        // 首先添加主要来源的记录
        (primarySource?.records || []).forEach(record => {
            if (record?.id) recordMap.set(record.id, record);
        });
        // 添加次要来源中的唯一记录
        (secondarySource?.records || []).forEach(record => {
            if (record?.id && !recordMap.has(record.id)) {
                recordMap.set(record.id, record);
            }
        });
        const mergedRecords = Array.from(recordMap.values());
        console.log(`合并后的记录数: ${mergedRecords.length}`);

        // --- 合并饮品 ---
        // Strategy: The list of drinks from the primary data source (determined by the newer syncTimestamp)
        // is considered authoritative. This ensures that additions, deletions, and modifications
        // are consistently handled based on which dataset is considered more up-to-date.
        const mergedDrinks = (primarySource?.drinks || [])
            .filter(drink => {
                // Basic validation, consistent with original logic for adding to map
                const isValid = drink?.id && typeof drink.name === 'string' && typeof drink.caffeineContent === 'number';
                if (!isValid) {
                    console.warn("合并饮品时发现无效或不完整的饮品对象，已跳过:", drink);
                }
                return isValid;
            })
            .map(drink => ({ ...drink })); // Clone valid drinks to avoid mutation issues

        console.log(`合并后的饮品数 (来自 '${isRemotePrimary ? '远程' : '本地'}' 主要来源): ${mergedDrinks.length}`);


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
        // Ensure local webdavPassword is preserved if it exists, as it's not synced from remote.
        // It's stripped before upload and not expected from download.
        if (localData?.userSettings?.webdavPassword) {
             mergedSettings.webdavPassword = localData.userSettings.webdavPassword;
        } else if (primarySettings.webdavPassword && primarySource === localData) { // If local was primary and had it
            mergedSettings.webdavPassword = primarySettings.webdavPassword;
        }


        console.log("设置已合并。");


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
    async performSync(localData /*, initialPresetDrinks, originalPresetDrinkIds */) { // Removed preset params
        console.log("开始同步过程...");
        // 如果未配置，则中止同步
        if (!this.isConfigured()) {
            console.warn("同步中止：WebDAV 未配置。");
            return {
                success: false,
                message: "WebDAV未配置",
                data: null, // 明确指示失败
                timestamp: null
            };
        }

        // 确保 localData 是一个对象，即使最初为空
        const currentLocalData = typeof localData === 'object' && localData !== null ? localData : { records: [], drinks: [], userSettings: {}, version: 'unknown' };
        // 安全地获取本地时间戳
        const localTs = currentLocalData.syncTimestamp || null;

        try {
            // 1. 下载远程数据
            let remoteData = null;
            try {
                // downloadData 可能返回 null 或抛出错误
                remoteData = await this.downloadData();
            } catch (downloadError) {
                // 如果下载失败，我们无法可靠地比较或合并。
                // 仅当本地数据确定是新的（没有时间戳）时才继续上传。
                 console.error("下载远程数据失败:", downloadError);
                 // 检查本地是否有记录且没有时间戳
                 if (!localTs && (currentLocalData.records?.length > 0 || currentLocalData.drinks?.length > 0 || Object.keys(currentLocalData.userSettings || {}).filter(k => k !== 'webdavPassword').length > 0 )) {
                     // 假设这是第一次同步，尝试上传。
                     console.warn("下载失败，但本地数据似乎是新的（无时间戳）。尝试进行初始上传。");
                      try {
                          // 为初始上传数据添加时间戳
                          const initialUploadData = { ...currentLocalData, syncTimestamp: Date.now() };
                          // Ensure userSettings in initialUploadData doesn't include password if it somehow got there
                          if (initialUploadData.userSettings) {
                            delete initialUploadData.userSettings.webdavPassword;
                          }
                          await this.uploadData(initialUploadData);
                          // 返回成功和上传的数据 (re-add password for local state if it was there)
                          const returnData = { ...initialUploadData };
                          if (currentLocalData.userSettings?.webdavPassword) {
                            returnData.userSettings = { ...returnData.userSettings, webdavPassword: currentLocalData.userSettings.webdavPassword };
                          }
                          return {
                              success: true,
                              message: "首次同步：已上传本地数据。",
                              data: returnData,
                              timestamp: initialUploadData.syncTimestamp
                          };
                      } catch (uploadError) {
                           // 如果初始上传也失败
                           console.error("下载错误后初始上传失败:", uploadError);
                           return { success: false, message: `同步失败：无法下载远程数据且上传初始数据失败 (${uploadError.message})`, data: null, timestamp: null };
                      }
                 } else {
                    // 如果本地数据不是明显新的，则在没有远程数据的情况下无法安全地继续。
                    return { success: false, message: `同步失败：无法下载远程数据 (${downloadError.message})`, data: null, timestamp: null };
                 }
            }

            // 2. 比较并决定操作
            let finalData = null;
            let message = "";
            let action = "none"; // 可能的操作：'upload', 'download', 'merge', 'no_change'
            // 安全地获取远程时间戳
            const remoteTs = remoteData?.syncTimestamp || null;

            // 比较时间戳
            const comparison = this.compareTimestamps(localTs, remoteTs);
            console.log(`时间戳比较结果: ${comparison}`);

            // 根据比较结果执行操作
            switch (comparison) {
                case 'local_newer': // 本地较新
                case 'only_local': // 只有本地存在 (上传本地)
                    action = "upload";
                    console.log("操作：上传本地数据。");
                    // 确保本地数据在上传前有时间戳
                    finalData = { ...currentLocalData, syncTimestamp: localTs || Date.now() };
                    // Strip password before upload
                    const uploadableFinalData = { ...finalData };
                    if (uploadableFinalData.userSettings) {
                        delete uploadableFinalData.userSettings.webdavPassword;
                    }
                    await this.uploadData(uploadableFinalData);
                    message = "同步成功：本地数据已上传。";
                    // finalData for local use should retain password if it was there
                    break;

                case 'remote_newer': // 远程较新
                case 'only_remote':     // 只有远程存在
                    action = "merge"; 
                    console.log("操作：合并本地和远程数据（远程较新或仅远程存在）。");
                    finalData = this.mergeData(currentLocalData, remoteData);
                    // Strip password before upload
                    const uploadableMergedData = { ...finalData };
                     if (uploadableMergedData.userSettings) {
                        delete uploadableMergedData.userSettings.webdavPassword;
                    }
                    await this.uploadData(uploadableMergedData);
                    message = "同步成功：已合并本地和远程数据。";
                    // finalData for local use should retain password if it was there (mergeData handles this)
                    break;

                case 'equal': // 时间戳匹配
                    action = "no_change";
                    console.log("操作：无需更改。");
                    // 保留本地数据（理论上应与远程相同）
                    finalData = currentLocalData;
                    message = "数据已是最新。";
                    break;

                case 'no_timestamps': // 两者都没有时间戳，需要合并
                default: // 包括后备情况和可能的 'merge_needed'（如果添加）
                    action = "merge";
                    console.log("操作：合并本地和远程数据。");
                    // 确保 mergeData 的两个输入都是有效的对象
                    // Ensure remoteData is an object for mergeData if it was null (e.g. file not found but local data exists with no timestamp)
                    finalData = this.mergeData(currentLocalData, remoteData || { records: [], drinks: [], userSettings: {}, version: 'unknown' });
                    // Strip password before upload
                    const uploadableDefaultMergedData = { ...finalData };
                    if (uploadableDefaultMergedData.userSettings) {
                        delete uploadableDefaultMergedData.userSettings.webdavPassword;
                    }
                    await this.uploadData(uploadableDefaultMergedData);
                    message = "同步成功：已合并本地和远程数据。";
                    // finalData for local use should retain password
                    break;
            }
            // Ensure the finalData returned for local use has the webdavPassword if it was in currentLocalData
            if (currentLocalData.userSettings?.webdavPassword && finalData?.userSettings && !finalData.userSettings.webdavPassword) {
                finalData.userSettings.webdavPassword = currentLocalData.userSettings.webdavPassword;
            }


            console.log(`同步完成。操作: ${action}。最终时间戳: ${finalData?.syncTimestamp}`);
            // 返回成功以及现在应在本地视为当前的数据
            return {
                success: true,
                message,
                data: finalData,
                timestamp: finalData?.syncTimestamp || null
            };

        } catch (error) {
            // 捕获同步过程中的其他错误（例如合并后上传失败）
            console.error("同步过程中发生严重错误:", error);
            return {
                success: false,
                message: `同步过程中发生错误: ${error.message}`,
                data: null, // 指示失败
                timestamp: null
            };
        }
    }
}