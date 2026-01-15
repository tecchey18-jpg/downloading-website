const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');
const { v4: uuidv4 } = require('uuid');

// Fetch YouTube video info
router.post('/fetch', async (req, res) => {
    try {
        const { input, contentType, quality, includeAudio } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate YouTube URL
        if (!ytdl.validateURL(input)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }
        
        const info = await ytdl.getInfo(input);
        const videoDetails = info.videoDetails;
        
        // Get available formats
        const formats = info.formats.filter(f => f.hasVideo || f.hasAudio);
        
        // Group formats by quality
        const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio);
        const videoOnlyFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
        const audioFormats = formats.filter(f => !f.hasVideo && f.hasAudio);
        
        // Build download options
        const downloadOptions = [];
        
        // Add combined formats (video + audio)
        const qualityMap = {
            '2160': '4K',
            '1440': '2K',
            '1080': 'Full HD',
            '720': 'HD',
            '480': 'SD',
            '360': 'Low'
        };
        
        const uniqueQualities = new Set();
        
        videoFormats.forEach(format => {
            const height = format.height;
            if (height && !uniqueQualities.has(height)) {
                uniqueQualities.add(height);
                downloadOptions.push({
                    url: format.url,
                    quality: `${height}p`,
                    label: qualityMap[height] || `${height}p`,
                    format: format.container,
                    hasAudio: true,
                    itag: format.itag,
                    filename: `${videoDetails.title.replace(/[^\w\s]/gi, '')}_${height}p.${format.container}`
                });
            }
        });
        
        // Add audio only option
        if (contentType === 'audio' || audioFormats.length > 0) {
            const bestAudio = audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0];
            if (bestAudio) {
                downloadOptions.push({
                    url: bestAudio.url,
                    quality: `${bestAudio.audioBitrate}kbps`,
                    label: 'Audio Only (MP3)',
                    format: 'mp3',
                    hasAudio: true,
                    itag: bestAudio.itag,
                    filename: `${videoDetails.title.replace(/[^\w\s]/gi, '')}.mp3`
                });
            }
        }
        
        // Sort by quality (highest first)
        downloadOptions.sort((a, b) => {
            const aHeight = parseInt(a.quality) || 0;
            const bHeight = parseInt(b.quality) || 0;
            return bHeight - aHeight;
        });
        
        res.json({
            success: true,
            type: 'video',
            platform: 'youtube',
            title: videoDetails.title,
            description: videoDetails.shortDescription,
            duration: parseInt(videoDetails.lengthSeconds),
            views: parseInt(videoDetails.viewCount),
            likes: videoDetails.likes,
            thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url,
            author: {
                name: videoDetails.author.name,
                username: videoDetails.author.user,
                avatar: videoDetails.author.thumbnails?.[0]?.url
            },
            uploadDate: videoDetails.uploadDate,
            downloadOptions,
            downloadUrl: downloadOptions[0]?.url,
            filename: downloadOptions[0]?.filename
        });
        
    } catch (error) {
        console.error('YouTube fetch error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to fetch YouTube video',
            success: false 
        });
    }
});

// Direct download endpoint
router.get('/download', async (req, res) => {
    try {
        const { url, itag, filename } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const info = await ytdl.getInfo(url);
        const format = itag 
            ? info.formats.find(f => f.itag === parseInt(itag))
            : ytdl.chooseFormat(info.formats, { quality: 'highest' });
        
        if (!format) {
            return res.status(404).json({ error: 'Format not found' });
        }
        
        res.header('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
        res.header('Content-Type', format.mimeType);
        
        ytdl(url, { format }).pipe(res);
        
    } catch (error) {
        console.error('YouTube download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

module.exports = router;
