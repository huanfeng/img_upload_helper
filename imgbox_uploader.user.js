// ==UserScript==
// @name         Imgbox图片上传助手增强版
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  在imgbox界面添加图片链接输入框，自动下载并填充到上传列表，解析上传结果，支持暗色主题、浮窗和TAB分页
// @author       You
// @match        *://imgbox.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
    
    // 添加全局样式
    GM_addStyle(`
        /* 浮动通知样式 */
        #toast-container {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            text-align: center;
        }
        
        .toast {
            background-color: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: inline-block;
            animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
            opacity: 0;
            min-width: 200px;
            max-width: 400px;
        }
        
        .toast.success {
            background-color: #4CAF50;
            border-left: 5px solid #45a049;
        }
        
        .toast.error {
            background-color: #f44336;
            border-left: 5px solid #d32f2f;
            color: white !important;
        }
        
        .toast.info {
            background-color: #2196F3;
            border-left: 5px solid #1976D2;
        }
        
        @keyframes fadeIn {
            from {opacity: 0; transform: translateY(-20px);}
            to {opacity: 1; transform: translateY(0);}
        }
        
        @keyframes fadeOut {
            from {opacity: 1; transform: translateY(0);}
            to {opacity: 0; transform: translateY(-20px);}
        }
        
        /* 导航栏助手按钮样式 */
        .nav.pull-right a[title="打开图片上传助手"]:hover {
            color: #45a049 !important;
            text-decoration: underline;
        }
        
        #custom-imgbox-container {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #444;
            border-radius: 5px;
            background-color: #222;
            color: #ddd;
            display: none;
        }
        
        #custom-imgbox-container h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #fff;
        }
        
        #custom-imgbox-container textarea {
            width: 100%;
            height: 100px;
            margin-bottom: 15px;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: #333;
            color: #fff;
        }
        
        #custom-imgbox-container button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 15px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            margin-right: 10px;
            margin-bottom: 10px;
            cursor: pointer;
            border-radius: 4px;
        }
        
        #custom-imgbox-container button.blue-btn {
            background-color: #2196F3;
        }
        
        #custom-imgbox-container button.orange-btn {
            background-color: #ff9800;
        }
        
        #custom-imgbox-container button.red-btn {
            background-color: #f44336;
        }
        
        #imgbox-status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            background-color: #333;
            display: none;
        }
        
        #imgbox-results, #imgbox-extracted-links {
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: #333;
        }
        
        .result-item {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        }
        
        .result-item img {
            max-width: 50px;
            max-height: 50px;
            margin-right: 10px;
            border: 1px solid #555;
        }
        
        .result-item a {
            color: #4CAF50;
            text-decoration: none;
        }
        
        .result-item a:hover {
            text-decoration: underline;
        }
        
        .error {
            color: #f44336;
        }
        
        .section-title {
            margin-top: 15px;
            margin-bottom: 5px;
            font-weight: bold;
            color: #fff;
        }
        
        /* 标签页样式 */
        .tab-container {
            width: 100%;
            margin-bottom: 15px;
        }
        
        .tab-buttons {
            display: flex;
            border-bottom: 1px solid #444;
            margin-bottom: 15px;
        }
        
        .tab-button {
            padding: 8px 15px;
            background-color: #333;
            color: #ddd;
            border: none;
            cursor: pointer;
            margin-right: 2px;
            border-radius: 4px 4px 0 0;
        }
        
        .tab-button.active {
            background-color: #4CAF50;
            color: white;
        }
        
        .tab-content {
            display: none;
            padding: 10px;
            background-color: #222;
            border-radius: 0 0 4px 4px;
        }
        
        .tab-content.active {
            display: block;
        }
    `);
    
    // 页面加载完成后执行
    window.addEventListener('load', function() {
        // 检查是否在imgbox网站
        if (window.location.hostname.includes('imgbox.com')) {
            // 添加浮动按钮
            addFloatingButton();
            
            // 检查是否有从其他页面传递过来的图片链接
            const imageLinks = GM_getValue('HDB_images', '');
            if (imageLinks) {
                console.log('发现图片链接:', imageLinks);
                // 清空存储的链接，避免重复使用
                GM_setValue('HDB_images', '');
                
                // 延迟一下，确保页面完全加载
                setTimeout(() => {
                    // 添加UI并填充链接
                    addImgboxUI(imageLinks);
                    // 显示界面
                    document.getElementById('custom-imgbox-container').style.display = 'block';
                    // 激活上传标签页
                    activateTab('upload-tab');
                }, 1000);
            } else {
                // 没有传递的链接，也添加UI但不显示
                addImgboxUI('');
            }
            
            // 监听上传结果
            monitorUploadResults();
        }
    });
    
    // 将助手按钮添加到导航栏
    function addFloatingButton() {
        // 等待导航栏加载
        const waitForNav = setInterval(() => {
            const navUl = document.querySelector('.nav.pull-right');
            if (navUl) {
                clearInterval(waitForNav);
                
                // 创建新的导航项
                const navItem = document.createElement('li');
                const navLink = document.createElement('a');
                navLink.href = 'javascript:void(0);';
                navLink.textContent = '图片助手';
                navLink.title = '打开图片上传助手';
                navLink.style.color = '#4CAF50'; // 使其稍微突出
                
                navLink.onclick = function(e) {
                    e.preventDefault();
                    const customContainer = document.getElementById('custom-imgbox-container');
                    if (customContainer) {
                        if (customContainer.style.display === 'none') {
                            customContainer.style.display = 'block';
                        } else {
                            customContainer.style.display = 'none';
                        }
                    } else {
                        // 初次创建界面
                        addImgboxUI();
                    }
                };
                
                navItem.appendChild(navLink);
                
                // 将导航项添加到导航栏
                navUl.appendChild(navItem);
            }
        }, 100);
    }
    
    // 激活标签页
    function activateTab(tabId) {
        // 隐藏所有标签内容
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 取消所有标签按钮的激活状态
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // 激活选中的标签
        document.getElementById(tabId).classList.add('active');
        // 激活对应的按钮
        const activeButtonIndex = tabId === 'upload-tab' ? 0 : 1;
        document.querySelectorAll('.tab-button')[activeButtonIndex].classList.add('active');
    }
    
    // 添加Imgbox界面UI
    function addImgboxUI(initialLinks) {
        // 查找上传表单区域
        const uploadForm = document.querySelector('form[action*="upload"]') || 
                           document.querySelector('form#new_gallery') ||
                           document.querySelector('.container form');
        
        if (!uploadForm) {
            console.error('未找到上传表单');
            return;
        }
        
        // 创建自定义UI容器
        const customContainer = document.createElement('div');
        customContainer.id = 'custom-imgbox-container';
        customContainer.style.display = 'none'; // 默认隐藏
        
        // 创建标签页容器
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        customContainer.appendChild(tabContainer);
        
        // 创建标签按钮
        const tabButtons = document.createElement('div');
        tabButtons.className = 'tab-buttons';
        tabContainer.appendChild(tabButtons);
        
        // 上传标签按钮
        const uploadTabButton = document.createElement('button');
        uploadTabButton.className = 'tab-button active';
        uploadTabButton.textContent = '图片链接上传';
        uploadTabButton.onclick = function() {
            activateTab('upload-tab');
        };
        tabButtons.appendChild(uploadTabButton);
        
        // 提取标签按钮
        const extractTabButton = document.createElement('button');
        extractTabButton.className = 'tab-button';
        extractTabButton.textContent = 'BB代码链接提取';
        extractTabButton.onclick = function() {
            activateTab('extract-tab');
        };
        tabButtons.appendChild(extractTabButton);
        
        // 创建上传标签内容
        const uploadTabContent = document.createElement('div');
        uploadTabContent.id = 'upload-tab';
        uploadTabContent.className = 'tab-content active';
        tabContainer.appendChild(uploadTabContent);
        
        // 创建链接输入区域
        const inputLabel = document.createElement('div');
        inputLabel.textContent = '请输入图片链接（每行一个）:';
        inputLabel.style.marginBottom = '5px';
        uploadTabContent.appendChild(inputLabel);
        
        const textarea = document.createElement('textarea');
        textarea.id = 'imgbox-links-input';
        // 如果有初始链接，填充到文本框
        textarea.value = initialLinks;
        uploadTabContent.appendChild(textarea);
        
        // 创建下载按钮
        const downloadButton = document.createElement('button');
        downloadButton.textContent = '下载图片并添加到上传列表';
        downloadButton.type = 'button'; // 防止触发表单提交
        downloadButton.onclick = function() {
            processImageLinks(textarea.value);
        };
        uploadTabContent.appendChild(downloadButton);
        
        // 创建状态显示区域
        const statusDiv = document.createElement('div');
        statusDiv.id = 'imgbox-status';
        uploadTabContent.appendChild(statusDiv);
        
        // 创建结果区域
        const resultLabel = document.createElement('div');
        resultLabel.textContent = '上传结果:';
        resultLabel.className = 'section-title';
        uploadTabContent.appendChild(resultLabel);
        
        const resultArea = document.createElement('div');
        resultArea.id = 'imgbox-results';
        uploadTabContent.appendChild(resultArea);
        
        
        // 创建提取标签内容
        const extractTabContent = document.createElement('div');
        extractTabContent.id = 'extract-tab';
        extractTabContent.className = 'tab-content';
        tabContainer.appendChild(extractTabContent);
        
        // 创建链接提取区域
        const extractLabel = document.createElement('div');
        extractLabel.textContent = 'BB代码链接提取:';
        extractLabel.className = 'section-title';
        extractTabContent.appendChild(extractLabel);
        
        const extractTextarea = document.createElement('textarea');
        extractTextarea.id = 'imgbox-bbcode-input';
        extractTextarea.placeholder = '粘贴包含[IMG]标签的BB代码...';
        extractTabContent.appendChild(extractTextarea);
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        extractTabContent.appendChild(buttonContainer);
        
        // 创建提取按钮
        const extractButton = document.createElement('button');
        extractButton.textContent = '提取图片链接';
        extractButton.type = 'button';
        extractButton.className = 'orange-btn';
        extractButton.onclick = function() {
            extractImageLinks();
        };
        buttonContainer.appendChild(extractButton);
        
        // 创建自动获取按钮
        const autoGetButton = document.createElement('button');
        autoGetButton.textContent = '从页面获取BB Full代码';
        autoGetButton.type = 'button';
        autoGetButton.className = 'blue-btn';
        autoGetButton.onclick = function() {
            getPageBBCode();
        };
        buttonContainer.appendChild(autoGetButton);
        
        // 创建提取结果区域
        const extractedLinksLabel = document.createElement('div');
        extractedLinksLabel.textContent = '提取结果:';
        extractedLinksLabel.className = 'section-title';
        extractTabContent.appendChild(extractedLinksLabel);
        
        const extractedLinksArea = document.createElement('div');
        extractedLinksArea.id = 'imgbox-extracted-links';
        extractTabContent.appendChild(extractedLinksArea);
        
        // 创建复制提取结果按钮
        const copyExtractedButton = document.createElement('button');
        copyExtractedButton.textContent = '复制提取的链接';
        copyExtractedButton.type = 'button';
        copyExtractedButton.className = 'blue-btn';
        copyExtractedButton.onclick = function() {
            copyExtractedLinks();
        };
        extractTabContent.appendChild(copyExtractedButton);
        
        // 将自定义容器插入到上传表单之前
        uploadForm.parentNode.insertBefore(customContainer, uploadForm);
        
        // 如果有初始链接，自动处理
        if (initialLinks.trim()) {
            setTimeout(() => {
                processImageLinks(initialLinks);
            }, 1500);
        }
    }
    
    // 处理图片链接
    async function processImageLinks(linksText) {
        const statusDiv = document.getElementById('imgbox-status');
        statusDiv.style.display = 'block';
        statusDiv.textContent = '准备处理图片链接...';
        
        // 解析链接
        const links = linksText.trim().split(/[\n,]/).filter(link => link.trim() !== '');
        
        if (links.length === 0) {
            statusDiv.textContent = '请输入至少一个图片链接！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 查找文件输入元素
        const fileInput = document.querySelector('input[type="file"][name*="file"]');
        if (!fileInput) {
            statusDiv.textContent = '未找到文件上传输入框！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 先收集所有文件
        statusDiv.textContent = `开始处理 ${links.length} 个图片链接...`;
        const files = [];
        
        for (let i = 0; i < links.length; i++) {
            const link = links[i].trim();
            if (!link) continue;
            
            statusDiv.textContent = `下载第 ${i+1}/${links.length} 个图片: ${link}`;
            
            try {
                // 下载图片
                const file = await getImage(link);
                files.push(file);
                statusDiv.textContent = `已下载 ${files.length}/${links.length} 张图片`;
            } catch (error) {
                console.error(`下载链接 ${link} 失败:`, error);
                statusDiv.textContent = `下载链接 ${link} 失败: ${error.message}`;
            }
        }
        
        if (files.length === 0) {
            statusDiv.textContent = '没有成功下载任何图片！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 一次性添加所有文件到输入框
        statusDiv.textContent = `正在添加 ${files.length} 张图片到上传列表...`;
        addFilesToInput(fileInput, files);
        
        statusDiv.textContent = `已添加 ${files.length} 张图片到上传列表，请点击网站的上传按钮开始上传`;
        statusDiv.style.color = 'green';
    }
    
    // 提取图片链接
    function extractImageLinks() {
        const bbcodeInput = document.getElementById('imgbox-bbcode-input');
        const extractedLinksArea = document.getElementById('imgbox-extracted-links');
        
        const bbcode = bbcodeInput.value.trim();
        if (!bbcode) {
            showToast('请输入包含[IMG]标签的BB代码！', 'error');
            return;
        }
        
        // 提取[IMG]标签中的链接
        const imgRegex = /\[IMG\](.*?)\[\/IMG\]/gi;
        const matches = [];
        let match;
        
        while ((match = imgRegex.exec(bbcode)) !== null) {
            if (match[1]) {
                matches.push(match[1]);
            }
        }
        
        // 清空结果区域
        extractedLinksArea.innerHTML = '';
        
        if (matches.length === 0) {
            extractedLinksArea.innerHTML = '<div class="error">未找到任何图片链接！</div>';
            return;
        }
        
        // 显示提取的链接 - 只显示纯文本
        matches.forEach((link, index) => {
            const linkItem = document.createElement('div');
            linkItem.className = 'result-item';
            linkItem.innerHTML = `
                <div>
                    <a href="${link}" target="_blank">${link}</a>
                </div>
            `;
            extractedLinksArea.appendChild(linkItem);
        });
        
        // 显示提取结果
        extractedLinksArea.style.display = 'block';
    }
    
    // 从页面获取BB代码
    function getPageBBCode() {
        // 查找页面上的BB代码文本框
        const bbCodeElements = document.querySelectorAll('textarea[id="code-bb-full"]');
                
        if (bbCodeElements.length === 0) {
            showToast('未在页面上找到BB代码文本框！', 'error');
            return;
        }
        
        // 遍历所有可能的BB代码元素
        let bbCode = '';
        for (let i = 0; i < bbCodeElements.length; i++) {
            const element = bbCodeElements[i];
            const content = element.value || element.textContent;
            
            if (content && content.includes('[IMG]') && content.includes('[/IMG]')) {
                bbCode = content;
                break;
            }
        }
        
        if (!bbCode) {
            showToast('未在页面上找到包含[IMG]标签的BB代码！', 'error');
            return;
        }
        
        // 填充到BB代码输入框
        const bbcodeInput = document.getElementById('imgbox-bbcode-input');
        if (bbcodeInput) {
            bbcodeInput.value = bbCode;
            // 自动提取链接
            extractImageLinks();
        }
    }
    
    // 复制提取的链接
    function copyExtractedLinks() {
        const extractedLinksArea = document.getElementById('imgbox-extracted-links');
        const links = Array.from(extractedLinksArea.querySelectorAll('a')).map(a => a.href);
        
        if (links.length === 0) {
            showToast('没有可复制的链接！', 'error');
            return;
        }
        
        copyToClipboard(links.join('\n'));
    }
    
    // 获取图片文件
    async function getImage(url) {
        return new Promise((resolve, reject) => {
            try {
                // 尝试从URL中提取文件类型和文件名
                let fileType = 'image/jpeg'; // 默认类型
                let fileName = url.split('/').pop() || `image_${Date.now()}.jpg`;
                fileName = fileName.split('?')[0]; // 移除URL参数
                
                // 尝试从URL中提取文件扩展名
                const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i);
                if (extMatch) {
                    let ext = extMatch[1].toLowerCase();
                    if (ext === 'jpg') ext = 'jpeg';
                    fileType = `image/${ext}`;
                }
                
                // 添加随机参数避免缓存
                const nocacheUrl = url + (url.includes('?') ? '&' : '?') + 'nocache=' + Math.random();
                
                // 使用GM_xmlhttpRequest下载图片
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: nocacheUrl,
                    responseType: 'blob',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer': 'https://imgbox.com/',
                        'Origin': 'https://imgbox.com'
                    },
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 300) {
                            const blob = response.response;
                            // 确保文件名是唯一的
                            const uniqueFileName = `image_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
                            
                            // 如果不是PNG格式，转换为PNG
                            if (fileType !== 'image/png') {
                                convertToPng(blob).then(pngBlob => {
                                    // 创建File对象
                                    const file = new File([pngBlob], uniqueFileName, { type: 'image/png' });
                                    resolve(file);
                                }).catch(err => {
                                    // 如果转换失败，使用原始格式
                                    console.warn('PNG转换失败，使用原始格式:', err);
                                    const file = new File([blob], uniqueFileName.replace('.png', '.jpg'), { type: blob.type || fileType });
                                    resolve(file);
                                });
                            } else {
                                // 已经是PNG格式
                                const file = new File([blob], uniqueFileName, { type: blob.type || fileType });
                                resolve(file);
                            }
                        } else {
                            reject(new Error(`下载图片失败，HTTP状态码: ${response.status}`));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error(`下载图片请求失败: ${error}`));
                    }
                });
            } catch (error) {
                reject(new Error(`处理图片URL失败: ${error.message}`));
            }
        });
    }
    
    // 转换图片为PNG格式
    function convertToPng(imageBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('无法从画布创建PNG Blob'));
                        }
                    }, 'image/png');
                } catch (e) {
                    reject(e);
                }
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = URL.createObjectURL(imageBlob);
        });
    }
    
    // 将文件添加到文件输入框
    function addFileToInput(fileInput, file) {
        try {
            // 创建一个DataTransfer对象
            const dataTransfer = new DataTransfer();
            
            // 添加现有文件
            if (fileInput.files) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    dataTransfer.items.add(fileInput.files[i]);
                }
            }
            
            // 添加新文件
            dataTransfer.items.add(file);
            
            // 设置文件输入的files属性
            fileInput.files = dataTransfer.files;
            
            // 触发change事件
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        } catch (error) {
            console.error('添加文件到输入框失败:', error);
            // 尝试直接设置文件
            try {
                const newFiles = [file];
                fileInput.files = newFiles;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                console.error('直接设置文件也失败:', e);
            }
        }
    }
    
    // 批量添加文件到输入框
    function addFilesToInput(fileInput, files) {
        try {
            // 创建一个DataTransfer对象
            const dataTransfer = new DataTransfer();
            
            // 添加所有文件
            for (let i = 0; i < files.length; i++) {
                dataTransfer.items.add(files[i]);
            }
            
            // 设置文件输入的files属性
            fileInput.files = dataTransfer.files;
            
            // 触发change事件
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
            
            return true;
        } catch (error) {
            console.error('批量添加文件失败:', error);
            
            // 如果批量添加失败，尝试逐个添加
            try {
                // 清空现有文件
                fileInput.value = '';
                
                // 使用模拟点击方式逐个添加文件
                for (let i = 0; i < files.length; i++) {
                    // 尝试使用DataTransfer逐个添加
                    const singleTransfer = new DataTransfer();
                    singleTransfer.items.add(files[i]);
                    fileInput.files = singleTransfer.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                return true;
            } catch (e) {
                console.error('逐个添加文件也失败:', e);
                
                // 尝试使用模拟点击的方式
                alert('自动添加文件失败，请手动选择已下载的图片文件');
                return false;
            }
        }
    }
    
    // 监控上传结果
    function monitorUploadResults() {
        // 创建一个MutationObserver来监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            // 检查是否有上传完成的图片
            const uploadedImages = document.querySelectorAll('.image-container, .gallery-image, .thumbnail');
            
            if (uploadedImages.length > 0) {
                const resultArea = document.getElementById('imgbox-results');
                if (!resultArea) return;
                
                // 清空结果区域
                resultArea.innerHTML = '';
                
                // 收集所有图片链接
                uploadedImages.forEach(function(imgContainer) {
                    // 尝试找到图片链接
                    const linkElement = imgContainer.querySelector('a[href*="imgbox.com"]');
                    if (linkElement) {
                        const imageUrl = linkElement.href;
                        // 获取大图链接
                        const directLink = convertToDirectLink(imageUrl);
                        
                        // 创建结果项
                        const resultItem = document.createElement('div');
                        resultItem.className = 'result-item';
                        resultItem.innerHTML = `
                            <div style="display: flex; align-items: center;">
                                <img src="${directLink}" alt="上传图片">
                                <a href="${directLink}" target="_blank">${directLink}</a>
                            </div>
                        `;
                        resultArea.appendChild(resultItem);
                    }
                });
                
                // 显示自定义UI
                const customContainer = document.getElementById('custom-imgbox-container');
                if (customContainer && customContainer.style.display === 'none') {
                    customContainer.style.display = 'block';
                }
            }
        });
        
        // 开始观察整个文档的变化
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }
    
    // 将imgbox页面链接转换为直接图片链接
    function convertToDirectLink(pageUrl) {
        // 从页面URL中提取ID
        const idMatch = pageUrl.match(/imgbox\.com\/([a-zA-Z0-9]+)/);
        if (!idMatch) return pageUrl;
        
        const id = idMatch[1];
        
        // 尝试从页面中查找实际图片
        const imgElement = document.querySelector(`a[href*="${id}"] img, img[src*="${id}"]`);
        if (imgElement && imgElement.src) {
            // 如果找到图片元素，使用其src属性
            const src = imgElement.src;
            // 将缩略图URL转换为大图URL
            return src.replace('thumbs', 'images').replace('_t.', '_o.');
        }
        
        // 如果无法从页面中找到，构建一个可能的URL
        // 这里需要根据imgbox的实际URL格式进行调整
        const firstTwoChars = id.substring(0, 2);
        return `https://images2.imgbox.com/${firstTwoChars.split('').join('/')}/${id}_o.png`;
    }
    
    // 复制所有链接
    function copyAllLinks() {
        const resultArea = document.getElementById('imgbox-results');
        if (!resultArea) return;
        
        const links = Array.from(resultArea.querySelectorAll('a')).map(a => a.href);
        
        if (links.length === 0) {
            showToast('没有可复制的链接！', 'error');
            return;
        }
        
        copyToClipboard(links.join('\n'));
    }
    
    // 显示通知
    function showToast(message, type = 'info', duration = 3000) {
        // 创建或获取通知容器
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        // 创建通知元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.opacity = '1';
        container.appendChild(toast);
        
        // 定时移除通知
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                container.removeChild(toast);
                // 如果没有通知了，移除容器
                if (container.childNodes.length === 0) {
                    document.body.removeChild(container);
                }
            }, 300);
        }, duration);
    }
    
    // 复制到剪贴板
    function copyToClipboard(text) {
        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast(`已复制 ${text.split('\n').length} 个链接到剪贴板！`, 'success');
            } else {
                showToast('复制失败，请手动复制链接。', 'error');
            }
        } catch (err) {
            showToast('复制失败，请手动复制链接。', 'error');
        }
        
        document.body.removeChild(textarea);
    }
})();
