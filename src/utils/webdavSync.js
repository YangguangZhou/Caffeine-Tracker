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
      this.fileName = 'caffeine-tracker-data.json';
      this.authHeader = 'Basic ' + btoa(`${username}:${password}`);
    }
  
    /**
     * 测试WebDAV连接
     * @returns {Promise<Object>} 连接测试结果
     */
    async testConnection() {
      try {
        if (!this.server || !this.username || !this.password) {
          return { success: false, message: "缺少WebDAV配置信息" };
        }
  
        if (!this.server.startsWith('http')) {
          return { success: false, message: "服务器URL必须以http://或https://开头" };
        }
  
        const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);
        
        const response = await fetch(url.toString(), {
          method: 'PROPFIND',
          headers: {
            'Authorization': this.authHeader,
            'Depth': '0',
            'Content-Type': 'application/xml'
          }
        });
  
        if (response.ok || response.status === 404) { // 404表示文件不存在但服务器可连接
          return { success: true, message: "连接成功" };
        } else {
          return { success: false, message: `连接失败: ${response.status} ${response.statusText}` };
        }
      } catch (error) {
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
        
        const response = await fetch(url.toString(), {
          method: 'HEAD',
          headers: {
            'Authorization': this.authHeader
          }
        });
  
        return response.ok;
      } catch (error) {
        console.error("检查文件存在时出错:", error);
        return false;
      }
    }
  
    /**
     * 下载远程数据
     * @returns {Promise<Object>} 下载的数据或null（如果发生错误）
     */
    async downloadData() {
      try {
        const fileExists = await this.checkFileExists();
        if (!fileExists) {
          return null;
        }
  
        const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader
          }
        });
  
        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("下载数据错误:", error);
        throw error;
      }
    }
  
    /**
     * 上传数据到WebDAV服务器
     * @param {Object} data 要上传的数据
     * @returns {Promise<Object>} 上传结果
     */
    async uploadData(data) {
      try {
        const url = new URL(this.fileName, this.server.endsWith('/') ? this.server : `${this.server}/`);
        
        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
  
        if (!response.ok) {
          throw new Error(`上传失败: ${response.status} ${response.statusText}`);
        }
  
        return { success: true, message: "数据上传成功" };
      } catch (error) {
        console.error("上传数据错误:", error);
        throw error;
      }
    }
  
    /**
     * 比较本地和远程数据的时间戳，确定哪个更新
     * @param {Object} localData 本地数据
     * @param {Object} remoteData 远程数据
     * @returns {string} 'local', 'remote', 或 'merge'
     */
    compareTimestamps(localData, remoteData) {
      // 如果远程数据不存在，使用本地数据
      if (!remoteData || !remoteData.syncTimestamp) {
        return 'local';
      }
  
      // 如果本地数据不存在时间戳，使用远程数据
      if (!localData || !localData.syncTimestamp) {
        return 'remote';
      }
  
      // 比较时间戳，选择更新的数据
      return localData.syncTimestamp >= remoteData.syncTimestamp ? 'local' : 'remote';
    }
  
    /**
     * 合并本地和远程数据
     * 策略：保留所有不重复的记录，使用较新数据的设置
     * @param {Object} localData 本地数据
     * @param {Object} remoteData 远程数据
     * @returns {Object} 合并后的数据
     */
    mergeData(localData, remoteData) {
      if (!remoteData) return localData;
      if (!localData) return remoteData;
  
      // 创建记录ID集合，用于检测重复
      const recordIds = new Set();
      const mergedRecords = [];
  
      // 处理本地记录
      if (localData.records && Array.isArray(localData.records)) {
        localData.records.forEach(record => {
          if (record && record.id) {
            recordIds.add(record.id);
            mergedRecords.push(record);
          }
        });
      }
  
      // 添加不重复的远程记录
      if (remoteData.records && Array.isArray(remoteData.records)) {
        remoteData.records.forEach(record => {
          if (record && record.id && !recordIds.has(record.id)) {
            mergedRecords.push(record);
          }
        });
      }
  
      // 创建饮品ID集合，用于检测重复
      const drinkIds = new Set();
      const mergedDrinks = [];
  
      // 处理本地饮品
      if (localData.drinks && Array.isArray(localData.drinks)) {
        localData.drinks.forEach(drink => {
          if (drink && drink.id) {
            drinkIds.add(drink.id);
            mergedDrinks.push(drink);
          }
        });
      }
  
      // 添加不重复的远程饮品
      if (remoteData.drinks && Array.isArray(remoteData.drinks)) {
        remoteData.drinks.forEach(drink => {
          if (drink && drink.id && !drinkIds.has(drink.id)) {
            mergedDrinks.push(drink);
          }
        });
      }
  
      // 使用较新数据的设置
      const userSettings = localData.syncTimestamp >= remoteData.syncTimestamp 
        ? localData.userSettings 
        : remoteData.userSettings;
  
      // 创建合并后的数据对象
      return {
        records: mergedRecords,
        drinks: mergedDrinks,
        userSettings,
        syncTimestamp: Date.now()
      };
    }
  
    /**
     * 执行同步操作
     * @param {Object} localData 本地数据
     * @returns {Promise<Object>} 同步结果
     */
    async performSync(localData) {
      try {
        if (!this.server || !this.username || !this.password) {
          return { 
            success: false, 
            message: "未配置WebDAV", 
            data: localData, 
            timestamp: null 
          };
        }
  
        // 准备本地数据，添加时间戳
        const preparedLocalData = {
          ...localData,
          syncTimestamp: Date.now()
        };
  
        // 尝试下载远程数据
        let remoteData = null;
        try {
          remoteData = await this.downloadData();
        } catch (error) {
          console.log("远程数据不存在或下载失败，将使用本地数据");
        }
  
        // 如果远程数据不存在，直接上传本地数据
        if (!remoteData) {
          await this.uploadData(preparedLocalData);
          return {
            success: true,
            message: "首次同步成功（上传数据）",
            data: preparedLocalData,
            timestamp: preparedLocalData.syncTimestamp
          };
        }
  
        // 比较时间戳
        const comparison = this.compareTimestamps(preparedLocalData, remoteData);
  
        let finalData;
        let message;
  
        if (comparison === 'local') {
          // 本地数据更新，上传
          finalData = preparedLocalData;
          await this.uploadData(finalData);
          message = "同步成功（上传本地数据）";
        } else if (comparison === 'remote') {
          // 远程数据更新，下载
          finalData = remoteData;
          message = "同步成功（下载远程数据）";
        } else {
          // 合并数据
          finalData = this.mergeData(preparedLocalData, remoteData);
          await this.uploadData(finalData);
          message = "同步成功（合并本地和远程数据）";
        }
  
        return {
          success: true,
          message,
          data: finalData,
          timestamp: finalData.syncTimestamp
        };
      } catch (error) {
        console.error("同步错误:", error);
        return {
          success: false,
          message: `同步失败: ${error.message}`,
          data: localData,
          timestamp: null
        };
      }
    }
  }