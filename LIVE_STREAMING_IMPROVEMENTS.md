# Live Streaming Improvements

This document outlines the comprehensive improvements made to the live streaming system, including HLS adaptive bitrate streaming, FFmpeg integration, and enhanced video player capabilities.

## 🚀 New Features

### 1. HLS Adaptive Bitrate Streaming
- **Multi-quality streaming**: Automatic quality switching based on network conditions
- **Low latency**: Optimized for live streaming with minimal delay
- **Cross-platform compatibility**: Works on all modern browsers and devices
- **Bandwidth optimization**: Reduces buffering and improves user experience

### 2. FFmpeg Integration
- **Video processing**: Automatic conversion of uploaded videos to HLS format
- **Multiple quality levels**: Low (500kbps), Medium (1000kbps), High (2500kbps)
- **Real-time encoding**: Live stream encoding with configurable parameters
- **Format support**: MP4, AVI, MOV, MKV, WebM input formats

### 3. Enhanced Video Player
- **HLS.js integration**: Native HLS support with fallback to native browser support
- **Quality selector**: Manual quality switching for users
- **Live indicators**: Real-time connection quality and latency display
- **Adaptive controls**: Auto-hiding controls with hover detection
- **Fullscreen support**: Native fullscreen API integration

### 4. Improved Live Streaming
- **Real-time metrics**: Viewer count, connection quality, latency
- **Stream management**: Start/stop streams via API
- **Error handling**: Robust error recovery and reconnection
- **Token refresh**: Automatic session renewal for long streams

## 📁 File Structure

```
src/
├── lib/
│   └── video-streaming.ts          # Video streaming service with FFmpeg
├── components/
│   ├── video/
│   │   └── video-player.tsx        # Enhanced video player with HLS
│   └── live-stream/
│       └── live-stream-viewer.tsx  # Improved live streaming viewer
├── app/api/
│   ├── live-classes/
│   │   ├── [id]/
│   │   │   ├── stream/route.ts     # Stream token generation
│   │   │   └── start-stream/route.ts # Stream start/stop API
│   └── courses/
│       └── [courseId]/
│           └── videos/route.ts     # Enhanced video upload with HLS
└── models/
    └── video.ts                    # Updated video model with HLS fields
```

## 🔧 Technical Implementation

### Video Streaming Service (`src/lib/video-streaming.ts`)

The core streaming service that handles:
- FFmpeg process management
- HLS stream generation
- Quality level management
- Stream lifecycle management

```typescript
// Example usage
const streamInfo = await videoStreamingService.startStream({
  inputUrl: 'rtmp://localhost/live/stream',
  quality: 'adaptive',
  bitrate: 1500,
  resolution: '1280x720'
});
```

### Enhanced Video Player

Features include:
- HLS.js for adaptive streaming
- Quality switching
- Live stream indicators
- Connection quality monitoring
- Automatic error recovery

### API Endpoints

#### Start Stream
```http
POST /api/live-classes/{id}/start-stream
{
  "inputUrl": "rtmp://localhost/live/stream",
  "quality": "adaptive",
  "bitrate": 1500,
  "resolution": "1280x720"
}
```

#### Stop Stream
```http
DELETE /api/live-classes/{id}/start-stream
```

#### Get Stream Info
```http
POST /api/live-classes/{id}/stream
```

## 🛠️ Setup Requirements

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Add these to your `.env.local`:
```env
# FFmpeg configuration
FFMPEG_PATH=/usr/bin/ffmpeg

# Stream directories
STREAMS_DIR=./public/streams
VIDEOS_DIR=./public/videos

# Optional: RTMP server
RTMP_SERVER_URL=rtmp://localhost/live
```

### 3. Docker Setup
The Dockerfile includes FFmpeg and all necessary dependencies:
```dockerfile
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    git
```

## 📊 Performance Optimizations

### 1. HLS Configuration
- **Segment duration**: 4 seconds
- **Playlist length**: 6 segments
- **Buffer size**: 60MB max
- **Live sync**: 3 segments
- **Back buffer**: 90 seconds

### 2. Adaptive Bitrate
- **Bandwidth estimation**: EWMA algorithm
- **Quality switching**: Smooth transitions
- **Fallback handling**: Graceful degradation

### 3. Memory Management
- **Process cleanup**: Automatic FFmpeg process termination
- **Buffer limits**: Configurable memory usage
- **Error recovery**: Automatic restart on failures

## 🎯 Usage Examples

### Starting a Live Stream
```typescript
// Teacher starts a live class
const response = await fetch(`/api/live-classes/${liveClassId}/start-stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inputUrl: 'rtmp://localhost/live/teacher-stream',
    quality: 'adaptive'
  })
});
```

### Uploading a Video with HLS Processing
```typescript
// Upload video with automatic HLS conversion
const response = await fetch(`/api/courses/${courseId}/videos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Introduction to React',
    description: 'Learn the basics of React',
    url: 'https://example.com/video.mp4',
    quality: 'adaptive'
  })
});
```

### Using the Enhanced Video Player
```tsx
<VideoPlayer
  videoId="video-123"
  courseId="course-456"
  videoUrl="https://example.com/video.m3u8"
  title="Introduction to React"
  description="Learn the basics of React"
  courseVideos={courseVideos}
  isLive={true}
  liveUrl="https://example.com/live.m3u8"
/>
```

## 🔍 Monitoring and Debugging

### Stream Status
- Check stream status via API
- Monitor viewer count and connection quality
- Track processing errors and recovery

### Logs
- FFmpeg process logs
- HLS.js error logs
- Stream lifecycle events

### Metrics
- Viewer count
- Connection quality
- Live latency
- Quality switching events

## 🚨 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Ensure FFmpeg is installed in Docker container
   - Check `FFMPEG_PATH` environment variable

2. **HLS streams not loading**
   - Verify CORS settings for stream URLs
   - Check HLS.js compatibility
   - Ensure proper MIME types

3. **High latency**
   - Adjust HLS segment duration
   - Optimize network settings
   - Check server performance

4. **Quality switching issues**
   - Verify bandwidth estimation
   - Check quality level configuration
   - Monitor network conditions

## 🔮 Future Enhancements

### Planned Features
- **WebRTC support**: Ultra-low latency streaming
- **Recording**: Automatic stream recording
- **Analytics**: Detailed streaming metrics
- **CDN integration**: Global content delivery
- **Multi-camera**: Multiple camera streams
- **Screen sharing**: Integrated screen capture

### Performance Improvements
- **GPU acceleration**: Hardware encoding support
- **Edge processing**: Distributed stream processing
- **Predictive quality**: ML-based quality switching
- **Bandwidth optimization**: Advanced compression

## 📚 Additional Resources

- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Video.js Documentation](https://videojs.com/docs/)
- [HLS Specification](https://tools.ietf.org/html/rfc8216)

## 🤝 Contributing

When contributing to the streaming system:

1. Test with different video formats
2. Verify HLS compatibility
3. Check performance impact
4. Update documentation
5. Add error handling

## 📄 License

This streaming system is part of the Learning Management System and follows the same license terms. 