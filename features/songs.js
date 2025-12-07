// const yts = require('yt-search');
// const ytdl = require('@distube/ytdl-core');
// const fs = require('fs');
// const path = require('path');

// // Store user search sessions
// const searchSessions = new Map();

// // YouTube cookies to bypass 403 (optional - add if needed)
// const YOUTUBE_COOKIES = []; // We'll add these if needed

// /**
//  * Search YouTube for songs
//  * @param {string} query - Search query
//  * @param {number} limit - Number of results (default 5)
//  * @returns {Promise<Array>} Search results
//  */
// async function searchYouTube(query, limit = 5) {
//     try {
//         const results = await yts(query);
//         return results.videos.slice(0, limit);
//     } catch (error) {
//         console.error('YouTube search error:', error);
//         throw new Error('Failed to search YouTube');
//     }
// }

// /**
//  * Format search results for display
//  * @param {Array} results - Search results
//  * @param {string} query - Original search query
//  * @returns {string} Formatted message
//  */
// function formatSearchResults(results, query) {
//     let message = '🎵 *YOUTUBE SONG SEARCH*\n\n';
//     message += `🔍 Query: "${query}"\n`;
//     message += `📊 Found ${results.length} results\n\n`;
//     message += '━━━━━━━━━━━━━━━━━━━━\n\n';

//     results.slice(0, 5).forEach((video, index) => {
//         const duration = formatDuration(video.timestamp);
//         message += `*${index + 1}.* ${video.title}\n`;
//         message += `   👤 ${video.author.name}\n`;
//         message += `   ⏱️ ${duration}\n`;
//         message += `   👁️ ${formatViews(video.views)}\n\n`;
//     });

//     message += '━━━━━━━━━━━━━━━━━━━━\n\n';
//     message += '💡 *Reply with a number (1-5) to download that song*';

//     return message;
// }

// /**
//  * Normalize YouTube URL
//  * @param {string} url - YouTube URL
//  * @returns {string} Normalized URL
//  */
// function normalizeYouTubeUrl(url) {
//     if (!url) return null;
//     
//     // Convert youtu.be short links
//     if (url.includes('youtu.be/')) {
//         const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
//         return `https://www.youtube.com/watch?v=${videoId}`;
//     }
//     
//     // Ensure proper format and remove extra parameters
//     if (url.includes('youtube.com/watch')) {
//         return url.split('&')[0];
//     }
//     
//     return url;
// }

// /**
//  * Get download options with proper headers to bypass 403
//  */
// function getDownloadOptions() {
//     const options = {
//         quality: 'highestaudio',
//         filter: 'audioonly',
//         requestOptions: {
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//                 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//                 'Accept-Language': 'en-US,en;q=0.9',
//                 'Accept-Encoding': 'gzip, deflate',
//                 'Connection': 'keep-alive',
//                 'Upgrade-Insecure-Requests': '1'
//             }
//         }
//     };

//     // Add cookies if available
//     if (YOUTUBE_COOKIES.length > 0) {
//         options.requestOptions.headers['Cookie'] = YOUTUBE_COOKIES.join('; ');
//     }

//     return options;
// }

// /**
//  * Download YouTube audio with progress tracking and 403 bypass
//  * @param {string} url - YouTube video URL
//  * @param {string} title - Video title (for filename)
//  * @param {Function} onProgress - Optional progress callback (percent, downloaded, total)
//  * @returns {Promise<string>} Path to downloaded file
//  */
// async function downloadAudio(url, title, onProgress = null) {
//     let attempts = 0;
//     const maxAttempts = 3;

//     while (attempts < maxAttempts) {
//         try {
//             attempts++;
//             console.log(`🎵 Download attempt ${attempts}/${maxAttempts} for: ${title}`);

//             if (!url) {
//                 throw new Error('URL is undefined or empty');
//             }

//             // Normalize URL
//             url = normalizeYouTubeUrl(url);
//             console.log(`🎵 Normalized URL: ${url}`);

//             // Validate YouTube URL
//             if (!ytdl.validateURL(url)) {
//                 throw new Error('Invalid YouTube URL');
//             }

//             // Create downloads directory
//             const downloadsDir = path.join(__dirname, '..', 'downloads');
//             if (!fs.existsSync(downloadsDir)) {
//                 fs.mkdirSync(downloadsDir, { recursive: true });
//             }

//             // Sanitize filename
//             const sanitizedTitle = title
//                 .replace(/[^a-zA-Z0-9\s-]/g, '')
//                 .replace(/\s+/g, '_')
//                 .substring(0, 50);

//             const outputPath = path.join(downloadsDir, `${sanitizedTitle}.mp3`);

//             // Delete existing file if it exists
//             if (fs.existsSync(outputPath)) {
//                 fs.unlinkSync(outputPath);
//                 console.log('🗑️ Removed existing file');
//             }

//             // Get video info with bypass headers
//             console.log('📊 Fetching video info...');
//             const infoOptions = getDownloadOptions();
//             const info = await ytdl.getInfo(url, infoOptions);
//             console.log(`✅ Video info retrieved: ${info.videoDetails.title}`);

//             return await new Promise((resolve, reject) => {
//                 console.log('🎵 Starting download...');
//                 
//                 const downloadOptions = getDownloadOptions();
//                 const stream = ytdl(url, downloadOptions);

