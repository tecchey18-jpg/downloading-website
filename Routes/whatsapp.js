const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// Fetch status info
router.post('/fetch', async (req, res) => {
    try {
        const { input, type } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const result = await whatsappService.getStatusInfo(input);
        res.json(result);
        
    } catch (error) {
        console.error('WhatsApp fetch error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch status' });
    }
});

// Download status
router.post('/download', async (req, res) => {
    try {
        const { url, mediaData } = req.body;
        
        const mediaUrl = url || mediaData?.downloadUrl || mediaData?.url;
        
        if (!mediaUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        await whatsappService.downloadStatus(mediaUrl, res);
        
    } catch (error) {
        console.error('WhatsApp download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Download failed' });
        }
    }
});

module.exports = router;
