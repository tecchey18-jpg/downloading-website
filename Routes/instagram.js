const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Instagram API helper
class InstagramAPI {
    constructor() {
        this.baseUrl = 'https://www.instagram.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }
    
    async getPostData(url) {
        try {
            // Extract shortcode from URL
            const shortcodeMatch = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
            if (!shortcodeMatch) {
                throw new Error('Invalid Instagram URL');
            }
            
            const shortcode = shortcodeMatch[2];
            
            // Try GraphQL API
            const graphqlUrl = `${this.baseUrl}/p/${shortcode}/?__a=1&__d=dis`;
            
            const response = await axios.get(graphqlUrl, {
                headers: this.headers,
                timeout: 10000
            });
            
            if (response.data && response.data.graphql) {
                return this.parseGraphQLResponse(response.data.graphql.shortcode_media);
            }
            
            // Fallback: scrape the page
            return await this.scrapePost(url);
            
        } catch (error) {
            console.error('Instagram API error:', error.message);
            throw error;
        }
    }
    
    parseGraphQLResponse(media) {
        const items = [];
        
        if (media.__typename === 'GraphSidecar') {
            // Multiple images/videos
            media.edge_sidecar_to_children.edges.forEach(edge => {
                const node = edge.node;
                items.push({
                    type: node.is_video ? 'video' : 'image',
                    thumbnail: node.display_url,
                    downloadUrl: node.is_video ? node.video_url : node.display_url,
                    dimensions: node.dimensions
                });
            });
        } else {
            // Single image/video
            items.push({
                type: media.is_video ? 'video' : 'image',
                thumbnail: media.display_url,
                downloadUrl: media.is_video ? media.video_url : media.display_url,
                dimensions: media.dimensions
            });
        }
        
        return {
            type: items.length > 1 ? 'batch' : 'single',
            title: media.edge_media_to_caption?.edges[0]?.node?.text || 'Instagram Post',
            author: {
                name: media.owner?.full_name,
                username: media.owner?.username,
                avatar: media.owner?.profile_pic_url
            },
            likes: media.edge_media_preview_like?.count,
            comments: media.edge_media_to_comment?.count,
            timestamp: media.taken_at_timestamp,
            items
        };
    }
    
    async scrapePost(url) {
        const response = await axios.get(url, {
            headers: this.headers,
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Find the script containing post data
        let postData = null;
        
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const data = JSON.parse($(elem).html());
                if (data.video || data.image) {
                    postData = data;
                }
            } catch (e) {}
        });
        
        if (!postData) {
            throw new Error('Could not extract post data');
        }
        
        return {
            type: 'single',
            title: postData.caption || 'Instagram Post',
            author: {
                name: postData.author?.name,
                username: postData.author?.alternateName
            },
            items: [{
                type: postData.video ? 'video' : 'image',
                thumbnail: postData.thumbnailUrl || postData.image,
                downloadUrl: postData.contentUrl || postData.video || postData.image
            }]
        };
    }
    
    async getProfileData(username) {
        try {
            const response = await axios.get(`${this.baseUrl}/${username}/?__a=1&__d=dis`, {
                headers: this.headers,
                timeout: 10000
            });
            
            if (response.data && response.data.graphql) {
                const user = response.data.graphql.user;
                
                if (user.is_private) {
                    throw new Error('This account is private');
                }
                
                const posts = user.edge_owner_to_timeline_media.edges.map(edge => {
                    const node = edge.node;
                    return {
                        type: node.is_video ? 'video' : 'image',
                        thumbnail: node.thumbnail_src || node.display_url,
                        downloadUrl: node.is_video ? node.video_url : node.display_url,
                        shortcode: node.shortcode,
                        likes: node.edge_liked_by?.count,
                        comments: node.edge_media_to_comment?.count
                    };
                });
                
                return {
                    type: 'profile',
                    username: user.username,
                    fullName: user.full_name,
                    avatar: user.profile_pic_url_hd,
                    bio: user.biography,
                    followers: user.edge_followed_by?.count,
                    following: user.edge_follow?.count,
                    postsCount: user.edge_owner_to_timeline_media?.count,
                    items: posts
                };
            }
            
            throw new Error('Could not fetch profile data');
            
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Profile not found');
            }
            throw error;
        }
    }
    
    async getStoryData(username) {
        // Note: Stories require authentication
        throw new Error('Story download requires authentication. Please use the post/reel URL instead.');
    }
}

const instagramAPI = new InstagramAPI();

// Fetch Instagram content
router.post('/fetch', async (req, res) => {
    try {
        const { input, inputType, contentType, quality, removeWatermark } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'URL or username is required' });
        }
        
        let result;
        
        if (inputType === 'username' || contentType === 'profile') {
            // Fetch profile
            const username = input.replace('@', '').trim();
            result = await instagramAPI.getProfileData(username);
            
            return res.json({
                success: true,
                type: 'batch',
                platform: 'instagram',
                ...result
            });
        }
        
        // Fetch post/reel
        result = await instagramAPI.getPostData(input);
        
        if (result.items.length === 1) {
            const item = result.items[0];
            return res.json({
                success: true,
                type: item.type,
                platform: 'instagram',
                title: result.title,
                author: result.author,
                likes: result.likes,
                comments: result.comments,
                thumbnail: item.thumbnail,
                downloadUrl: item.downloadUrl,
                downloadOptions: [{
                    url: item.downloadUrl,
                    quality: 'Original',
                    label: item.type === 'video' ? 'Download Video' : 'Download Image',
                    filename: `instagram_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`
                }],
                filename: `instagram_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`
            });
        }
        
        // Multiple items
        return res.json({
            success: true,
            type: 'batch',
            platform: 'instagram',
            title: result.title,
            author: result.author,
            items: result.items.map((item, index) => ({
                ...item,
                downloadUrl: item.downloadUrl,
                filename: `instagram_${Date.now()}_${index}.${item.type === 'video' ? 'mp4' : 'jpg'}`
            }))
        });
        
    } catch (error) {
        console.error('Instagram fetch error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to fetch Instagram content',
            success: false 
        });
    }
});

module.exports = router;
