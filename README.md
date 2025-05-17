# 咖啡因追踪器 (Caffeine Tracker)

<p align="center">
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT License"></a>
  <a href="https://github.com/YangguangZhou/Caffeine-Tracker/issues" target="_blank"><img src="https://img.shields.io/github/issues/YangguangZhou/Caffeine-Tracker?style=flat-square" alt="GitHub issues"></a>
  <a href="https://github.com/YangguangZhou/Caffeine-Tracker/network" target="_blank"><img src="https://img.shields.io/github/forks/YangguangZhou/Caffeine-Tracker?style=flat-square" alt="GitHub forks"></a>
  <a href="https://github.com/YangguangZhou/Caffeine-Tracker/stargazers" target="_blank"><img src="https://img.shields.io/github/stars/YangguangZhou/Caffeine-Tracker?style=flat-square" alt="GitHub stars"></a>
  <br>
   <a href="https://ct.jerryz.com.cn/" target="_blank"><img src="https://img.shields.io/badge/Web%20App-在线体验-blue?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Web App"></a>
  <a href="https://cloud.jerryz.com.cn/d/OneDrive/OnlineDrive/Caffeine%20Manager/app-release.apk" target="_blank"><img src="https://img.shields.io/badge/Android%20App-立即下载-green?style=for-the-badge&logo=android&logoColor=white" alt="Android App"></a>
</p>

**告别咖啡因焦虑，轻松掌控你的咖啡生活！** ☕✨

一个使用 React 构建的现代 Web 应用（支持 Android），旨在帮助用户科学地追踪、管理和分析他们的咖啡因摄入量，并提供基于科学模型的代谢估算和健康建议。

<div style="text-align: center;">
  <img src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/ct-1.jpg" width="24%" alt="Caffeine Tracker Screenshot 1">
  <img src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/ct-2.jpg" width="24%" alt="Caffeine Tracker Screenshot 2">
  <img src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/ct-3.jpg" width="24%" alt="Caffeine Tracker Screenshot 3">
  <img src="https://cdn.jerryz.com.cn/gh/YangguangZhou/picx-images-hosting@master/Qexo/ct-4.jpg" width="24%" alt="Caffeine Tracker Screenshot 4">
</div>

## 🚀 快速开始 / 立即体验