//                 const writeStream = fs.createWriteStream(outputPath);
//                 
//                 let downloadedBytes = 0;
//                 let totalBytes = 0;
//                 let lastProgressReport = 0;

//                 // Track download progress
//                 stream.on('response', (response) => {
//                     totalBytes = parseInt(response.headers['content-length']) || 0;
//                     console.log(`📦 Total size: ${(totalBytes / (1024 * 1024)).toFixed(2)}MB`);
//                 });

//                 stream.on('data', (chunk) => {
//                     downloadedBytes += chunk.length;
//                     
//                     if (totalBytes > 0 && onProgress) {
//                         const progress = Math.floor((downloadedBytes / totalBytes) * 100);
//                         
//                         // Report progress every 20%
//                         if (progress - lastProgressReport >= 20) {
//                             lastProgressReport = progress;
//                             const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
//                             const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
//                             onProgress(progress, downloadedMB, totalMB);
//                         }
//                     }
//                 });

//                 stream.on('error', (err) => {
//                     console.error('❌ Download stream error:', err.message);
//                     if (fs.existsSync(outputPath)) {
//                         fs.unlinkSync(outputPath);
//                     }
//                     reject(err);
//                 });

//                 writeStream.on('error', (err) => {
//                     console.error('❌ Write stream error:', err.message);
//                     if (fs.existsSync(outputPath)) {
//                         fs.unlinkSync(outputPath);
//                     }
//                     reject(err);
//                 });

//                 writeStream.on('finish', () => {
//                     console.log(`✅ Download completed: ${outputPath}`);
//                     
//                     // Verify file exists and has content
//                     if (fs.existsSync(outputPath)) {
//                         const stats = fs.statSync(outputPath);
//                         if (stats.size > 0) {
//                             console.log(`✅ File size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
//                             resolve(outputPath);
//                         } else {
//                             fs.unlinkSync(outputPath);
//                             reject(new Error('Downloaded file is empty'));
//                         }
//                     } else {
//                         reject(new Error('Downloaded file not found'));
//                     }
//                 });

//                 stream.pipe(writeStream);
//             });

//         } catch (error) {
//             console.error(`❌ Attempt ${attempts} failed:`, error.message);
//             
//             // If it's a 403 error and we have more attempts, wait and retry
//             if (error.message.includes('403') && attempts < maxAttempts) {
//                 console.log(`⏳ Waiting 2 seconds before retry...`);
//                 await new Promise(resolve => setTimeout(resolve, 2000));
//                 continue;
//             }
//             
//             // If all attempts failed or it's not a 403, throw error
//             if (attempts >= maxAttempts) {
//                 throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
//             }
//             
//             throw error;
//         }
//     }
// }

// /**
//  * Store search session for a user
//  * @param {string} userId - User JID
//  * @param {Array} results - Search results
//  * @param {number} expiryMs - Session expiry time in milliseconds (default: 3 minutes)
//  */
// function storeSearchSession(userId, results, expiryMs = 3 * 60 * 1000) {
//     searchSessions.set(userId, {
//         results: results,
//         timestamp: Date.now()
//     });

//     // Auto-clear session after specified time (default 3 minutes)
//     setTimeout(() => {
//         searchSessions.delete(userId);
//         console.log(`🎵 Session expired and cleared: ${userId}`);
//     }, expiryMs);
// }

// /**
//  * Get search session for a user
//  * @param {string} userId - User JID
//  * @returns {Object|null} Search session or null
//  */
// function getSearchSession(userId) {
//     return searchSessions.get(userId) || null;
// }

// /**
//  * Clear search session for a user
//  * @param {string} userId - User JID
//  */
// function clearSearchSession(userId) {
//     searchSessions.delete(userId);
// }

// /**
//  * Get all active sessions (for debugging)
//  */
// function getAllSessions() {
//     return Array.from(searchSessions.keys());
// }

// /**
//  * Format duration string
//  */
// function formatDuration(timestamp) {
//     return timestamp || 'Unknown';
// }

// /**
//  * Format view count
//  */
// function formatViews(views) {
//     if (views >= 1000000) {
//         return `${(views / 1000000).toFixed(1)}M views`;
//     } else if (views >= 1000) {
//         return `${(views / 1000).toFixed(1)}K views`;
//     }
//     return `${views} views`;
// }

// /**
//  * Format download progress message
//  */
// function formatDownloadMessage(title) {
//     return `🎵 *DOWNLOADING SONG*\n\n` +
//            `📝 Title: ${title}\n\n` +
//            `⏳ Please wait, downloading audio...\n` +
//            `🎧 Converting to MP3 format...`;
// }

// /**
//  * Clean up downloaded file
//  * @param {string} filePath - Path to file to delete
//  */
// function cleanupFile(filePath) {
//     try {
//         if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//             console.log(`🗑️ Cleaned up: ${filePath}`);
//         }
//     } catch (error) {
//         console.error('Cleanup error:', error);
//     }
// }

// module.exports = {
//     searchYouTube,
//     formatSearchResults,
//     downloadAudio,
//     storeSearchSession,
//     getSearchSession,
//     clearSearchSession,
//     formatDownloadMessage,
//     getAllSessions,
//     cleanupFile
// };