// ==UserScript==
// @name         Imgbox图片上传工具
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  将图片链接批量上传到imgbox并返回大图链接
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      imgbox.com
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // 创建上传界面
    function createUploadUI() {
        // 检查是否已经存在UI
        if (document.getElementById('imgbox-uploader-container')) {
            document.getElementById('imgbox-uploader-container').style.display = 'block';
            return;
        }

        // 创建主容器
        const container = document.createElement('div');
        container.id = 'imgbox-uploader-container';
        container.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            width: 400px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 15px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: Arial, sans-serif;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // 创建标题
        const title = document.createElement('h2');
        title.textContent = 'Imgbox图片上传工具';
        title.style.cssText = `
            margin: 0 0 15px 0;
            font-size: 18px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        `;
        container.appendChild(title);

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
        `;
        closeButton.onclick = function() {
            container.style.display = 'none';
        };
        container.appendChild(closeButton);

        // 创建输入区域
        const inputLabel = document.createElement('div');
        inputLabel.textContent = '请输入图片链接（每行一个）:';
        inputLabel.style.marginBottom = '5px';
        container.appendChild(inputLabel);

        const textarea = document.createElement('textarea');
        textarea.id = 'imgbox-links-input';
        textarea.style.cssText = `
            width: 100%;
            height: 120px;
            margin-bottom: 15px;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
        `;
        container.appendChild(textarea);

        // 创建上传按钮
        const uploadButton = document.createElement('button');
        uploadButton.textContent = '上传到Imgbox';
        uploadButton.style.cssText = `
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 15px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            margin-right: 10px;
            cursor: pointer;
            border-radius: 4px;
        `;
        uploadButton.onclick = startUpload;
        container.appendChild(uploadButton);

        // 创建状态显示区域
        const statusDiv = document.createElement('div');
        statusDiv.id = 'imgbox-status';
        statusDiv.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            background-color: #f8f8f8;
            display: none;
        `;
        container.appendChild(statusDiv);

        // 创建结果区域
        const resultLabel = document.createElement('div');
        resultLabel.textContent = '上传结果:';
        resultLabel.style.cssText = `
            margin-top: 15px;
            margin-bottom: 5px;
            font-weight: bold;
        `;
        container.appendChild(resultLabel);

        const resultArea = document.createElement('div');
        resultArea.id = 'imgbox-results';
        resultArea.style.cssText = `
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f8f8f8;
        `;
        container.appendChild(resultArea);

        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制所有链接';
        copyButton.style.cssText = `
            background-color: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            cursor: pointer;
            border-radius: 4px;
        `;
        copyButton.onclick = copyAllLinks;
        container.appendChild(copyButton);

        // 添加到页面
        document.body.appendChild(container);
    }

    // 开始上传处理
    async function startUpload() {
        const textarea = document.getElementById('imgbox-links-input');
        const statusDiv = document.getElementById('imgbox-status');
        const resultArea = document.getElementById('imgbox-results');

        // 获取输入的链接
        const links = textarea.value.trim().split('\n').filter(link => link.trim() !== '');
        
        if (links.length === 0) {
            alert('请输入至少一个图片链接！');
            return;
        }

        // 清空之前的结果
        resultArea.innerHTML = '';
        
        // 显示状态
        statusDiv.style.display = 'block';
        statusDiv.textContent = '准备处理...';
        statusDiv.style.color = '#333';

        // 处理每个链接
        const results = [];
        for (let i = 0; i < links.length; i++) {
            const link = links[i].trim();
            statusDiv.textContent = `处理第 ${i+1}/${links.length} 张图片: ${link}`;
            
            try {
                // 下载图片
                const imageBlob = await downloadImage(link);
                
                // 检查格式并转换
                let processedBlob = imageBlob;
                const fileType = imageBlob.type.split('/')[1];
                
                if (fileType.toLowerCase() !== 'png') {
                    statusDiv.textContent = `转换第 ${i+1}/${links.length} 张图片为PNG格式...`;
                    processedBlob = await convertToPng(imageBlob);
                }
                
                // 上传到imgbox
                statusDiv.textContent = `上传第 ${i+1}/${links.length} 张图片到imgbox...`;
                const uploadResult = await uploadToImgbox(processedBlob);
                
                // 添加结果
                const resultItem = document.createElement('div');
                resultItem.style.marginBottom = '5px';
                
                if (uploadResult.success) {
                    const imgboxLink = uploadResult.directLink;
                    results.push(imgboxLink);
                    
                    resultItem.innerHTML = `
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <img src="${imgboxLink}" style="max-width: 50px; max-height: 50px; margin-right: 10px;">
                            <a href="${imgboxLink}" target="_blank">${imgboxLink}</a>
                        </div>
                    `;
                } else {
                    resultItem.innerHTML = `<div style="color: red;">错误: ${link} - ${uploadResult.error}</div>`;
                }
                
                resultArea.appendChild(resultItem);
            } catch (error) {
                console.error(`处理图片 ${link} 时出错:`, error);
                
                const resultItem = document.createElement('div');
                resultItem.innerHTML = `<div style="color: red;">错误: ${link} - ${error.message}</div>`;
                resultArea.appendChild(resultItem);
            }
        }
        
        statusDiv.textContent = `处理完成! 成功上传 ${results.length}/${links.length} 张图片`;
        statusDiv.style.color = results.length === links.length ? 'green' : 'orange';
    }

    // 下载图片
    async function downloadImage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    resolve(response.response);
                },
                onerror: function(error) {
                    reject(new Error(`下载图片失败: ${error}`));
                }
            });
        });
    }

    // 转换图片为PNG格式
    async function convertToPng(imageBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/png');
            };
            
            img.onerror = () => reject(new Error('图片格式转换失败'));
            img.src = URL.createObjectURL(imageBlob);
        });
    }

    // 上传到imgbox
    async function uploadToImgbox(imageBlob) {
        try {
            // 第一步：获取上传token和表单数据
            const tokenData = await getImgboxToken();
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('files[]', imageBlob, 'image.png');
            formData.append('token', tokenData.token);
            formData.append('content_type', '1'); // 默认内容类型
            formData.append('gallery_id', ''); // 不使用相册
            formData.append('gallery_title', ''); // 不设置相册标题
            formData.append('comments_enabled', '1'); // 允许评论
            
            // 发送上传请求
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://imgbox.com/upload/process",
                    data: formData,
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": "https://imgbox.com/"
                    },
                    onload: function(response) {
                        try {
                            const result = JSON.parse(response.responseText);
                            
                            if (result.success) {
                                // 解析返回的HTML以获取直接链接
                                const files = result.files;
                                if (files && files.length > 0) {
                                    // 获取大图链接
                                    const directLink = extractDirectLink(files[0]);
                                    resolve({
                                        success: true,
                                        directLink: directLink
                                    });
                                } else {
                                    resolve({
                                        success: false,
                                        error: '上传成功但未返回图片链接'
                                    });
                                }
                            } else {
                                resolve({
                                    success: false,
                                    error: result.error || '上传失败'
                                });
                            }
                        } catch (e) {
                            reject(new Error(`解析上传响应失败: ${e.message}`));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error(`上传请求失败: ${error}`));
                    }
                });
            });
        } catch (error) {
            return {
                success: false,
                error: `上传前准备失败: ${error.message}`
            };
        }
    }

    // 获取imgbox上传token
    async function getImgboxToken() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://imgbox.com/",
                onload: function(response) {
                    try {
                        // 从页面HTML中提取token
                        const html = response.responseText;
                        const tokenMatch = html.match(/name="token" value="([^"]+)"/);
                        
                        if (tokenMatch && tokenMatch[1]) {
                            resolve({
                                token: tokenMatch[1]
                            });
                        } else {
                            reject(new Error('无法从imgbox页面获取上传token'));
                        }
                    } catch (e) {
                        reject(new Error(`解析imgbox页面失败: ${e.message}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error(`获取imgbox页面失败: ${error}`));
                }
            });
        });
    }

    // 从imgbox返回的文件信息中提取直接链接
    function extractDirectLink(fileInfo) {
        // 这里需要根据imgbox的实际返回格式进行调整
        // 假设fileInfo包含一个thumbnail_url字段，我们需要将其转换为大图链接
        if (fileInfo.thumbnail_url) {
            // 通常缩略图URL格式为: https://thumbs2.imgbox.com/xx/xx/xxxx_t.jpg
            // 大图URL格式为: https://images2.imgbox.com/xx/xx/xxxx_o.jpg
            return fileInfo.thumbnail_url.replace('thumbs', 'images').replace('_t.', '_o.');
        } else if (fileInfo.url) {
            return fileInfo.url;
        }
        
        return null;
    }

    // 复制所有链接
    function copyAllLinks() {
        const resultArea = document.getElementById('imgbox-results');
        const links = Array.from(resultArea.querySelectorAll('a')).map(a => a.href);
        
        if (links.length === 0) {
            alert('没有可复制的链接！');
            return;
        }
        
        const text = links.join('\n');
        
        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert(`已复制 ${links.length} 个链接到剪贴板！`);
            } else {
                alert('复制失败，请手动复制链接。');
            }
        } catch (err) {
            alert('复制失败，请手动复制链接。');
        }
        
        document.body.removeChild(textarea);
    }

    // 注册菜单命令
    GM_registerMenuCommand('打开Imgbox上传工具', createUploadUI);

    // 检查是否有剪贴板中的图片链接
    function checkClipboardForLinks() {
        const clipboardText = GM_getValue('HDB_images');
        if (clipboardText) {
            // 如果在imgbox.com，自动填充链接
            if (window.location.href.includes('imgbox.com')) {
                setTimeout(() => {
                    createUploadUI();
                    const textarea = document.getElementById('imgbox-links-input');
                    textarea.value = clipboardText;
                    GM_setValue('HDB_images', ''); // 清空，避免重复使用
                }, 1000);
            }
        }
    }

    // 页面加载完成后检查
    window.addEventListener('load', checkClipboardForLinks);
})();
