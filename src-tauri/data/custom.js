window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = async (e) => { // 【注意】这里加了 async，变为异步函数
    const origin = e.target.closest('a')
    
    // =================================================================
    // 【新增功能】：拦截带有 download 属性的导出链接，触发系统“另存为”弹窗
    // =================================================================
    if (origin && origin.hasAttribute('download')) {
        e.preventDefault() // 阻止系统默认的静默下载行为
        
        const fileName = origin.getAttribute('download') || 'export_file'
        const fileUrl = origin.href
        
        try {
            // 检查是否成功注入了 Tauri API
            if (window.__TAURI__) {
                const { save } = window.__TAURI__.dialog
                const { writeBinaryFile } = window.__TAURI__.fs

                // 1. 唤起 Windows 的目录选择弹窗
                const filePath = await save({ 
                    defaultPath: fileName 
                })
                
                // 如果用户点击了取消，直接退出
                if (!filePath) {
                    console.log('用户取消了保存')
                    return
                }

                // 2. 获取要导出的文件数据（兼容 Blob URL 或普通网络链接）
                const response = await fetch(fileUrl)
                const arrayBuffer = await response.arrayBuffer()
                const uint8Array = new Uint8Array(arrayBuffer)

                // 3. 将数据写入用户选择的指定目录
                await writeBinaryFile(filePath, uint8Array)
                console.log('文件成功导出至:', filePath)
                
                return // 执行完毕，安全退出
            } else {
                console.warn('未检测到 Tauri API，将使用浏览器默认下载逻辑')
            }
        } catch (error) {
            console.error('调用导出弹窗失败:', error)
            // 如果出错（比如权限没开），为了保证程序业务不中断，依然回退到默认下载
        }
        
        // 回退机制：如果没有 Tauri 环境或执行报错，恢复原来的直接跳转下载
        location.href = fileUrl
        return 
    }
    // =================================================================

    // --- 下面是原来的代码逻辑，保持完全不变 ---
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
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

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

// 注意这里绑定的依然是 hookClick
document.addEventListener('click', hookClick, { capture: true })