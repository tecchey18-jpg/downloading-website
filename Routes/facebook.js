const express = require('express');
const router = express.Router();
const facebookService = require('../services/facebookService');

// Fetch video info
router.post('/fetch', async (req, res) => {
    try {
        const { input, type, inputType } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        let result;
        
        switch (type) {
            case 'video':
                result = await facebookService.getVideoInfo(input);
                break;
            case 'reel':
                result = await facebookService.getReelInfo(input);
                break;
            case 'story':
                result = await facebookService.getStoryInfo(input);
                break;
            default:
                return res.status(400).json({ error: 'Invalid content type' });
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Facebook fetch error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch video' });
    }
});

// Download video
router.post('/download', async (req, res) => {
    try {
        const { url, quality, mediaData } = req.body;
        
        const videoUrl = url || mediaData?.downloadUrl || mediaData?.url;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        await facebookService.downloadVideo(videoUrl, quality, res);
        
    } catch (error) {
        console.error('Facebook download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Download failed' });
        }
    }
});

module.exports = router;
            
           
