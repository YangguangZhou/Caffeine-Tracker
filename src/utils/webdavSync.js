// webdavSync.js
// WebDAV同步实用工具

/**
 * WebDAV同步客户端
 * 提供与WebDAV服务器连接和同步数据的功能
 */
export default class WebDAVClient {
    constructor(server, username, password) {
        this.server = server;
        this.username = username;
        this.password = password;
        this.fileName = 'caffeine-tracker-data.json'; // 数据文件名
        // 构造 Authorization 头部
        this.authHeader = 'Basic ' + btoa(`${username}:${password}`);
    }

    /**
     * 测试WebDAV连接
     * @returns {Promise<Object>} 连接测试结果 { success: boolean, message: string }
     */
    async testConnection() {
        try {
            // 检查配置是否完整
            if (!this.server || !this.username || !this.password) {
                return { success: false, message: "缺少WebDAV配置信息" };
            }
            // 检查服务器URL格式
            if (!this.server.startsWith('http')) {
                return { success: false, message: "服务器URL必须以http://或https://开头" };
            }

            // 构造请求URL，确保服务器地址以 / 结尾
            const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);

            // 发送 PROPFIND 请求测试连接和权限
            const response = await fetch(url.toString(), {
                method: 'PROPFIND',
                headers: {
                    'Authorization': this.authHeader,
                    'Depth': '0', // 只检查当前资源
                    'Content-Type': 'application/xml' // WebDAV 通常需要
                }
            });

            // 2xx 状态码表示成功，404 表示文件不存在但服务器可达且认证通过
            if (response.ok || response.status === 404) {
                return { success: true, message: "连接成功" };
            } else {
                // 返回具体的错误状态
                return { success: false, message: `连接失败: ${response.status} ${response.statusText}` };
            }
        } catch (error) {
            // 捕获网络或其他错误
            console.error("WebDAV连接测试错误:", error);
            return { success: false, message: `连接错误: ${error.message}` };
        }
    }

    /**
     * 检查远程文件是否存在
     * @returns {Promise<boolean>} 文件是否存在
     */
    async checkFileExists() {
        try {
            const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);

            // 使用 HEAD 请求，只获取头部信息，效率更高
            const response = await fetch(url.toString(), {
                method: 'HEAD',
                headers: {
                    'Authorization': this.authHeader
                }
            });

            return response.ok; // 2xx 状态码表示文件存在
        } catch (error) {
            console.error("检查文件存在时出错:", error);
            return false; // 出错时认为文件不存在或不可访问
        }
    }

    /**
     * 下载远程数据
     * @returns {Promise<Object|null>} 下载的数据或null（如果文件不存在或发生错误）
     */
    async downloadData() {
        try {
            const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });

            // 如果文件不存在 (404)，则返回 null
            if (response.status === 404) {
                console.log("远程文件不存在，无法下载。");
                return null;
            }

            // 其他非成功状态码则抛出错误
            if (!response.ok) {
                throw new Error(`下载失败: ${response.status} ${response.statusText}`);
            }

            // 解析 JSON 数据
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("下载数据错误:", error);
            throw error; // 将错误向上层传递
        }
    }

    /**
     * 上传数据到WebDAV服务器
     * @param {Object} data 要上传的数据
     * @returns {Promise<Object>} 上传结果 { success: boolean, message: string }
     */
    async uploadData(data) {
        try {
            const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);

            // 使用 PUT 方法上传或覆盖文件
            const response = await fetch(url.toString(), {
                method: 'PUT',
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json' // 指定内容类型
                },
                body: JSON.stringify(data) // 将数据转换为 JSON 字符串
            });

            // 检查响应状态码
            if (!response.ok) {
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }

            return { success: true, message: "数据上传成功" };
        } catch (error) {
            console.error("上传数据错误:", error);
            throw error; // 将错误向上层传递
        }
    }

    /**
     * 比较本地和远程数据的时间戳，确定哪个更新
     * @param {Object} localData 本地数据 (应包含 syncTimestamp)
     * @param {Object} remoteData 远程数据 (可能为 null 或不包含 syncTimestamp)
     * @returns {string} 'local_newer', 'remote_newer', 'equal', 'only_local', 'only_remote', 'merge_needed'
     */
    compareTimestamps(localData, remoteData) {
        const localTs = localData?.syncTimestamp;
        const remoteTs = remoteData?.syncTimestamp;

        if (localTs && !remoteTs) return 'only_local'; // 只有本地有时间戳（通常是首次同步或远程文件损坏）
        if (!localTs && remoteTs) return 'only_remote'; // 只有远程有时间戳（本地数据可能未同步过）
        if (!localTs && !remoteTs) return 'merge_needed'; // 都没时间戳，需要合并（或根据其他策略）

        if (localTs > remoteTs) return 'local_newer';
        if (remoteTs > localTs) return 'remote_newer';
        if (localTs === remoteTs) return 'equal'; // 时间戳相等，理论上数据一致

        return 'merge_needed'; // 默认情况，或者需要更复杂的比较逻辑
    }

    /**
     * 合并本地和远程数据 (已更新)
     * 策略：
     * 1. 合并记录和饮品：保留所有唯一的记录和饮品项（基于 ID）。
     * 2. 合并设置：逐个比较设置字段，优先使用整体时间戳较新的数据源中的值。
     * 3. 更新时间戳：为合并后的数据设置新的 syncTimestamp。
     * @param {Object} localData 本地数据
     * @param {Object} remoteData 远程数据
     * @returns {Object} 合并后的数据
     */
    mergeData(localData, remoteData) {
        console.log("开始合并数据...");
        // 确定哪个数据源更新（基于整体时间戳）
        const isLocalNewerOverall = (localData?.syncTimestamp || 0) >= (remoteData?.syncTimestamp || 0);
        const newerSource = isLocalNewerOverall ? localData : remoteData;
        const olderSource = isLocalNewerOverall ? remoteData : localData;

        // --- 合并记录 ---
        const recordIds = new Set();
        const mergedRecords = [];
        // 先添加较新来源的记录
        if (newerSource?.records && Array.isArray(newerSource.records)) {
            newerSource.records.forEach(record => {
                if (record?.id && !recordIds.has(record.id)) {
                    recordIds.add(record.id);
                    mergedRecords.push(record);
                }
            });
        }
        // 再添加较旧来源中不重复的记录
        if (olderSource?.records && Array.isArray(olderSource.records)) {
            olderSource.records.forEach(record => {
                if (record?.id && !recordIds.has(record.id)) {
                    recordIds.add(record.id);
                    mergedRecords.push(record);
                }
            });
        }
        console.log(`合并后记录数: ${mergedRecords.length}`);

        // --- 合并饮品 ---
        const drinkIds = new Set();
        const mergedDrinks = [];
        // 先添加较新来源的饮品
        if (newerSource?.drinks && Array.isArray(newerSource.drinks)) {
            newerSource.drinks.forEach(drink => {
                if (drink?.id && !drinkIds.has(drink.id)) {
                    drinkIds.add(drink.id);
                    mergedDrinks.push(drink);
                }
            });
        }
        // 再添加较旧来源中不重复的饮品
        if (olderSource?.drinks && Array.isArray(olderSource.drinks)) {
            olderSource.drinks.forEach(drink => {
                if (drink?.id && !drinkIds.has(drink.id)) {
                    drinkIds.add(drink.id);
                    mergedDrinks.push(drink);
                }
            });
        }
         console.log(`合并后饮品数: ${mergedDrinks.length}`);

        // --- 合并用户设置 (逐字段) ---
        const mergedSettings = { ...olderSource?.userSettings, ...newerSource?.userSettings }; // 基础合并，新覆盖旧
        // 可以添加更精细的逻辑，例如只合并存在的键
        console.log("合并设置完成。");


        // 创建合并后的数据对象
        const mergedResult = {
            records: mergedRecords.sort((a, b) => b.timestamp - a.timestamp), // 合并后重新排序记录
            drinks: mergedDrinks, // 饮品通常不需要特定排序，但可以按需添加
            userSettings: mergedSettings,
            syncTimestamp: Date.now() // 设置新的同步时间戳
        };
        console.log("数据合并完成。");
        return mergedResult;
    }

    /**
     * 执行同步操作 (已更新)
     * @param {Object} localData 本地数据 (包含所有记录、设置、饮品)
     * @returns {Promise<Object>} 同步结果 { success: boolean, message: string, data: Object, timestamp: number|null }
     */
    async performSync(localData) {
        try {
            // 检查 WebDAV 配置
            if (!this.server || !this.username || !this.password) {
                return {
                    success: false,
                    message: "未配置WebDAV",
                    data: localData, // 返回原始本地数据
                    timestamp: localData?.syncTimestamp || null // 使用本地时间戳（如果有）
                };
            }
            console.log("开始执行同步...");

            // 准备本地数据，确保有时间戳 (如果没有，则添加当前时间戳)
            const preparedLocalData = {
                ...localData,
                syncTimestamp: localData?.syncTimestamp || Date.now() // 如果本地没有时间戳，则认为是新数据
            };

            // 尝试下载远程数据
            let remoteData = null;
            try {
                remoteData = await this.downloadData();
                if (remoteData) {
                    console.log("成功下载远程数据。远程时间戳:", remoteData.syncTimestamp);
                } else {
                    console.log("远程数据不存在。");
                }
            } catch (error) {
                // 下载失败不一定是致命错误，可能是网络问题或文件确实不存在
                console.warn("下载远程数据时出错:", error.message, "将尝试继续同步...");
                // 这里可以选择是中止同步还是继续（例如，如果本地更新，则强制上传）
                // 当前逻辑：如果下载出错，但本地有数据，则倾向于上传本地数据
            }

            let finalData = preparedLocalData; // 默认使用本地数据
            let message = "";
            let action = "none"; // 'upload', 'download', 'merge', 'no_change'

            if (!remoteData) {
                // 远程数据不存在或下载失败，上传本地数据
                console.log("远程数据无效，将上传本地数据。");
                await this.uploadData(preparedLocalData);
                finalData = preparedLocalData; // 时间戳已在 preparedLocalData 中
                message = "首次同步或远程数据丢失，已上传本地数据。";
                action = "upload";
            } else {
                // 远程数据存在，比较时间戳
                const comparison = this.compareTimestamps(preparedLocalData, remoteData);
                console.log("时间戳比较结果:", comparison);

                switch (comparison) {
                    case 'local_newer':
                    case 'only_local': // 本地有时间戳，远程没有 -> 上传本地
                        console.log("本地数据较新或仅本地存在，上传本地数据。");
                        await this.uploadData(preparedLocalData);
                        finalData = preparedLocalData;
                        message = "同步成功：本地数据已上传至服务器。";
                        action = "upload";
                        break;
                    case 'remote_newer':
                    case 'only_remote': // 远程有时间戳，本地没有 -> 下载远程
                        console.log("远程数据较新或仅远程存在，下载远程数据。");
                        finalData = remoteData; // 直接使用远程数据
                        message = "同步成功：已从服务器下载最新数据。";
                        action = "download";
                        break;
                    case 'equal':
                        console.log("本地和远程数据时间戳相同，无需操作。");
                        finalData = preparedLocalData; // 或 remoteData，理论上一致
                        message = "数据已是最新，无需同步。";
                        action = "no_change";
                        break;
                    case 'merge_needed': // 时间戳都缺失或需要合并
                    default:
                        console.log("需要合并本地和远程数据。");
                        finalData = this.mergeData(preparedLocalData, remoteData);
                        await this.uploadData(finalData); // 上传合并后的结果
                        message = "同步成功：已合并本地和远程数据。";
                        action = "merge";
                        break;
                }
            }

            console.log(`同步操作完成: ${action}, 最终时间戳: ${finalData.syncTimestamp}`);
            return {
                success: true,
                message,
                data: finalData, // 返回最终使用的数据（可能是本地、远程或合并后的）
                timestamp: finalData.syncTimestamp // 返回最终数据的时间戳
            };

        } catch (error) {
            // 捕获同步过程中的其他错误（如上传失败）
            console.error("同步过程中发生严重错误:", error);
            return {
                success: false,
                message: `同步失败: ${error.message}`,
                data: localData, // 返回原始本地数据
                timestamp: localData?.syncTimestamp || null // 返回本地时间戳
            };
        }
    }
}