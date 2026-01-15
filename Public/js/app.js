// ============================================
// Universal Video Downloader - Frontend App
// ============================================

class VideoDownloader {
    constructor() {
        this.currentPlatform = null;
        this.currentContentType = null;
        this.currentInputType = 'url';
        this.selectedBatchItems = new Set();
        
        this.platformContentTypes = {
            youtube: [
                { id: 'video', name: 'Video', icon: 'fa-play-circle' },
                { id: 'shorts', name: 'Shorts', icon: 'fa-mobile-alt' },
                { id: 'playlist', name: 'Playlist', icon: 'fa-list' },
                { id: 'audio', name: 'Audio Only', icon: 'fa-music' }
            ],
            instagram: [
                { id: 'post', name: 'Post', icon: 'fa-image' },
                { id: 'reel', name: 'Reel', icon: 'fa-film' },
                { id: 'story', name: 'Story', icon: 'fa-clock' },
                { id: 'profile', name: 'Profile', icon: 'fa-user' },
                { id: 'highlights', name: 'Highlights', icon: 'fa-star' }
            ],
            facebook: [
                { id: 'video', name: 'Video', icon: 'fa-video' },
                { id: 'reel', name: 'Reel', icon: 'fa-film' },
                { id: 'story', name: 'Story', icon: 'fa-clock' }
            ],
            tiktok: [
                { id: 'video', name: 'Video', icon: 'fa-video' },
                { id: 'profile', name: 'Profile Videos', icon: 'fa-user' }
            ],
            twitter: [
                { id: 'video', name: 'Video', icon: 'fa-video' },
                { id: 'gif', name: 'GIF', icon: 'fa-file-image' }
            ],
            whatsapp: [
                { id: 'status', name: 'Status', icon: 'fa-circle' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initTheme();
        this.initFAQ();
    }
    
    bindEvents() {
        // Platform selection
        document.querySelectorAll('.platform-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectPlatform(e.currentTarget));
        });
        
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Input tabs
        document.querySelectorAll('.input-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchInputType(e.currentTarget));
        });
        
        // Paste button
        document.getElementById('pasteBtn')?.addEventListener('click', () => this.pasteFromClipboard());
        
        // Fetch button
        document.getElementById('fetchBtn')?.addEventListener('click', () => this.fetchMedia());
        
        // Retry button
        document.getElementById('retryBtn')?.addEventListener('click', () => this.reset());
        
        // Batch controls
        document.getElementById('selectAllBtn')?.addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => this.downloadSelected());
        
        // Enter key support
        document.getElementById('mediaUrl')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchMedia();
        });
        
        document.getElementById('username')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchMedia();
        });
    }
    
    // ============================================
    // Platform & Content Type Selection
    // ============================================
    
    selectPlatform(card) {
        // Remove active from all
        document.querySelectorAll('.platform-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        this.currentPlatform = card.dataset.platform;
        this.showContentTypes();
        
        // Show/hide username tab based on platform
        const usernameTab = document.getElementById('usernameTab');
        if (['instagram', 'tiktok'].includes(this.currentPlatform)) {
            usernameTab?.classList.remove('hidden');
        } else {
            usernameTab?.classList.add('hidden');
            this.switchInputType(document.querySelector('.input-tab[data-input="url"]'));
        }
    }
    
    showContentTypes() {
        const selector = document.getElementById('contentTypeSelector');
        const grid = document.getElementById('contentTypeGrid');
        
        if (!selector || !grid) return;
        
        const types = this.platformContentTypes[this.currentPlatform];
        
        grid.innerHTML = types.map(type => `
            <div class="content-type-card" data-type="${type.id}">
                <i class="fas ${type.icon}"></i>
                <span>${type.name}</span>
            </div>
        `).join('');
        
        // Bind events
        grid.querySelectorAll('.content-type-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectContentType(e.currentTarget));
        });
        
        selector.classList.remove('hidden');
    }
    
    selectContentType(card) {
        document.querySelectorAll('.content-type-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        this.currentContentType = card.dataset.type;
        document.getElementById('inputSection')?.classList.remove('hidden');
        
        // Update placeholder based on content type
        this.updatePlaceholder();
    }
    
    updatePlaceholder() {
        const urlInput = document.getElementById('mediaUrl');
        const usernameInput = document.getElementById('username');
        
        const placeholders = {
            youtube: {
                video: 'https://www.youtube.com/watch?v=...',
                shorts: 'https://www.youtube.com/shorts/...',
                playlist: 'https://www.youtube.com/playlist?list=...',
                audio: 'https://www.youtube.com/watch?v=...'
            },
            instagram: {
                post: 'https://www.instagram.com/p/...',
                reel: 'https://www.instagram.com/reel/...',
                story: 'https://www.instagram.com/stories/...',
                profile: 'https://www.instagram.com/username/',
                highlights: 'https://www.instagram.com/stories/highlights/...'
            },
            facebook: {
                video: 'https://www.facebook.com/watch?v=...',
                reel: 'https://www.facebook.com/reel/...',
                story: 'https://www.facebook.com/stories/...'
            },
            tiktok: {
                video: 'https://www.tiktok.com/@user/video/...',
                profile: 'https://www.tiktok.com/@username'
            },
            twitter: {
                video: 'https://twitter.com/user/status/...',
                gif: 'https://twitter.com/user/status/...'
            }
        };
        
        if (urlInput && placeholders[this.currentPlatform]) {
            urlInput.placeholder = placeholders[this.currentPlatform][this.currentContentType] || 'Paste URL here...';
        }
        
        if (usernameInput) {
            usernameInput.placeholder = `Enter ${this.currentPlatform} username`;
        }
    }
    
    // ============================================
    // Input Handling
    // ============================================
    
    switchInputType(tab) {
        if (!tab) return;
        
        document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        this.currentInputType = tab.dataset.input;
        
        const urlInput = document.getElementById('urlInput');
        const usernameInput = document.getElementById('usernameInput');
        
        if (this.currentInputType === 'url') {
            urlInput?.classList.remove('hidden');
            usernameInput?.classList.add('hidden');
        } else {
            urlInput?.classList.add('hidden');
            usernameInput?.classList.remove('hidden');
        }
    }
    
    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            document.getElementById('mediaUrl').value = text;
            this.showToast('URL pasted from clipboard', 'success');
        } catch (err) {
            this.showToast('Failed to paste from clipboard', 'error');
        }
    }
    
    // ============================================
    // API Calls
    // ============================================
    
    async fetchMedia() {
        const input = this.currentInputType === 'url' 
            ? document.getElementById('mediaUrl')?.value.trim()
            : document.getElementById('username')?.value.trim();
        
        if (!input) {
            this.showToast('Please enter a URL or username', 'warning');
            return;
        }
        
        if (!this.currentPlatform || !this.currentContentType) {
            this.showToast('Please select a platform and content type', 'warning');
            return;
        }
        
        const quality = document.querySelector('input[name="quality"]:checked')?.value || '1080';
        const includeAudio = document.getElementById('includeAudio')?.checked ?? true;
        const removeWatermark = document.getElementById('removeWatermark')?.checked ?? true;
        
        this.showLoading();
        
        try {
            const response = await fetch(`/api/${this.currentPlatform}/fetch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input,
                    inputType: this.currentInputType,
                    contentType: this.currentContentType,
                    quality,
                    includeAudio,
                    removeWatermark
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch media');
            }
            
            if (data.type === 'batch' || data.type === 'profile') {
                this.displayBatchResults(data);
            } else {
                this.displayResult(data);
            }
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    // ============================================
    // Display Results
    // ============================================
    
    displayResult(data) {
        this.hideLoading();
        
        const resultSection = document.getElementById('resultsSection');
        const resultCard = document.getElementById('resultCard');
        
        if (!resultSection || !resultCard) return;
        
        const duration = data.duration ? this.formatDuration(data.duration) : null;
        const fileSize = data.fileSize ? this.formatFileSize(data.fileSize) : null;
        
        resultCard.innerHTML = `
            <div class="result-preview">
                <div class="result-thumbnail">
                    ${data.type === 'video' 
                        ? `<video src="${data.preview || data.thumbnail}" poster="${data.thumbnail}" controls></video>`
                        : `<img src="${data.thumbnail}" alt="${data.title}">`
                    }
                    ${duration ? `<span class="result-duration">${duration}</span>` : ''}
                </div>
                <div class="result-info">
                    <h3 class="result-title">${data.title || 'Untitled'}</h3>
                    <div class="result-meta">
                        ${data.views ? `<span><i class="fas fa-eye"></i> ${this.formatNumber(data.views)} views</span>` : ''}
                        ${data.likes ? `<span><i class="fas fa-heart"></i> ${this.formatNumber(data.likes)} likes</span>` : ''}
                        ${fileSize ? `<span><i class="fas fa-file"></i> ${fileSize}</span>` : ''}
                        ${data.uploadDate ? `<span><i class="fas fa-calendar"></i> ${data.uploadDate}</span>` : ''}
                    </div>
                    ${data.author ? `
                        <div class="result-author">
                            ${data.author.avatar ? `<img src="${data.author.avatar}" alt="" class="author-avatar">` : ''}
                            <div>
                                <div class="author-name">${data.author.name}</div>
                                ${data.author.username ? `<div class="author-username">@${data.author.username}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="download-options">
                        <h4>Download Options</h4>
                        <div class="download-buttons">
                            ${this.generateDownloadButtons(data)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        
        // Bind download button events
        resultCard.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.downloadFile(e.currentTarget));
        });
        
        this.showToast('Media fetched successfully!', 'success');
    }
    
    generateDownloadButtons(data) {
        let buttons = '';
        
        if (data.downloadOptions) {
            data.downloadOptions.forEach(option => {
                buttons += `
                    <button class="download-btn" 
                            data-url="${option.url}" 
                            data-filename="${option.filename || 'download'}">
                        <i class="fas fa-download"></i>
                        <span>${option.label}</span>
                        ${option.quality ? `<span class="quality-tag">${option.quality}</span>` : ''}
                    </button>
                `;
            });
        } else if (data.downloadUrl) {
            buttons = `
                <button class="download-btn" 
                        data-url="${data.downloadUrl}" 
                        data-filename="${data.filename || 'download'}">
                    <i class="fas fa-download"></i>
                    <span>Download</span>
                </button>
            `;
        }
        
        // Add thumbnail download if available
        if (data.thumbnail && document.getElementById('downloadThumbnail')?.checked) {
            buttons += `
                <button class="download-btn secondary" 
                        data-url="${data.thumbnail}" 
                        data-filename="thumbnail">
                    <i class="fas fa-image"></i>
                    <span>Thumbnail</span>
                </button>
            `;
        }
        
        return buttons;
    }
    
    displayBatchResults(data) {
        this.hideLoading();
        
        const batchSection = document.getElementById('batchSection');
        const batchGrid = document.getElementById('batchGrid');
        
        if (!batchSection || !batchGrid) return;
        
        batchGrid.innerHTML = data.items.map((item, index) => `
            <div class="batch-item" data-index="${index}" data-url="${item.downloadUrl}">
                ${item.type === 'video' 
                    ? `<video src="${item.preview || item.thumbnail}" muted></video>`
                    : `<img src="${item.thumbnail}" alt="">`
                }
                <div class="batch-item-overlay">
                    <span>${item.type}</span>
                </div>
                <div class="batch-item-checkbox">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `).join('');
        
        // Bind events
        batchGrid.querySelectorAll('.batch-item').forEach(item => {
            item.addEventListener('click', (e) => this.toggleBatchItem(e.currentTarget));
        });
        
        batchSection.classList.remove('hidden');
        this.showToast(`Found ${data.items.length} items`, 'success');
    }
    
    toggleBatchItem(item) {
        const index = item.dataset.index;
        
        if (this.selectedBatchItems.has(index)) {
            this.selectedBatchItems.delete(index);
            item.classList.remove('selected');
        } else {
            this.selectedBatchItems.add(index);
            item.classList.add('selected');
        }
    }
    
    toggleSelectAll() {
        const items = document.querySelectorAll('.batch-item');
        const allSelected = this.selectedBatchItems.size === items.length;
        
        if (allSelected) {
            this.selectedBatchItems.clear();
            items.forEach(item => item.classList.remove('selected'));
        } else {
            items.forEach(item => {
                this.selectedBatchItems.add(item.dataset.index);
                item.classList.add('selected');
            });
        }
    }
    
    async downloadSelected() {
        if (this.selectedBatchItems.size === 0) {
            this.showToast('Please select items to download', 'warning');
            return;
        }
        
        const items = document.querySelectorAll('.batch-item');
        
        for (const index of this.selectedBatchItems) {
            const item = items[index];
            if (item) {
                await this.downloadFile({
                    dataset: {
                        url: item.dataset.url,
                        filename: `download_${index}`
                    }
                });
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        this.showToast('Downloads started!', 'success');
    }
    
    // ============================================
    // Download Handler
    // ============================================
    
    async downloadFile(button) {
        const url = button.dataset?.url;
        const filename = button.dataset?.filename || 'download';
        
        if (!url) {
            this.showToast('Download URL not found', 'error');
            return;
        }
        
        try {
            this.showToast('Starting download...', 'info');
            
            // For direct downloads
            if (url.startsWith('http')) {
                const response = await fetch(`/api/download`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url, filename })
                });
                
                if (!response.ok) {
                    throw new Error('Download failed');
                }
                
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
                
                this.showToast('Download completed!', 'success');
            }
        } catch (error) {
            this.showToast('Download failed: ' + error.message, 'error');
        }
    }
    
    // ============================================
    // UI State Management
    // ============================================
    
    showLoading() {
        document.getElementById('loadingState')?.classList.remove('hidden');
        document.getElementById('resultsSection')?.classList.add('hidden');
        document.getElementById('batchSection')?.classList.add('hidden');
        document.getElementById('errorSection')?.classList.add('hidden');
        
        // Animate progress
        this.animateProgress();
    }
    
    hideLoading() {
        document.getElementById('loadingState')?.classList.add('hidden');
    }
    
    animateProgress() {
        const progressFill = document.getElementById('progressFill');
        const loadingText = document.getElementById('loadingText');
        
        if (!progressFill) return;
        
        let progress = 0;
        const messages = [
            'Connecting to server...',
            'Fetching media information...',
            'Processing video data...',
            'Preparing download options...'
        ];
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            progressFill.style.width = `${progress}%`;
            
            const msgIndex = Math.floor(progress / 25);
            if (loadingText && messages[msgIndex]) {
                loadingText.textContent = messages[msgIndex];
            }
        }, 500);
        
        // Store interval for cleanup
        this.progressInterval = interval;
    }
    
    showError(message) {
        this.hideLoading();
        if (this.progressInterval) clearInterval(this.progressInterval);
        
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.classList.remove('hidden');
        }
        
        this.showToast(message, 'error');
    }
    
    reset() {
        document.getElementById('errorSection')?.classList.add('hidden');
        document.getElementById('resultsSection')?.classList.add('hidden');
        document.getElementById('batchSection')?.classList.add('hidden');
        document.getElementById('mediaUrl').value = '';
        document.getElementById('username').value = '';
        this.selectedBatchItems.clear();
    }
    
    // ============================================
    // Theme Management
    // ============================================
    
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    // ============================================
    // FAQ Accordion
    // ============================================
    
    initFAQ() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                const isActive = item.classList.contains('active');
                
                // Close all
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
                
                // Toggle current
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
    
    // ============================================
    // Toast Notifications
    // ============================================
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <span class="toast-close"><i class="fas fa-times"></i></span>
        `;
        
        container.appendChild(toast);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    // ============================================
    // Utility Functions
    // ============================================
    
    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoDownloader();
});
