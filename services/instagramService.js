const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const contentDisposition = require('content-disposition');
const sanitize = require('sanitize-filename');

class InstagramService {
    constructor() {
        this.downloadsDir = path.join(__dirname, '..', 'downloads');
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        };
    }

    extractShortcode(url) {
        const patterns = [
            /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/stories\/[^\/]+\/([0-9]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    extractUsername(input) {
        // Handle @username format
        if (input.startsWith('@')) {
            return input.substring(1);
        }
        
        // Handle URL format
        const match = input.match(/instagram\.com\/([^\/\?]+)/);
        if (match) return match[1];
        
        return input;
    }

    async getPostInfo(url) {
        try {
            const shortcode = this.extractShortcode(url);
            if (!shortcode) {
                throw new Error('Invalid Instagram URL');
            }

            // Use Instagram's embed endpoint
            const 
