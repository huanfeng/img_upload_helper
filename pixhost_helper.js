// ==UserScript==
// @name         Pixhost图片上传助手
// @namespace    [http://tampermonkey.net/](http://tampermonkey.net/)
// @version      0.1
// @description  给 pixhost 添加在线链接上传功能, 支持图片格式转换
// @author       huanfeng
// @match        *://pixhost.to/
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @grant        GM_addStyle
// @connect      *
// @license      MIT
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
        
        /* 导航栏图标样式 */
        .helper-icon {
            display: inline-block;
            margin-right: 5px;
            width: 16px;
            height: 16px;
            vertical-align: middle;
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
        }
        
        .toast.info {
            background-color: #2196F3;
            border-left: 5px solid #0b7dda;
        }
        
        @keyframes fadeIn {
            from {opacity: 0;}
            to {opacity: 1;}
        }
        
        @keyframes fadeOut {
            from {opacity: 1;}
            to {opacity: 0;}
        }
        
        /* 自定义UI样式 */
        #custom-pixhost-container {
            background-color: #222;
            color: #ddd;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        #custom-pixhost-container textarea {
            width: 100%;
            height: 100px;
            background-color: #333;
            color: #ddd;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
            resize: vertical;
        }
        
        #custom-pixhost-container button {
            padding: 8px 15px;
            margin-right: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .orange-btn {
            background-color: #ff9800;
            color: white;
        }
        
        .orange-btn:hover {
            background-color: #e68a00;
        }
        
        .blue-btn {
            background-color: #2196F3;
            color: white;
        }
        
        .blue-btn:hover {
            background-color: #0b7dda;
        }
        
        .tab-container {
            background-color: #222;
            border: 1px solid #444;
        }
        
        .tab-buttons {
            display: flex;
            background-color: #2a2a2a;
        }
        
        .tab-button {
            padding: 12px 20px;
            background-color: #2a2a2a;
            border: none;
            color: #aaa;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
            font-weight: bold;
            flex: 1;
            text-align: center;
            border-right: 1px solid #333;
            border-bottom: 3px solid transparent;
        }
        
        .tab-button:last-child {
            border-right: none;
        }
        
        .tab-button:hover {
            color: white;
            background-color: #333;
        }
        
        .tab-button.active {
            color: white;
            background-color: #222;
            border-bottom: none;
        }
        
        .tab-button.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background-color: #ff9800;
        }
        
        .tab-content {
            padding: 20px;
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #ddd;
        }
        
        .format-container {
            margin: 10px 0;
            display: flex;
            align-items: center;
        }
    `);
    
    // 监听页面加载
    window.addEventListener('load', function() {
        // 检查是否在pixhost网站
        if (window.location.hostname.includes('pixhost.to')) {
            // 初始化脚本
            init();
        }
    });
    
    // 初始化脚本
    function init() {
        // 等待导航栏加载
        const waitForNav = setInterval(() => {
            const navUl = document.querySelector('nav.menu ul');
            if (navUl) {
                clearInterval(waitForNav);
                
                // 获取保存的UI显示状态
                const uiVisible = GM_getValue('uiVisible', false);
                
                // 创建新的导航项
                const navItem = document.createElement('li');
                const navLink = document.createElement('a');
                navLink.href = 'javascript:void(0);';
                navLink.id = 'pixhost-helper-link';
                
                // 创建图标
                const icon = document.createElement('span');
                icon.className = 'helper-icon';
                icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>`;
                
                // 添加图标和文本
                navLink.appendChild(icon);
                navLink.appendChild(document.createTextNode('图片助手'));
                navLink.title = '打开图片上传助手';
                navLink.style.color = uiVisible ? '#ff9800' : '#999';
                
                navLink.onclick = function(e) {
                    e.preventDefault();
                    toggleHelperUI();
                };
                
                navItem.appendChild(navLink);
                
                // 将导航项添加到导航栏
                navUl.appendChild(navItem);
                
                // 如果之前设置了显示，则自动创建界面
                if (uiVisible) {
                    // 直接创建 UI，不等待点击
                    addPixhostUI();
                }
            }
        }, 100);
    }
    
    // 切换助手 UI 显示状态
    function toggleHelperUI() {
        let customContainer = document.getElementById('custom-uploader-container');
        const helperLink = document.getElementById('pixhost-helper-link');
        
        if (!customContainer) {
            // 如果容器不存在，创建它
            addPixhostUI();
            customContainer = document.getElementById('custom-uploader-container');
            if (customContainer) {
                customContainer.style.display = 'block';
                if (helperLink) helperLink.style.color = '#ff9800';
                GM_setValue('uiVisible', true);
            }
        } else {
            // 如果容器已存在，切换其显示状态
            const newDisplayState = customContainer.style.display === 'none' ? 'block' : 'none';
            customContainer.style.display = newDisplayState;
            
            // 更新图标颜色和保存状态
            if (helperLink) helperLink.style.color = newDisplayState === 'block' ? '#ff9800' : '#999';
            GM_setValue('uiVisible', newDisplayState === 'block');
        }
    }
    
    // 激活标签页
    function activateTab(tabId) {
        // 隐藏所有标签内容
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // 重置所有标签按钮样式
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // 激活选中的标签页
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
            selectedTab.style.display = 'block';
        }
        
        // 激活对应的标签按钮
        const activeButton = document.querySelector(`.tab-button[data-tab-id="${tabId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // 将当前标签页ID保存到本地存储
        GM_setValue('activeTab', tabId);
    }
    
    // 将缩略图链接转换为原图直链
    function convertToDirectImageLink(thumbnailUrl) {
        // 转换规则: t12.pixhost.to/thumbs 替换为 img12.pixhost.to/images
        return thumbnailUrl.replace(/t(\d+)\.pixhost\.to\/thumbs/i, 'img$1.pixhost.to/images');
    }
    
    // 从 BB 代码中提取缩略图链接并转换为直链
    function extractDirectLinks(bbcode) {
        if (!bbcode || !bbcode.trim()) {
            showToast('请输入缩略图 BB 代码', 'error');
            return;
        }
        
        // 使用正则表达式提取缩略图链接
        // 匹配 [url=...][img]https://t12.pixhost.to/thumbs/...[/img][/url] 格式
        const regex = /\[url=([^\]]+)\]\[img\]([^\]]+)\[\/img\]\[\/url\]/gi;
        const matches = [];
        let match;
        
        while ((match = regex.exec(bbcode)) !== null) {
            if (match[2] && match[2].trim() && match[2].includes('pixhost.to/thumbs')) {
                // 将缩略图链接转换为直链
                const thumbnailUrl = match[2].trim();
                const directUrl = convertToDirectImageLink(thumbnailUrl);
                
                matches.push({
                    original: match[0],         // 原始 BB 代码
                    pageUrl: match[1].trim(),  // 图片页面链接
                    thumbUrl: thumbnailUrl,    // 缩略图链接
                    directUrl: directUrl       // 直链
                });
            }
        }
        
        if (matches.length === 0) {
            showToast('没有找到有效的 Pixhost 缩略图链接', 'error');
            return;
        }
        
        // 显示提取结果
        displayExtractResults(matches);
        
        // 显示复制按钮
        const copyDirectLinksButton = document.querySelector('#extract-tab .blue-btn:nth-child(1)');
        const copyBBCodeButton = document.querySelector('#extract-tab .blue-btn:nth-child(2)');
        
        if (copyDirectLinksButton) copyDirectLinksButton.style.display = 'block';
        if (copyBBCodeButton) copyBBCodeButton.style.display = 'block';
        
        // 自动复制直链
        if (copyDirectLinksButton && GM_getValue('autoUpload', false)) {
            setTimeout(() => {
                copyDirectLinksButton.click();
            }, 500);
        }
        
        showToast(`已提取并转换 ${matches.length} 个图片直链`, 'success');
        
        // 将提取结果保存到全局变量中，便于后续复制
        window.extractedLinks = matches;
    }
    
    // 自动从当前页面提取图片直链
    function autoExtractFromPage() {
        // 尝试查找页面上的 BB 代码输入框
        const bbInput = document.querySelector('input.bb[type="text"]');
        
        if (bbInput && bbInput.value) {
            // 将提取到的 BB 代码填入到输入框
            const bbcodeInput = document.getElementById('pixhost-bbcode-input');
            if (bbcodeInput) {
                bbcodeInput.value = bbInput.value;
                // 自动提取直链
                extractDirectLinks(bbInput.value);
                showToast('已自动提取当前页面的图片直链', 'success');
            }
        } else {
            // 如果没有找到 BB 代码输入框，尝试查找画廊元素
            const galleryDiv = document.querySelector('#gallery .images');
            
            if (galleryDiv) {
                // 构建 BB 代码
                let bbcode = '';
                const links = galleryDiv.querySelectorAll('a');
                
                links.forEach(link => {
                    const img = link.querySelector('img');
                    if (link.href && img && img.src) {
                        bbcode += `[url=${link.href}][img]${img.src}[/img][/url] `;
                    }
                });
                
                if (bbcode) {
                    const bbcodeInput = document.getElementById('pixhost-bbcode-input');
                    if (bbcodeInput) {
                        bbcodeInput.value = bbcode;
                        // 自动提取直链
                        extractDirectLinks(bbcode);
                        showToast('已自动构建并提取当前页面的图片直链', 'success');
                    }
                } else {
                    showToast('当前页面没有找到可用的图片元素', 'error');
                }
            } else {
                showToast('当前页面没有找到 BB 代码或画廊元素', 'error');
            }
        }
    }
    
    // 显示提取结果
    function displayExtractResults(matches) {
        const resultArea = document.getElementById('pixhost-extract-result');
        if (!resultArea) return;
        
        resultArea.innerHTML = '';
        
        // 创建直链列表
        const directLinksTitle = document.createElement('div');
        directLinksTitle.textContent = '原图直链:';
        directLinksTitle.style.cssText = 'font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #ff9800;';
        resultArea.appendChild(directLinksTitle);
        
        const directLinksList = document.createElement('div');
        directLinksList.style.cssText = 'margin-bottom: 15px;';
        
        matches.forEach((item, index) => {
            const linkItem = document.createElement('div');
            linkItem.style.cssText = 'margin-bottom: 5px; display: flex; align-items: center;';
            
            const linkNumber = document.createElement('span');
            linkNumber.textContent = `${index + 1}. `;
            linkNumber.style.cssText = 'margin-right: 5px; color: #aaa;';
            
            const linkAnchor = document.createElement('a');
            linkAnchor.href = item.directUrl;
            linkAnchor.textContent = item.directUrl;
            linkAnchor.target = '_blank';
            linkAnchor.style.cssText = 'color: #2196F3; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;';
            
            linkItem.appendChild(linkNumber);
            linkItem.appendChild(linkAnchor);
            directLinksList.appendChild(linkItem);
        });
        
        resultArea.appendChild(directLinksList);
        
        // 创建 BB 代码预览
        const bbcodeTitle = document.createElement('div');
        bbcodeTitle.textContent = '原图 BB 代码:';
        bbcodeTitle.style.cssText = 'font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #ff9800;';
        resultArea.appendChild(bbcodeTitle);
        
        const bbcodePreview = document.createElement('div');
        bbcodePreview.style.cssText = 'background-color: #333; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; color: #ddd; font-family: monospace; max-height: 150px; overflow-y: auto;';
        
        // 构建新的 BB 代码，使用直链
        const newBBCode = matches.map(item => `[img]${item.directUrl}[/img]`).join('\n');
        bbcodePreview.textContent = newBBCode;
        
        resultArea.appendChild(bbcodePreview);
    }
    
    // 复制直链
    function copyDirectLinks() {
        if (!window.extractedLinks || window.extractedLinks.length === 0) {
            showToast('没有可复制的直链', 'error');
            return;
        }
        
        const directLinks = window.extractedLinks.map(item => item.directUrl).join('\n');
        copyToClipboard(directLinks);
    }
    
    // 复制 BB 代码
    function copyBBCode() {
        if (!window.extractedLinks || window.extractedLinks.length === 0) {
            showToast('没有可复制的 BB 代码', 'error');
            return;
        }
        
        const bbcode = window.extractedLinks.map(item => `[img]${item.directUrl}[/img]`).join('\n');
        copyToClipboard(bbcode);
    }
    
    // 复制到剪贴板
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('已复制到剪贴板', 'success');
            } else {
                showToast('复制失败', 'error');
            }
        } catch (err) {
            showToast('复制失败: ' + err, 'error');
        }
        
        document.body.removeChild(textarea);
    }
    
    // 添加Pixhost界面UI
    function addPixhostUI(initialLinks) {
        // 查找上传表单区域
        const uploadForm = document.querySelector('#newuploader') || 
                          document.querySelector('#content');
        
        if (!uploadForm) {
            console.error('未找到上传表单');
            return;
        }
        
        // 创建自定义UI容器
        const customContainer = document.createElement('div');
        customContainer.id = 'custom-pixhost-container';
        
        // 根据保存的状态决定是否显示
        const uiVisible = GM_getValue('uiVisible', false);
        customContainer.style.display = uiVisible ? 'block' : 'none';
        
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
        uploadTabButton.dataset.tabId = 'upload-tab';
        uploadTabButton.onclick = function() {
            activateTab('upload-tab');
        };
        tabButtons.appendChild(uploadTabButton);
        
        // 提取直链标签按钮
        const extractTabButton = document.createElement('button');
        extractTabButton.className = 'tab-button';
        extractTabButton.textContent = '提取图片直链';
        extractTabButton.dataset.tabId = 'extract-tab';
        extractTabButton.onclick = function() {
            activateTab('extract-tab');
        };
        tabButtons.appendChild(extractTabButton);
        
        // 创建上传标签内容
        const uploadTabContent = document.createElement('div');
        uploadTabContent.id = 'upload-tab';
        uploadTabContent.className = 'tab-content active';
        tabContainer.appendChild(uploadTabContent);
        
        // 创建提取直链标签内容
        const extractTabContent = document.createElement('div');
        extractTabContent.id = 'extract-tab';
        extractTabContent.className = 'tab-content';
        tabContainer.appendChild(extractTabContent);
        
        // 创建提取直链输入区域
        const extractLabel = document.createElement('div');
        extractLabel.textContent = '请输入或粘贴缩略图 BB 代码:';
        extractLabel.className = 'section-title';
        extractTabContent.appendChild(extractLabel);
        
        const bbcodeInput = document.createElement('textarea');
        bbcodeInput.id = 'pixhost-bbcode-input';
        bbcodeInput.placeholder = '请输入或粘贴 Pixhost 缩略图 BB 代码，例如: [url=...][img]https://t12.pixhost.to/thumbs/...[/img][/url]';
        bbcodeInput.style.cssText = 'width: 100%; height: 100px; background-color: #333; color: #ddd; border: 1px solid #444; border-radius: 4px; padding: 10px; margin-bottom: 10px; resize: vertical;';
        extractTabContent.appendChild(bbcodeInput);
        
        // 创建提取直链按钮容器
        const extractButtonContainer = document.createElement('div');
        extractButtonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
        extractTabContent.appendChild(extractButtonContainer);
        
        // 创建提取按钮
        const extractButton = document.createElement('button');
        extractButton.textContent = '提取并转换为直链';
        extractButton.type = 'button';
        extractButton.className = 'orange-btn';
        extractButton.onclick = function() {
            extractDirectLinks(bbcodeInput.value);
        };
        extractButtonContainer.appendChild(extractButton);
        
        // 创建清空按钮
        const clearExtractButton = document.createElement('button');
        clearExtractButton.textContent = '清空';
        clearExtractButton.type = 'button';
        clearExtractButton.className = 'btn';
        clearExtractButton.style.cssText = 'background-color: #444; color: #fff; border: 1px solid #555;';
        clearExtractButton.onclick = function() {
            bbcodeInput.value = '';
            const resultArea = document.getElementById('pixhost-extract-result');
            if (resultArea) resultArea.innerHTML = '';
            showToast('已清空输入内容', 'info');
        };
        extractButtonContainer.appendChild(clearExtractButton);
        
        // 创建自动获取按钮
        const autoExtractButton = document.createElement('button');
        autoExtractButton.textContent = '自动获取当前页面代码';
        autoExtractButton.type = 'button';
        autoExtractButton.className = 'blue-btn';
        autoExtractButton.onclick = function() {
            autoExtractFromPage();
        };
        extractButtonContainer.appendChild(autoExtractButton);
        
        // 创建提取结果区域
        const extractResultContainer = document.createElement('div');
        extractResultContainer.style.cssText = 'margin-top: 15px;';
        extractTabContent.appendChild(extractResultContainer);
        
        const resultLabel = document.createElement('div');
        resultLabel.textContent = '提取结果:';
        resultLabel.className = 'section-title';
        extractResultContainer.appendChild(resultLabel);
        
        const resultArea = document.createElement('div');
        resultArea.id = 'pixhost-extract-result';
        resultArea.style.cssText = 'margin-top: 10px; max-height: 300px; overflow-y: auto;';
        extractResultContainer.appendChild(resultArea);
        
        // 创建复制按钮容器
        const copyButtonContainer = document.createElement('div');
        copyButtonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
        extractResultContainer.appendChild(copyButtonContainer);
        
        // 创建复制直链按钮
        const copyDirectLinksButton = document.createElement('button');
        copyDirectLinksButton.textContent = '复制直链';
        copyDirectLinksButton.type = 'button';
        copyDirectLinksButton.className = 'blue-btn';
        copyDirectLinksButton.style.display = 'none'; // 初始隐藏
        copyDirectLinksButton.onclick = function() {
            copyDirectLinks();
        };
        copyButtonContainer.appendChild(copyDirectLinksButton);
        
        // 创建复制BB代码按钮
        const copyBBCodeButton = document.createElement('button');
        copyBBCodeButton.textContent = '复制BB代码';
        copyBBCodeButton.type = 'button';
        copyBBCodeButton.className = 'blue-btn';
        copyBBCodeButton.style.display = 'none'; // 初始隐藏
        copyBBCodeButton.onclick = function() {
            copyBBCode();
        };
        copyButtonContainer.appendChild(copyBBCodeButton);
        
        // 创建链接输入区域
        const inputLabel = document.createElement('div');
        inputLabel.textContent = '请输入图片链接（每行一个）:';
        inputLabel.className = 'section-title';
        uploadTabContent.appendChild(inputLabel);
        
        const linksInput = document.createElement('textarea');
        linksInput.id = 'pixhost-links-input';
        linksInput.placeholder = '请输入图片链接，每行一个链接';
        uploadTabContent.appendChild(linksInput);
        
        // 创建格式转换选项
        const formatContainer = document.createElement('div');
        formatContainer.className = 'format-container';
        formatContainer.style.cssText = 'margin: 10px 0; display: flex; align-items: center;';
        
        const formatLabel = document.createElement('label');
        formatLabel.textContent = '图片格式转换: ';
        formatLabel.style.marginRight = '10px';
        formatContainer.appendChild(formatLabel);
        
        const formatSelect = document.createElement('select');
        formatSelect.id = 'pixhost-format-select';
        formatSelect.style.cssText = 'padding: 5px; background-color: #333; color: white; border: 1px solid #444; border-radius: 4px;';
        
        const formats = [
            { value: 'original', text: '保持原始格式' },
            { value: 'png-lossless', text: '转换为 PNG (无损压缩)' },
            { value: 'png-8bit', text: '转换为 PNG (8位色彩)' },
            { value: 'jpeg-high', text: '转换为 JPEG (95%)' },
            { value: 'jpeg-medium', text: '转换为 JPEG (85%)' },
            { value: 'jpeg-low', text: '转换为 JPEG (75%)' }
        ];
        
        formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.value;
            option.textContent = format.text;
            formatSelect.appendChild(option);
        });
        
        // 从本地存储中读取默认格式
        const savedFormat = GM_getValue('imageFormat', 'original');
        formatSelect.value = savedFormat;
        
        // 保存选择的格式
        formatSelect.onchange = function() {
            GM_setValue('imageFormat', this.value);
        };
        
        formatContainer.appendChild(formatSelect);
        uploadTabContent.appendChild(formatContainer);
        
        // 创建自动上传选项
        const autoUploadContainer = document.createElement('div');
        autoUploadContainer.className = 'auto-upload-container';
        autoUploadContainer.style.cssText = 'margin: 10px 0; display: flex; align-items: center;';
        
        const autoUploadCheckbox = document.createElement('input');
        autoUploadCheckbox.type = 'checkbox';
        autoUploadCheckbox.id = 'pixhost-auto-upload';
        autoUploadCheckbox.style.marginRight = '5px';
        
        // 从本地存储中读取自动上传设置
        const autoUploadEnabled = GM_getValue('autoUpload', false);
        autoUploadCheckbox.checked = autoUploadEnabled;
        
        // 保存自动上传设置
        autoUploadCheckbox.onchange = function() {
            GM_setValue('autoUpload', this.checked);
        };
        
        const autoUploadLabel = document.createElement('label');
        autoUploadLabel.textContent = '自动上传';
        autoUploadLabel.htmlFor = 'pixhost-auto-upload';
        autoUploadLabel.style.cursor = 'pointer';
        
        autoUploadContainer.appendChild(autoUploadCheckbox);
        autoUploadContainer.appendChild(autoUploadLabel);
        uploadTabContent.appendChild(autoUploadContainer);
        
        // 创建按钮容器
        const uploadButtonContainer = document.createElement('div');
        uploadButtonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
        uploadTabContent.appendChild(uploadButtonContainer);
        
        // 创建下载按钮
        const downloadButton = document.createElement('button');
        downloadButton.textContent = '下载图片并添加到上传列表';
        downloadButton.type = 'button';
        downloadButton.className = 'orange-btn';
        downloadButton.onclick = function() {
            processImageLinks(linksInput.value);
        };
        uploadButtonContainer.appendChild(downloadButton);
        
        // 创建清空按钮
        const clearUploadButton = document.createElement('button');
        clearUploadButton.textContent = '清空';
        clearUploadButton.type = 'button';
        clearUploadButton.className = 'btn';
        clearUploadButton.style.cssText = 'background-color: #444; color: #fff; border: 1px solid #555;';
        clearUploadButton.onclick = function() {
            linksInput.value = '';
            const statusDiv = document.getElementById('pixhost-status');
            if (statusDiv) statusDiv.innerHTML = '';
            showToast('已清空输入内容', 'info');
        };
        uploadButtonContainer.appendChild(clearUploadButton);
        
        // 创建状态显示区域
        const statusDiv = document.createElement('div');
        statusDiv.id = 'pixhost-status';
        uploadTabContent.appendChild(statusDiv);
        
        // 将自定义容器插入到上传表单之前
        uploadForm.parentNode.insertBefore(customContainer, uploadForm);
        
        // 如果有初始链接，自动处理
        if (initialLinks && typeof initialLinks === 'string' && initialLinks.trim()) {
            setTimeout(() => {
                processImageLinks(initialLinks);
            }, 1500);
        }
        
        // 激活默认标签页
        const defaultTabId = GM_getValue('activeTab', 'upload-tab');
        activateTab(defaultTabId);
    }
    
    // 处理图片链接
    async function processImageLinks(linksText) {
        const statusDiv = document.getElementById('pixhost-status');
        statusDiv.style.display = 'block';
        statusDiv.textContent = '准备处理图片链接...';
        statusDiv.style.color = '#ff9800'; // 设置为统一的颜色
        
        // 解析链接
        const links = linksText.trim().split(/[\n,]/).filter(link => link.trim() !== '');
        
        if (links.length === 0) {
            statusDiv.textContent = '请输入至少一个图片链接！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 查找plupload上传组件
        const pluploadContainer = document.querySelector('.plupload_filelist_content');
        if (!pluploadContainer) {
            statusDiv.textContent = '未找到上传组件！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 先收集所有文件
        statusDiv.textContent = `开始处理 ${links.length} 个图片链接...`;
        statusDiv.style.color = '#ff9800'; // 设置为统一的颜色
        const files = [];
        
        for (let i = 0; i < links.length; i++) {
            const link = links[i].trim();
            if (!link) continue;
            
            statusDiv.textContent = `下载第 ${i+1}/${links.length} 个图片: ${link}`;
            statusDiv.style.color = '#ff9800'; // 设置为统一的颜色
            
            try {
                // 下载图片
                const file = await getImage(link);
                files.push(file);
                statusDiv.textContent = `已下载 ${files.length}/${links.length} 张图片`;
                statusDiv.style.color = '#ff9800'; // 设置为统一的颜色
            } catch (error) {
                console.error(`下载链接 ${link} 失败:`, error);
                statusDiv.textContent = `下载链接 ${link} 失败: ${error.message}`;
                statusDiv.style.color = 'red';
            }
        }
        
        if (files.length === 0) {
            statusDiv.textContent = '没有成功下载任何图片！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // 添加文件到plupload上传队列
        statusDiv.textContent = `正在添加 ${files.length} 张图片到上传列表...`;
        statusDiv.style.color = '#ff9800'; // 设置为统一的颜色
        
        try {
            // 使用 DataTransfer API 直接操作文件输入元素
            // 这种方法更可靠，不依赖于查找 plupload 实例
            
            // 创建 DataTransfer 对象
            const container = new DataTransfer();
            
            // 添加文件到 DataTransfer 对象
            for (let i = 0; i < files.length; i++) {
                container.items.add(files[i]);
            }
            
            // 查找文件输入元素
            const fileInput = document.querySelector('input[type="file"]');
            if (!fileInput) {
                throw new Error('未找到文件输入元素');
            }
            
            // 设置文件输入元素的文件列表
            fileInput.files = container.files;
            
            // 触发 change 事件
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
            
            // 设置缩略图大小和画廊选项
            setTimeout(() => {
                try {
                    // 设置缩略图大小
                    const thumbSizeInput = document.querySelector('input.max_th_size');
                    if (thumbSizeInput) {
                        thumbSizeInput.value = '350';
                        thumbSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    // 选中画廊选项
                    const galleryBox = document.querySelector('#gallery_box');
                    if (galleryBox && !galleryBox.checked) {
                        galleryBox.checked = true;
                        galleryBox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    // 设置画廊名称
                    const galleryNameInput = document.querySelector('input[name="gallery_name"]');
                    if (galleryNameInput) {
                        // 使用当前日期作为默认画廊名称
                        const today = new Date();
                        const defaultName = `Gallery_${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                        galleryNameInput.value = defaultName;
                        galleryNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    // 检查是否需要自动上传
                    const autoUploadEnabled = GM_getValue('autoUpload', false);
                    if (autoUploadEnabled) {
                        // 检查是否有超大文件
                        const hasOversizedFiles = files.some(file => file.oversized === true);
                        
                        if (hasOversizedFiles) {
                            showToast('检测到有文件超过10MB，已取消自动上传', 'warning');
                            console.warn('取消自动上传：有文件超过10MB');
                        } else {
                            // 查找上传按钮并模拟点击
                            setTimeout(() => {
                                const uploadButton = document.querySelector('#newuploader_start, .plupload_start');
                                if (uploadButton && !uploadButton.classList.contains('ui-state-disabled')) {
                                    uploadButton.click();
                                    showToast('已自动开始上传', 'info');
                                } else {
                                    console.log('上传按钮不可用或未找到');
                                }
                            }, 1000); // 等待一秒确保文件已添加到队列
                        }
                    }
                } catch (e) {
                    console.error('设置上传选项时出错:', e);
                }
            }, 500);
            
            statusDiv.textContent = `已添加 ${files.length} 张图片到上传列表，请点击网站的上传按钮开始上传`;
            statusDiv.style.color = 'green';
            
            // 显示提示
            showToast(`已添加 ${files.length} 张图片到上传列表`, 'success');
        } catch (error) {
            console.error('添加文件到上传队列失败:', error);
            statusDiv.textContent = `添加文件到上传队列失败: ${error.message}`;
            statusDiv.style.color = 'red';
        }
    }
    
    // 下载图片并转换格式
    async function getImage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: async function(response) {
                    try {
                        if (response.status !== 200) {
                            reject(new Error(`HTTP错误: ${response.status}`));
                            return;
                        }
                        
                        // 获取MIME类型
                        const contentType = response.response.type;
                        
                        // 检查是否是图片
                        if (!contentType.startsWith('image/')) {
                            reject(new Error(`不是有效的图片: ${contentType}`));
                            return;
                        }
                        
                        // 获取文件扩展名
                        let extension = contentType.split('/')[1];
                        if (extension === 'jpeg') extension = 'jpg';
                        
                        // 获取文件名
                        let filename = url.split('/').pop().split('?')[0];
                        if (!filename.includes('.')) {
                            filename = `image.${extension}`;
                        }
                        
                        // 获取选择的格式
                        const formatSelect = document.getElementById('pixhost-format-select');
                        const selectedFormat = formatSelect ? formatSelect.value : 'original';
                        
                        let blob = response.response;
                        
                        // 根据选择的格式转换图片
                        if (selectedFormat !== 'original') {
                            try {
                                // 确定目标格式
                                let targetFormat;
                                let newExtension;
                                
                                if (selectedFormat.startsWith('png')) {
                                    targetFormat = 'image/png';
                                    newExtension = 'png';
                                } else if (selectedFormat.startsWith('jpeg')) {
                                    targetFormat = 'image/jpeg';
                                    newExtension = 'jpg';
                                }
                                
                                // 转换图片
                                blob = await convertToFormat(blob, targetFormat);
                                
                                // 更新文件扩展名
                                filename = filename.replace(/\.[^.]+$/, `.${newExtension}`);
                                
                                // 检查文件大小
                                if (blob.size > 10 * 1024 * 1024) { // 大于10MB
                                    console.warn(`图片转换后大小为 ${(blob.size / (1024 * 1024)).toFixed(2)}MB，超过Pixhost限制`);
                                    showToast(`警告: 图片大小为 ${(blob.size / (1024 * 1024)).toFixed(2)}MB，超过10MB限制，可能上传失败`, 'warning');
                                    
                                    // 如果文件超过10MB，设置标记以阻止自动上传
                                    file.oversized = true;
                                }
                            } catch (error) {
                                console.error('格式转换失败:', error);
                                // 如果转换失败，使用原始格式
                            }
                        }
                        
                        // 创建File对象
                        const file = new File([blob], filename, { type: blob.type });
                        resolve(file);
                    } catch (error) {
                        reject(new Error(`处理图片URL失败: ${error.message}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error(`下载图片失败: ${error.message || '网络错误'}`));
                },
                ontimeout: function() {
                    reject(new Error('下载图片超时'));
                }
            });
        });
    }
    
    // 通用图片格式转换函数
    function convertToFormat(imageBlob, targetFormat) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // 创建画布
                    const canvas = document.createElement('canvas');
                    
                    // 获取选择的格式
                    const formatSelect = document.getElementById('pixhost-format-select');
                    const selectedFormat = formatSelect ? formatSelect.value : 'original';
                    
                    // 保持原始尺寸
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // 如果转换为 JPEG，设置白色背景（因为 JPEG 不支持透明度）
                    if (targetFormat === 'image/jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // 绘制图片，保持原始尺寸
                    ctx.drawImage(img, 0, 0);
                    
                    // 设置转换质量
                    let quality = null;
                    
                    if (targetFormat === 'image/jpeg') {
                        // JPEG 质量设置
                        if (selectedFormat === 'jpeg-high') {
                            quality = 0.95;
                        } else if (selectedFormat === 'jpeg-medium') {
                            quality = 0.85;
                        } else if (selectedFormat === 'jpeg-low') {
                            quality = 0.75;
                        }
                    } else if (targetFormat === 'image/png') {
                        // PNG 质量设置 - 使用颜色量化来减小文件大小
                        // 注意：canvas.toBlob 对 PNG 的 quality 参数没有标准实现
                        
                        // 如果是8位色彩模式，使用颜色量化到256色
                        if (selectedFormat === 'png-8bit') {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            
                            // 将颜色量化为8位颜色（每个通道只有256/8=32个可能的值）
                            for (let i = 0; i < data.length; i += 4) {
                                // 使用位运算来加速计算，相当于除以8然后乘3
                                data[i] = (data[i] >> 3) << 3;     // R
                                data[i + 1] = (data[i + 1] >> 3) << 3; // G
                                data[i + 2] = (data[i + 2] >> 3) << 3; // B
                            }
                            
                            ctx.putImageData(imageData, 0, 0);
                        }
                        // 如果是4位色彩模式，使用颜色量化到16色
                        else if (selectedFormat === 'png-4bit') {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            
                            // 将颜色量化为4位颜色（每个通道只有4个可能的值）
                            for (let i = 0; i < data.length; i += 4) {
                                // 使用位运算来加速计算，相当于除以64然后乘64
                                data[i] = (data[i] >> 6) << 6;     // R
                                data[i + 1] = (data[i + 1] >> 6) << 6; // G
                                data[i + 2] = (data[i + 2] >> 6) << 6; // B
                                
                                // 对于非完全透明的像素，将透明度也量化为二值（完全透明或完全不透明）
                                if (data[i + 3] < 128) {
                                    data[i + 3] = 0; // 完全透明
                                } else {
                                    data[i + 3] = 255; // 完全不透明
                                }
                            }
                            
                            ctx.putImageData(imageData, 0, 0);
                        }
                    }
                    
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error(`无法从画布创建 ${targetFormat} Blob`));
                        }
                    }, targetFormat, quality);
                } catch (e) {
                    reject(e);
                }
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = URL.createObjectURL(imageBlob);
        });
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
        toast.style.opacity = '0';
        
        // 添加到容器
        container.appendChild(toast);
        
        // 显示通知
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // 设置自动消失
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
})();