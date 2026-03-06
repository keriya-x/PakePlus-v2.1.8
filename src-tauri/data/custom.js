window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==========================================
// 修复版导出脚本：优先使用浏览器原生保存接口
// ==========================================
const hookClick = async (e) => {
    const origin = e.target.closest('a')
    
    // 拦截下载链接
    if (origin && origin.hasAttribute('download')) {
        e.preventDefault()
        const fileName = origin.getAttribute('download') || 'download_file'
        const fileUrl = origin.href
        
        console.log(`准备下载: ${fileName}`)

        try {
            // 1. 获取文件数据
            const response = await fetch(fileUrl)
            const blob = await response.blob()

            // 2. 方案A：尝试使用现代浏览器原生“另存为” API (无需 Tauri 权限)
            // 这通常在 WebView2 (Windows) 中支持良好
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'Files',
                            accept: {'application/octet-stream': ['.' + fileName.split('.').pop()]} 
                        }]
                    })
                    const writable = await handle.createWritable()
                    await writable.write(blob)
                    await writable.close()
                    alert('文件导出成功！') // 成功提示
                    return
                } catch (err) {
                    // 如果用户点击了“取消”，这里会报错，我们要忽略
                    if (err.name === 'AbortError') return
                    console.warn('原生保存API失败，尝试方案B...', err)
                }
            }

            // 3. 方案B：尝试 Tauri API (作为备选)
            if (window.__TAURI__) {
                const { save } = window.__TAURI__.dialog
                const { writeBinaryFile } = window.__TAURI__.fs
                
                // 弹出选择框
                const filePath = await save({ defaultPath: fileName })
                if (!filePath) return 

                // 尝试写入 (如果 Permissions 没开，这步会报错并跳到 catch)
                const arrayBuffer = await blob.arrayBuffer()
                await writeBinaryFile(filePath, new Uint8Array(arrayBuffer))
                alert('文件导出成功！')
                return
            }

        } catch (error) {
            console.error('自定义保存失败:', error)
            // 4. 最终保底方案：如果上面都失败了，强制回退到默认下载
            // 至少保证用户能拿到文件，哪怕是在默认下载文件夹里
            alert('无法保存到指定目录（权限不足），文件将保存到您的【默认下载文件夹】。')
            
            const tempLink = document.createElement('a')
            tempLink.href = fileUrl
            tempLink.download = fileName
            document.body.appendChild(tempLink)
            tempLink.click()
            document.body.removeChild(tempLink)
        }
        return
    }

    // --- 原有逻辑保持不变 ---
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]')
    if ((origin && origin.href && origin.target === '_blank') || (origin && origin.href && isBaseTargetBlank)) {
        e.preventDefault()
        location.href = origin.href
    }
}

window.open = function (url, target, features) {
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })