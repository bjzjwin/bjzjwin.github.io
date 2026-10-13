/**
 * T-Rex Runner Speed Controller & Layout Fix
 * 逆向自 Chrome T-Rex Runner 源码，提供全维度速度控制、实时仪表盘以及画幅自适应修复
 */
(function () {
    'use strict';

    let originalGameOver = null;
    let isInvincible = false;
    let isPaused = false;
    let targetSpeed = 6.0;

    // 核心修复：重写 Runner 的 setArcadeMode，阻止其将页面拉伸为 100vh 及产生错误的全局 scale
    function patchRunnerArcadeMode() {
        if (window.Runner) {
            window.Runner.prototype.setArcadeMode = function () {
                // 不向 body 添加 arcade-mode 类名，保持在卡片内自适应展示
            };
            window.Runner.prototype.setArcadeModeContainerScale = function () {
                if (this.containerEl) {
                    this.containerEl.style.transform = 'none';
                }
            };
        }
    }

    patchRunnerArcadeMode();

    // 获取当前 Runner 实例
    function getRunner() {
        return window.Runner && window.Runner.instance_ ? window.Runner.instance_ : null;
    }

    // 修复容器画幅与响应式比例
    function fixViewportScale() {
        const stageFrame = document.querySelector('.game-stage-frame');
        const card = document.querySelector('.game-viewport-card');
        if (!stageFrame || !card) return;

        const cardWidth = card.clientWidth - 32; // 除去 padding
        if (cardWidth < 600) {
            const scale = cardWidth / 600;
            stageFrame.style.transform = `scale(${scale})`;
            stageFrame.style.transformOrigin = 'center top';
            stageFrame.style.height = `${150 * scale}px`;
        } else {
            stageFrame.style.transform = 'none';
            stageFrame.style.height = '150px';
        }

        const runner = getRunner();
        if (runner && runner.containerEl) {
            runner.containerEl.style.transform = 'none';
            document.body.classList.remove('arcade-mode');
        }
    }

    window.addEventListener('resize', fixViewportScale);

    // 初始化控制面板
    function initSpeedController() {
        patchRunnerArcadeMode();
        fixViewportScale();

        const hudSpeedVal = document.getElementById('hudSpeedVal');
        const hudSpeedMeter = document.getElementById('hudSpeedMeter');
        const hudDistance = document.getElementById('hudDistance');
        const hudAccel = document.getElementById('hudAccel');
        const hudStatus = document.getElementById('hudStatus');

        const sliderSpeed = document.getElementById('sliderSpeed');
        const badgeSpeed = document.getElementById('badgeSpeed');

        const sliderAccel = document.getElementById('sliderAccel');
        const badgeAccel = document.getElementById('badgeAccel');

        const sliderMaxSpeed = document.getElementById('sliderMaxSpeed');
        const badgeMaxSpeed = document.getElementById('badgeMaxSpeed');

        const toggleInvincible = document.getElementById('toggleInvincible');
        const toggleConstantSpeed = document.getElementById('toggleConstantSpeed');
        const btnPause = document.getElementById('btnPause');
        const btnRestart = document.getElementById('btnRestart');

        const presetBtns = document.querySelectorAll('.preset-btn');

        // 设置速度
        function applySpeed(newSpeed) {
            targetSpeed = parseFloat(newSpeed);
            const runner = getRunner();
            if (runner) {
                runner.currentSpeed = targetSpeed;
                runner.config.SPEED = targetSpeed;
                // 若超过当前上限，自动扩展上限
                if (runner.currentSpeed > runner.config.MAX_SPEED) {
                    runner.config.MAX_SPEED = Math.ceil(runner.currentSpeed * 1.3);
                    sliderMaxSpeed.value = runner.config.MAX_SPEED;
                    badgeMaxSpeed.textContent = runner.config.MAX_SPEED;
                }
            }
            sliderSpeed.value = targetSpeed;
            badgeSpeed.textContent = targetSpeed.toFixed(1);
        }

        // 设置加速度
        function applyAccel(newAccel) {
            const val = parseFloat(newAccel);
            const runner = getRunner();
            if (runner) {
                runner.config.ACCELERATION = val;
            }
            sliderAccel.value = val;
            badgeAccel.textContent = val.toFixed(4);
            toggleConstantSpeed.checked = (val === 0);
        }

        // 设置最大速度
        function applyMaxSpeed(newMax) {
            const val = parseFloat(newMax);
            const runner = getRunner();
            if (runner) {
                runner.config.MAX_SPEED = val;
            }
            sliderMaxSpeed.value = val;
            badgeMaxSpeed.textContent = val;
        }

        // 滑块交互
        sliderSpeed.addEventListener('input', (e) => {
            applySpeed(e.target.value);
            clearActivePresets();
        });

        sliderAccel.addEventListener('input', (e) => {
            applyAccel(e.target.value);
            clearActivePresets();
        });

        sliderMaxSpeed.addEventListener('input', (e) => {
            applyMaxSpeed(e.target.value);
        });

        // 恒速模式
        toggleConstantSpeed.addEventListener('change', (e) => {
            if (e.target.checked) {
                applyAccel(0);
            } else {
                applyAccel(0.001);
            }
        });

        // 无敌模式开关
        toggleInvincible.addEventListener('change', (e) => {
            isInvincible = e.target.checked;
            const runner = getRunner();
            if (!runner) return;

            if (isInvincible) {
                if (!originalGameOver) {
                    originalGameOver = runner.gameOver.bind(runner);
                }
                runner.gameOver = function () {
                    // 免疫碰撞，保留奔跑状态
                };
            } else {
                if (originalGameOver) {
                    runner.gameOver = originalGameOver;
                }
            }
        });

        // 暂停 / 继续
        btnPause.addEventListener('click', () => {
            const runner = getRunner();
            if (!runner) return;

            if (isPaused) {
                runner.play();
                isPaused = false;
                btnPause.innerHTML = '⏸️ 暂停';
            } else {
                runner.stop();
                isPaused = true;
                btnPause.innerHTML = '▶️ 继续';
            }
        });

        // 强制重新开始游戏
        btnRestart.addEventListener('click', () => {
            const runner = getRunner();
            if (runner) {
                if (runner.raqId) {
                    runner.stop();
                    runner.raqId = 0;
                }
                runner.restart();
                runner.currentSpeed = targetSpeed;
                runner.config.SPEED = targetSpeed;
                if (isPaused) {
                    isPaused = false;
                    btnPause.innerHTML = '⏸️ 暂停';
                }
                fixViewportScale();
            }
        });

        // 预设模式
        function clearActivePresets() {
            presetBtns.forEach(btn => btn.classList.remove('active'));
        }

        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                clearActivePresets();
                btn.classList.add('active');

                const speed = parseFloat(btn.dataset.speed);
                const accel = parseFloat(btn.dataset.accel);
                const max = parseFloat(btn.dataset.max);

                applySpeed(speed);
                applyAccel(accel);
                applyMaxSpeed(max);
            });
        });

        // HUD 周期性渲染
        function updateHUD() {
            const runner = getRunner();
            if (runner) {
                const current = runner.currentSpeed || targetSpeed;
                const max = runner.config.MAX_SPEED || 13;
                const accel = runner.config.ACCELERATION;

                hudSpeedVal.textContent = current.toFixed(1);
                hudAccel.textContent = accel > 0 ? `+${accel.toFixed(4)}/帧` : '0 (恒速)';
                hudDistance.textContent = Math.floor(runner.distanceRan || 0);

                const percent = Math.min(100, Math.max(5, (current / max) * 100));
                hudSpeedMeter.style.width = `${percent}%`;

                if (current < 7) {
                    hudStatus.textContent = '🐢 常规节奏';
                    hudStatus.style.color = '#94a3b8';
                } else if (current < 12) {
                    hudStatus.textContent = '🦖 稳步提速';
                    hudStatus.style.color = '#38bdf8';
                } else if (current < 18) {
                    hudStatus.textContent = '⚡ 疾风飞驰';
                    hudStatus.style.color = '#fbbf24';
                } else {
                    hudStatus.textContent = '🚀 超音速狂飙';
                    hudStatus.style.color = '#f87171';
                }

                // 保持清理破坏画面的 arcade-mode
                if (document.body.classList.contains('arcade-mode')) {
                    document.body.classList.remove('arcade-mode');
                }
                if (runner.containerEl && runner.containerEl.style.transform && runner.containerEl.style.transform !== 'none') {
                    runner.containerEl.style.transform = 'none';
                }
            }
            requestAnimationFrame(updateHUD);
        }

        requestAnimationFrame(updateHUD);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initSpeedController, 60);
        });
    } else {
        setTimeout(initSpeedController, 60);
    }
})();
