// Deprecated: YouTube video downloads are disabled due to library incompatibility
// Use features/ytvideo.js with yt-search for video information instead

module.exports = function ytmp4_deprecated() {
    throw new Error('lib/ytmp4.js is deprecated. Use features/ytvideo.js for video information or stream via web players.');
};
