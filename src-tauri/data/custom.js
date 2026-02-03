window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)

    // ===== 新增：ArtPlayer 弹窗播放逻辑 - 匹配 .m3u8 链接 =====
    const isM3u8Link = origin && origin.href && origin.href.endsWith('.m3u8');
    if (isM3u8Link && window.TAURI) {
        e.preventDefault()
        e.stopPropagation()
        console.log('检测到m3u8链接，打开弹窗播放器：', origin.href)
        openPopupPlayer(origin.href) // 弹窗播放（替换原独立窗口）
        return
    }
    // ===== 弹窗播放逻辑结束 =====

    // 原有判断逻辑：非m3u8链接，按原需求处理
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

// ===== 新增：页面内弹窗 ArtPlayer 播放器（核心功能）=====
function openPopupPlayer(m3u8Url) {
    // 1. 检查是否已存在弹窗，避免重复创建
    let popup = document.getElementById('artplayer-popup');
    if (popup) {
        // 已存在弹窗，更新播放链接并显示
        updatePopupPlayer(m3u8Url);
        return;
    }

    // 2. 创建弹窗容器（全屏半透明遮罩+居中播放器）
    popup = document.createElement('div');
    popup.id = 'artplayer-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 999999; // 确保在所有元素之上
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
    `;

    // 3. 创建播放器容器（自适应大小，最大宽高限制）
    const playerContainer = document.createElement('div');
    playerContainer.id = 'artplayer-container';
    playerContainer.style.cssText = `
        width: 100%;
        max-width: 1400px; // 播放器最大宽度
        height: 100%;
        max-height: 800px; // 播放器最大高度
        position: relative;
    `;

    // 4. 创建关闭按钮（右上角）
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        background: transparent;
        color: #fff;
        border: none;
        font-size: 32px;
        cursor: pointer;
        padding: 5px 15px;
        z-index: 10;
    `;
    // 关闭按钮点击事件
    closeBtn.onclick = () => {
        popup.remove(); // 移除弹窗
        if (window.artPopupPlayer) {
            window.artPopupPlayer.destroy(); // 销毁播放器实例
            window.artPopupPlayer = null;
        }
    };

    // 5. 组装弹窗结构
    playerContainer.appendChild(closeBtn);
    popup.appendChild(playerContainer);
    document.body.appendChild(popup);

    // 6. 初始化 ArtPlayer（关键：指定 type 为 m3u8）
    window.artPopupPlayer = new Artplayer({
        container: playerContainer,
        url: m3u8Url,
        type: 'm3u8', // 明确文件类型，避免识别失败
        autoplay: true, // 自动播放
        controls: true,
        fullscreen: true,
        fullscreenWeb: true, // 支持网页全屏
        volume: 0.7,
        playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2], // 倍速选项
        // 适配弹窗样式
        style: {
            width: '100%',
            height: '100%',
        },
    });

    // 7. 点击遮罩空白处关闭弹窗
    popup.addEventListener('click', (e) => {
        if (e.target === popup) closeBtn.click();
    });

    // 8. 监听播放器错误（如链接失效）
    window.artPopupPlayer.on('error', async (error) => {
        console.error('播放器错误：', error);
        await window.TAURI.dialog.message(`播放失败：${error.message}`, {
            title: '播放错误',
            type: 'error'
        });
        closeBtn.click();
    });
}

// ===== 辅助函数：更新已有弹窗的播放链接 =====
function updatePopupPlayer(newM3u8Url) {
    if (window.artPopupPlayer) {
        window.artPopupPlayer.src = {
            url: newM3u8Url,
            type: 'm3u8'
        };
        window.artPopupPlayer.play(); // 自动播放新链接
    }
    // 显示弹窗（若之前被隐藏）
    const popup = document.getElementById('artplayer-popup');
    if (popup) popup.style.display = 'flex';
}

// 原有：重写window.open，适配弹窗播放
window.open = function (url, target, features) {
    console.log('open', url, target, features)
    if (url && url.endsWith('.m3u8') && window.TAURI) {
        openPopupPlayer(url); // 脚本调用也走弹窗播放
        return;
    }
    // 原有逻辑：非m3u8链接，当前页面跳转
    location.href = url;
}

// 原有：全局点击事件监听
document.addEventListener('click', hookClick, { capture: true });