*   **Web 应用:** [ct.jerryz.com.cn](https://ct.jerryz.com.cn/)
*   **Android 应用:** [点此下载 APK](https://cloud.jerryz.com.cn/d/OneDrive/OnlineDrive/Caffeine%20Manager/app-release.apk)

## ✨ 功能特性

Caffeine Tracker 致力于提供一个全面而用户友好的咖啡因管理体验：

*   **☕ 咖啡因摄入记录:**
    *   **快速添加**: 支持从丰富的预设饮品列表选择或手动输入，操作便捷。
    *   **智能计算**: 选择饮品并输入容量后，自动计算咖啡因含量。
    *   **灵活自定义**: 可直接输入咖啡因含量，自定义记录名称和摄入时间。
    *   **轻松管理**: 编辑和删除历史摄入记录。
*   **🍹 饮品管理:**
    *   **预设齐全**: 内含多种常见饮品（通用咖啡、连锁品牌、茶饮、速溶、其他）的预设数据。
    *   **高度自定义**: 允许用户添加、编辑和删除自定义饮品（名称、咖啡因含量、默认容量、分类）。
    *   **便捷查找**: 按分类和关键词搜索/筛选饮品。
*   **📊 当前状态仪表盘:**
    *   **实时追踪，数据精准**: 实时显示当前估算的体内咖啡因含量和浓度。
    *   **可视化进度**: 半圆形进度条清晰展示当前含量相对于每日推荐上限的比例。
    *   **智能建议**: 根据当前含量提供状态评估和个性化建议。
    *   **关键信息一览**: 显示今日总摄入量和每日推荐上限。
    *   **睡眠助手**: 估算达到“睡眠安全阈值”浓度所需的时间，并显示建议的最早睡眠时间。
*   **📈 咖啡因代谢曲线:**
    *   **趋势预测**: 显示过去几小时和未来十几小时的代谢趋势。
    *   **清晰标记**: 标记“现在”时间点和“睡眠安全阈值”参考线。
*   **🔬 数据统计与分析:**
    *   **深度分析，数据可视化**: 按周、月、年视图查看历史摄入数据。
    *   **图表展示**: 柱状图展示所选时间范围内的每日/每月总摄入量。
    *   **全面概览**: 显示所选时间范围的总摄入量和日均摄入量。
    *   **来源分析**: 展示不同饮品贡献的咖啡因比例。
    *   **健康洞察**: 提供健康分析与洞察报告，评估摄入模式和睡眠影响。
*   **⚙️ 个性化设置:**
    *   **量身定制**: 设置体重，用于个性化推荐和浓度估算。
    *   **灵活调整**: 设置通用每日最大摄入量、个性化推荐剂量、咖啡因半衰期、分布容积 (L/kg) 和睡前安全浓度阈值。
    *   **睡眠规划**: 设置计划睡眠时间。
*   **💾 数据管理与同步:**
    *   **本地备份**: 支持将所有数据导出为 JSON 文件进行备份。
    *   **轻松恢复**: 支持从 JSON 文件导入数据，覆盖现有数据。
    *   **数据清理**: 提供清除所有本地数据的选项。
    *   **WebDAV 同步**: 支持通过 WebDAV 在多设备间同步数据，确保数据一致性。
*   **🎨 界面友好，设计美观:**
    *   精致现代的咖啡主题设计，提供浅色和深色模式，让追踪体验不再枯燥。

## 🎯 为谁而设计？

*   **学生党 🎓**: 考试周精确安排咖啡因摄入，保持巅峰状态；避免熬夜后第二天因咖啡因过量而精神恍惚。
*   **上班族 💼**: 早会前适量咖啡因提神，重要演讲前保持清醒；下午会议前判断是否需要补充能量。
*   **健康爱好者 ❤️‍🩹**: 控制咖啡因摄入总量，避免过度依赖；优化摄入时间，改善睡眠质量。
*   **所有关心咖啡因摄入的人 🤔**: 无论你是谁，只要你关心自己的咖啡因摄入量，Caffeine Tracker 都会是你的理想伙伴。

## 🛠️ 技术栈

*   **前端框架:** [React](https://reactjs.org/)
*   **构建工具:** [Vite](https://vitejs.dev/)
*   **移动端打包:** [Capacitor](https://capacitorjs.com/)

## 🚀 安装与运行 (本地开发)

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/YangguangZhou/Caffeine-Tracker.git
    cd Caffeine-Tracker
    ```
2.  **安装依赖:**
    ```bash
    npm install
    # 或者
    yarn install
    ```
3.  **启动开发服务器:**
    ```bash
    npm start
    # 或者
    yarn start
    ```
    应用将在 `http://localhost:3000` (或指定的端口) 上运行。

## 📖 使用说明

1.  **首次使用:** 应用会加载默认设置和预设饮品。**强烈建议**先前往“设置”页面，根据个人情况（体重、对咖啡因的敏感度等）调整体重、**咖啡因半衰期**和**睡前安全浓度阈值**等参数。
2.  **添加记录:**
    *   点击“添加咖啡因摄入记录”按钮。
    *   从列表中选择饮品，或清除选择以手动输入。
    *   如果选择了饮品，**核对并输入实际饮用容量 (ml)**，咖啡因含量将自动计算显示。
    *   如果未选择饮品，或想直接指定含量，在“摄入量 (mg)”字段输入。
    *   （可选）修改记录名称和摄入时间。
    *   点击“添加记录”。
3.  **查看状态:** “当前状态”页面显示实时咖啡因估算、代谢曲线和健康建议。**请记住这些都是基于模型的估算值。**
4.  **查看统计:** “数据统计”页面提供历史数据回顾和分析。可切换周/月/年视图。
5.  **管理饮品:** 在“设置”页面的“饮品管理”部分，可以添加、编辑或删除自定义饮品，也可以编辑预设饮品的值。**建议根据您常喝饮品的实际情况编辑预设值。**
6.  **数据备份/恢复/同步:** 在“设置”页面的“数据管理”部分，可以导出当前所有数据为 JSON 文件，或从之前导出的文件导入数据。如果配置了 WebDAV，数据会自动同步。

## 🔬 计算与科学依据

*   **⚠️ 预设数据提醒:** 应用内预设饮品的咖啡因含量是基于公开数据整理或估算得出，**可能与实际含量存在差异**。不同品牌、不同杯型、不同制作方式甚至不同批次都可能影响实际含量。例如，一杯手冲咖啡的咖啡因含量可能远高于一杯速溶咖啡。**强烈建议您根据实际情况、产品标签或官方数据，在“设置”中编辑预设值或添加自定义饮品，以获得更准确的追踪结果。**
*   **⚠️ 计算模型局限性:**
    *   **咖啡因代谢:** 本应用使用基于半衰期的一级消除动力学模型 (`M(t) = M0 * (0.5)^(t / t_half)`) 来估算剩余咖啡因量。这是一个**简化的通用模型**，假设代谢速率恒定。
    *   **个体差异巨大:** 实际的咖啡因代谢速率受多种复杂因素影响，包括但不限于：
        *   **遗传基因:** `CYP1A2` 酶的活性对咖啡因代谢速率有显著的影响。
        *   **肝脏健康状况:** 肝功能会直接影响代谢能力。
        *   **吸烟:** 吸烟者通常会加速咖啡因的代谢。
        *   **怀孕与激素水平:** 怀孕期间咖啡因代谢会显著减慢。
        *   **药物相互作用:** 某些药物（如口服避孕药、某些抗生素、抗抑郁药等）会减慢咖啡因代谢；另一些则可能加速。
        *   **年龄和健康状况:** 年龄和整体健康状况也可能产生影响。
    因此，默认的数据都只是**估算**，无法完全反映复杂的生理过程。
    *   **睡眠建议:** 基于估算的浓度和设定的阈值计算得出，仅作为**参考**。个体对咖啡因导致睡眠障碍的敏感度差异很大，有些人即使在较低浓度下也会受到影响。
*   **💡 个性化调整建议:** **我们强烈建议结合自身的实际感受和经验，在“设置”页面仔细调整关键参数：**
    *   **咖啡因半衰期 (小时):** 如果您感觉咖啡因的效果持续时间比一般人长（例如，下午喝咖啡晚上就睡不着），尝试**增加**半衰期；如果您感觉效果消失得很快，可以尝试**减少**半衰期。
    *   **睡前安全浓度阈值 (mg/L):** 如果您对咖啡因非常敏感，即使在推荐阈值下仍感觉影响睡眠，请**降低**此阈值；如果您相对不敏感，可以适当**提高**。
    **通过个性化调整，您可以让应用的估算结果更贴合您的个人情况，但请始终记住这仍然是估算。**
*   **数据来源:** 预设饮品的咖啡因含量基于公开数据整理或估算，可能存在误差，用户可以自行编辑。

## 💾 数据持久化与同步

*   **本地存储:** 所有用户数据，包括摄入记录、用户设置和饮品列表，都默认存储在用户浏览器的 `localStorage` 中。这意味着数据仅保存在本地设备上。
*   **WebDAV 同步:** 为了方便多设备使用和数据备份，应用支持通过 WebDAV 服务进行数据同步。您可以在设置中配置您的 WebDAV 服务器信息。
*   **重要提示:** 清除浏览器缓存、使用隐私模式或在不同浏览器/设备上访问（未配置 WebDAV 同步时）将无法获取数据，除非使用导出/导入功能。**请注意定期使用导出功能备份您的数据，或启用 WebDAV 同步。**

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。