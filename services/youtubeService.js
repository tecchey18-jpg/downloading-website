const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const contentDisposition = require('content-disposition');
const sanitize = require('sanitize-filename');

class YouTubeService {
    constructor() {
        this.downloadsDir = path.join(__dirname, '..', 'downloads');
    }

    async getVideoInfo(url) {
        try {
            // Validate URL
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }

            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;

            // Get available formats
            const formats = this.extractFormats(info.formats);

            return {
                url: url,
                videoId: videoDetails.videoId,
                title: videoDetails.title,
                description: videoDetails.shortDescription,
                thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url,
                duration: parseInt(videoDetails.lengthSeconds),
                views: parseInt(videoDetails.viewCount),
                author: videoDetails.author.name,
                authorUrl: videoDetails.author.channel_url,
                uploadDate: videoDetails.uploadDate,
                formats: formats,
                isLive: videoDetails.isLiveContent
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            throw new Error(error.message || 'Failed to get video information');
        }
    }

    extractFormats(formats) {
        const qualityMap = new Map();

        formats.forEach(format => {
            if (format.hasVideo && format.container === 'mp4') {
                const quality = format.qualityLabel;
                if (quality && !qualityMap.has(quality)) {
                    qualityMap.set(quality, {
                        quality: quality,
                        qualityLabel: quality,
                        formatId: format.itag,
                        container: format.container,
                        hasAudio: format.hasAudio,
                        size: format.contentLength ? this.formatBytes(parseInt(format.contentLength)) : 'N/A',
                        bitrate: format.bitrate,
                        fps: format.fps
                    });
                }
            }
        });

        // Sort by quality (highest first)
        const sortOrder = ['4320p', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
        const result = Array.from(qualityMap.values()).sort((a, b) => {
            const aIndex = sortOrder.indexOf(a.quality);
            const bIndex = sortOrder.indexOf(b.quality);
            return aIndex - bIndex;
        });

        return result;
    }

    formatBytes(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    async downloadVideo(url, quality, includeAudio, res) {
        try {
            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            const title = sanitize(videoDetails.title) || 'video';

            // Get quality options
            const qualityNumber = parseInt(quality) || 1080;
            
            let format;
            
            if (includeAudio) {
                // Get format with both video and audio
                format = ytdl.chooseFormat(info.formats, {
                    quality: 'highestvideo',
                    filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
                });

                if (!format) {
                    // If no combined format, we need to merge
                    return await this.downloadAndMerge(url, info, title, qualityNumber, res);
                }
            } else {
                format = ytdl.chooseFormat(info.formats, {
                    quality: 'highestvideo',
                    filter: format => format.container === 'mp4' && format.hasVideo
                });
            }

            const filename = `${title}.mp4`;

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', contentDisposition(filename));

            const stream = ytdl(url, { format });
            stream.pipe(res);

            stream.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Download failed' });
                }
            });

        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    async downloadAndMerge(url, info, title, quality, res) {
        const videoId = uuidv4();
        const videoPath = path.join(this.downloadsDir, `${videoId}_video.mp4`);
        const audioPath = path.join(this.downloadsDir, `${videoId}_audio.mp4`);
        const outputPath = path.join(this.downloadsDir, `${videoId}_output.mp4`);

        try {
            // Download video
            const videoFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highestvideo',
                filter: format => format.container === 'mp4' && format.hasVideo
            });

            // Download audio
            const audioFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: format => format.hasAudio
            });

            // Download video stream
            await new Promise((resolve, reject) => {
                const videoStream = ytdl(url, { format: videoFormat });
                const fileStream = fs.createWriteStream(videoPath);
                videoStream.pipe(fileStream);
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
                videoStream.on('error', reject);
            });

            // Download audio stream
            await new Promise((resolve, reject) => {
                const audioStream = ytdl(url, { format: audioFormat });
                const fileStream = fs.createWriteStream(audioPath);
                audioStream.pipe(fileStream);
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
                audioStream.on('error', reject);
            });

            // Merge using ffmpeg
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(videoPath)
                    .input(audioPath)
                    .outputOptions([
                        '-c:v copy',
                        '-c:a aac',
                        '-strict experimental'
                    ])
                    .output(outputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // Send the merged file
            const filename = `${title}.mp4`;
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', contentDisposition(filename));

            const readStream = fs.createReadStream(outputPath);
            readStream.pipe(res);

            readStream.on('end', () => {
                // Clean up temp files
                this.cleanupFiles([videoPath, audioPath, outputPath]);
            });

        } catch (error) {
            this.cleanupFiles([videoPath, audioPath, outputPath]);
            throw error;
        }
    }

    cleanupFiles(files) {
        files.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlink(file, () => {});
            }
        });
    }

    async getPlaylistInfo(url) {
        try {
            // Extract playlist ID
            const playlistIdMatch = url.match(/[&?]list=([a-zA-Z0-9_-]+)/);
            if (!playlistIdMatch) {
                throw new Error('Invalid playlist URL');
            }

            const playlistId = playlistIdMatch[1];
            
            // For full playlist functionality, you'd need YouTube Data API
            // This is a simplified version
            return {
                multiple: true,
                playlistId,
                items: [],
                message: 'Playlist functionality requires YouTube Data API integration'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get playlist information');
        }
    }
}

module.exports = new YouTubeService();
