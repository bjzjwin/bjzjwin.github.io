# Chrome T-Rex Runner 速度规则逆向分析与速度可调版

本项目针对经典小恐龙游戏 [t-rex-runner](https://wayou.github.io/t-rex-runner/) 进行了源码逆向与机制分析，并在本地提供了一个自带高颜值速度控制面板与实时仪表盘（HUD）的增强版本。

---

## 一、为什么小恐龙会越来越快？（速度规则逆向揭秘）

通过对游戏前端脚本 `index.js` 的静态分析与符号跟踪，小恐龙的奔跑速度核心由 `Runner` 类的状态机与帧刷新循环驱动：

### 1. 核心速度参数（`Runner.config`）
在 `index.js` 第 105~129 行：
```javascript
Runner.config = {
    SPEED: 6,                     // 初始奔跑速度 (6.0)
    MAX_SPEED: 13,                // 最大限制速度 (13.0)
    ACCELERATION: 0.001,          // 每帧加速度 (0.001)
    SPEED_DROP_COEFFICIENT: 3,    // 下蹲急速下坠倍率 (3)
    BG_CLOUD_SPEED: 0.2,          // 云朵移动速度 (0.2)
    ...
};
```

### 2. 速度累加核心逻辑（`Runner.prototype.update`）
在主渲染循环（第 566~572 行），通过 `requestAnimationFrame` 驱动（标准刷新率约 60 FPS）：
```javascript
if (!collision) {
    this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

    // 只要当前速度尚未达到上限 MAX_SPEED，每一帧均累加一次 ACCELERATION！
    if (this.currentSpeed < this.config.MAX_SPEED) {
        this.currentSpeed += this.config.ACCELERATION;
    }
} else {
    this.gameOver();
}
```

### 3. 数学计算与时间推导
- **每秒提速**：在 60 FPS 下，每秒增加速度 $\Delta v = 60 \times 0.001 = 0.06$ 单位。
- **达到极速时间**：
  $$\text{需要累加的速度} = MAX\_SPEED - SPEED = 13.0 - 6.0 = 7.0$$
  $$\text{所需渲染帧数} = \frac{7.0}{0.001} = 7000 \text{ 帧}$$
  $$\text{换算奔跑时间} = \frac{7000}{60} \approx 116.7 \text{ 秒（约 1 分 56 秒）}$$
  即：**玩家只要坚持奔跑约 117 秒，小恐龙就会达到默认的极速 13.0 并维持极速**。

### 4. 速度增加时的系统级连锁反应
1. **地面与障碍物位移**：
   在 `HorizonLine` 与 `Obstacle` 中，每帧移动像素为 $\lfloor(speed \times \frac{60}{1000}) \times deltaTime\rfloor$。速度越快，每帧向左位移越大。
2. **障碍物最小间距动态自适应**：
   在 `Obstacle.prototype.getGap` 中：
   $$minGap = \lfloor width \times speed + minGap \times gapCoefficient \rfloor$$
   速度加快时，系统会自动把障碍物之间的距离拉宽，防止因速度过快导致小恐龙在物理上无法跳越。
3. **跳跃初始冲量联动**：
   `tRex.startJump(currentSpeed)` 赋予小恐龙与当前速度相匹配的起跳初速度。
4. **得分速度加快**：
   `distanceRan` 累加速度直接与 `currentSpeed` 成正比，速度越快，得分越快。

---

## 二、速度可调版本（增强特性）

我们在 `t-rex-runner` 文件夹下构建了即开即玩的增强版本：

1. **实时速度仪表盘 (HUD)**：
   - 动态数字表盘（实时显示小恐龙当前速度，精确到小数点后 1 位）。
   - 速度进度条与档位状态彩色标签（🐢 常规节奏 / 🦖 稳步提速 / ⚡ 疾风飞驰 / 🚀 超音速狂飙）。
   - 实时每帧加速度与已跑距离统计。

2. **全维度速度调节**：
   - **🏃 实时速度滑块 (Current Speed)**：1.0 ~ 40.0，拖动滑块小恐龙立即变速。
   - **📈 每帧加速度滑块 (Acceleration)**：0 ~ 0.01，可任意调节变快幅度。
   - **🏁 极速上限 (Max Speed)**：突破原版 13 的封顶，可上调至 60。
   - **🔒 恒速模式开关**：开启后加速度归零，小恐龙将以恒定速度奔跑，再也不会越来越快！

3. **常用预设档位（一键切换）**：
   - 🐢 **慢速散步**（速度 3.0，恒速）
   - 🦖 **原版默认**（速度 6.0，加速度 0.001，上限 13）
   - 🔒 **恒定匀速**（速度 8.0，恒速）
   - ⚡ **极速狂飙**（速度 14.0，加速度 0.002，上限 25）
   - 🔥 **超音速**（速度 25.0，加速度 0.005，上限 50）

4. **实用辅助功能**：
   - **🛡️ 无敌练习模式**：免疫仙人掌和翼龙碰撞，超高速狂飙不翻车。
   - **⏸️ 暂停 / 继续**。
   - **🔄 一键重新开始**（重开后保留用户自定义的速度设定）。

---

## 三、文件结构说明

所有文件均位于 `t-rex-runner/` 目录下：
```
t-rex-runner/
├── index.html            # 速度可调强化版入口（集成控制面板与HUD）
├── index.original.html   # 原版备份入口
├── index.css             # 原版基础样式
├── index.js              # 原版游戏引擎脚本（Chromium 提取）
├── control-panel.css     # 速度控制面板与毛玻璃HUD样式
├── control-panel.js      # 速度控制与HUD交互脚本
├── assets/               # 离线精灵图纹理素材 (100% & 200%)
└── README.md             # 逆向分析报告与说明文档
```

## 四、如何游玩

直接在浏览器中打开 `t-rex-runner/index.html` 即可：
- 也可以使用 Python 本地临时服务器：
  ```bash
  cd t-rex-runner
  python3 -m http.server 8080
  ```
  然后在浏览器访问 `http://localhost:8080` 即可畅玩！
