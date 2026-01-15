const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

class FacebookAPI {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        };
    }
    
    async getVideoData(url) {
        try {
            // Convert mobile URL to desktop
            url = url.replace('m.facebook.com', 'www.facebook.com');
            url = url.replace('fb.watch', 'www.facebook.com/watch?v=');
            
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000
            });
            
            const html = response.data;
            const $ = cheerio.load(html);
            
            // Extract video URLs from HTML
            const sdMatch = html.match(/"sd_src":"([^"]+)"/);
            const hdMatch = html.match(/"hd_src":"([^"]+)"/);
            const sd2Match = html.match(/sd_src_no_ratelimit":"([^"]+)"/);
            const hd2Match = html.match(/hd_src_no_ratelimit":"([^"]+)"/);
            
            // Try alternative patterns
            const playableUrlMatch = html.match(/"playable_url":"([^"]+)"/);
            const playableUrlHDMatch = html.match(/"playable_url_quality_hd":"([^"]+)"/);
            
            const sdUrl = this.decodeUrl(sdMatch?.[1] || sd2Match?.[1] || playableUrlMatch?.[1]);
            const hdUrl = this.decodeUrl(hdMatch?.[1] || hd2Match?.[1] || playableUrlHDMatch?.[1]);
            
            if (!sdUrl && !hdUrl) {
                throw new Error('Could not extract video URL');
            }
            
            // Extract title
            const titleMatch = html.match(/"title":"([^"]+)"/);
            const title = titleMatch ? 
