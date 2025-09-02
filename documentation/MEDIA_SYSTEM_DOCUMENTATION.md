# Media Upload and Download System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Post Media Upload and Download](#post-media-upload-and-download)
4. [Profile Image Upload and Download](#profile-image-upload-and-download)
5. [Edge Functions](#edge-functions)
6. [Storage Configuration](#storage-configuration)
7. [Processing and Optimization](#processing-and-optimization)
8. [Code Locations](#code-locations)
9. [Database Schema](#database-schema)
10. [Troubleshooting](#troubleshooting)

## System Overview

The application uses a hybrid media handling system that combines:
- **External S3-compatible storage** (KOS/Krutrim Cloud) for media files
- **Supabase Edge Functions** for upload processing and retrieval
- **Local caching** for performance optimization
- **Client-side compression** for bandwidth efficiency

### Key Features
- Support for images (JPEG, PNG, WebP) and videos (MP4, MOV, AVI, WMV)
- Automatic image compression and optimization
- Video compression with thumbnail generation
- Offline caching with 2-minute expiry
- Progress tracking for uploads
- Custom thumbnail selection for videos
- Image cropping for profile pictures

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Flutter App   │    │ Supabase Edge    │    │ KOS Cloud       │
│                 │────│   Functions      │────│   Storage       │
│ • Image Picker  │    │ • upload-media   │    │ (S3-compatible) │
│ • Compression   │    │ • get-image      │    │                 │
│ • Cache Manager │    │ • upload-profile │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Post Media Upload and Download

### Upload Flow for Posts

1. **Media Selection**
   - Location: `/lib/features/presentation/pages/create_post_page.dart`
   - Methods: `_pickImage()`, `_pickVideo()`
   - Supports up to 4 images or 1 video per post
   - File type validation and size limits (50MB for videos)

2. **Image Compression**
   - Method: `_compressImage()` in `create_post_page.dart`
   - Quality: 82% (balanced quality/size)
   - Max dimensions: 1080x1080px
   - Removes EXIF data to reduce size
   - Uses `flutter_image_compress` and `dart:image` packages

3. **Video Processing**
   - Compression for files > 15MB using `video_compress`
   - Automatic thumbnail generation using `fc_native_video_thumbnail`
   - Custom thumbnail selection option
   - Video dimensions extraction

4. **Upload Process**
   - Method: `_uploadMediaToServer()` in `create_post_page.dart`
   - Converts files to base64 encoding
   - Calls edge function: `upload-post-media`
   - Progress tracking with visual feedback
   - Fallback to direct Supabase storage for large videos

5. **Post Creation**
   - Method: `createMediaPost()` in `/lib/features/data/repositories/post_repository_impl.dart`
   - Creates post record in database
   - Links media files through `post_media` table
   - Supports parent post ID for replies

### Download Flow for Posts

1. **URL Resolution**
   - S3 URLs converted to edge function URLs
   - Format: `https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url={encoded_s3_url}`

2. **Caching Strategy**
   - Component: `/lib/features/presentation/widgets/cached_image_widget.dart`
   - Cache manager: `/lib/core/services/cache_manager.dart`
   - 2-minute cache expiry
   - Offline support with cached content
   - Automatic cache cleanup

3. **Display Components**
   - `CachedImageWidget`: Generic cached image display
   - `CachedAvatarWidget`: Specialized for avatar images
   - Progressive loading with placeholders
   - Error handling with fallback widgets

## Profile Image Upload and Download

### Profile Picture Upload

1. **Image Selection and Cropping**
   - Location: `/lib/features/presentation/pages/edit_profile_page.dart`
   - Method: `_pickAndCropImage()`
   - Uses `image_picker` and `image_cropper` packages
   - Aspect ratio: 1:1 (square cropping)

2. **Upload Process**
   - Compression before upload
   - Base64 encoding
   - Calls edge function: `upload-profile-image`
   - Updates user record in database

3. **Banner Image Support**
   - Similar process to profile pictures
   - Different aspect ratios supported
   - Stored in same bucket with different paths

### Profile Image Display

- Uses same caching system as post media
- Avatar components with fallback icons
- Circular clipping for profile pictures

## Edge Functions

### 1. upload-post-media (`/functions/upload-post-media/index.js`)

**Purpose**: Handles upload of post media files (images and videos)

**Endpoint**: `https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/upload-post-media`

**Input Parameters**:
```json
{
  "imageData": "data:image/jpeg;base64,...",
  "fileName": "timestamp_filename.jpg",
  "userId": "user-uuid",
  "fileType": "image/jpeg",
  "isVideo": false,
  "videoWidth": 1920,
  "videoHeight": 1080
}
```

**Process**:
1. Validates input parameters
2. Decodes base64 data
3. Generates S3-compatible signature
4. Uploads to KOS cloud storage
5. Returns S3 URL

**Output**:
```json
{
  "imageUrl": "s3://ments-public/media/user-id/timestamp-filename.jpg",
  "fileType": "image/jpeg",
  "size": 1234567,
  "width": 1920,
  "height": 1080
}
```

### 2. upload-profile-image (`/supabase/functions/upload-profile-image/index.ts`)

**Purpose**: Handles profile and banner image uploads

**Endpoint**: `https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/upload-profile-image`

**Input Parameters**:
```json
{
  "imageData": "data:image/jpeg;base64,...",
  "fileName": "profile.jpg",
  "userId": "user-uuid"
}
```

**Process**:
1. Base64 decoding
2. Path generation: `avatars/{userId}/{timestamp}-{fileName}`
3. S3 signature generation
4. Upload to storage
5. Returns S3 URL

### 3. get-image (`/functions/get-image/index.js`)

**Purpose**: Retrieves and serves media files with caching and optimization

**Endpoint**: `https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image`

**Parameters**:
- `url`: S3 URL of the file (URL encoded)
- `thumbnail`: Optional parameter for video thumbnails

**Features**:
- MIME type detection based on file extension
- Range request support for video streaming
- Cache control headers (7 days for videos, 1 day for images)
- CORS support
- Video thumbnail generation (basic implementation)

**Process**:
1. Parses S3 URL
2. Generates signed request to KOS storage
3. Handles range requests for videos
4. Sets appropriate cache headers
5. Returns file content with proper MIME type

## Storage Configuration

### KOS Cloud Storage (S3-compatible)

**Credentials** (in edge functions):
- Access Key: `PSS4REXMS4CJ0TSVEJRL`
- Secret Key: `Q5uRU0AqA8GtnYfH6vR5Bc0LxmvQ7XVvXE5NtG6q`
- Host: `blr1.kos.olakrutrimsvc.com`

**Bucket**: `ments-public`

**Directory Structure**:
```
ments-public/
├── media/
│   └── {userId}/
│       ├── {timestamp}-{filename}.jpg
│       └── {timestamp}-{filename}.mp4
├── avatars/
│   └── {userId}/
│       └── {timestamp}-{filename}.jpg
└── project-media/
    └── {userId}/
        └── {filename}
```

### Supabase Storage (Fallback)

- Used for large video files that exceed edge function limits
- Bucket: `media`
- Path: `post_media/{fileName}`

## Processing and Optimization

### Image Compression

**Settings**:
- Quality: 82%
- Max dimensions: 1080x1080px
- Format conversion: PNG → JPEG for better compression
- EXIF data removal

**Process**:
1. Check original file size
2. Apply compression if > 5MB
3. Resize if dimensions exceed limits
4. Convert format if beneficial
5. Log compression results

### Video Compression

**Triggers**: Files > 15MB
**Settings**:
- Quality: HighestQuality (preserves visual quality)
- Audio: Included
- Frame rate: Original preserved
- Timeout: 5 minutes

### Thumbnail Generation

**For Videos**:
- Generated automatically on upload
- Dimensions: 1280x720px (maintains aspect ratio)
- Quality: 82%
- Format: JPEG
- Custom thumbnail selection supported

### Caching Strategy

**Local Cache**:
- Manager: `/lib/core/services/cache_manager.dart`
- Expiry: 2 minutes
- Size limit management
- Offline support
- Automatic cleanup

**HTTP Cache**:
- Videos: 7 days + 1 day stale-while-revalidate
- Images: 1 day
- Thumbnails: 1 day

## Code Locations

### Core Files

| File | Purpose |
|------|---------|
| `/lib/core/services/media_upload_service.dart` | Project media upload service |
| `/lib/core/services/cache_manager.dart` | Local caching system |
| `/lib/features/presentation/widgets/cached_image_widget.dart` | Cached image display components |

### Post Media

| File | Purpose |
|------|---------|
| `/lib/features/presentation/pages/create_post_page.dart` | Post creation with media upload |
| `/lib/features/data/repositories/post_repository_impl.dart` | Post creation repository |
| `/lib/features/data/models/post_media_model.dart` | Media data model |

### Profile Media

| File | Purpose |
|------|---------|
| `/lib/features/presentation/pages/edit_profile_page.dart` | Profile image upload |
| `/lib/features/presentation/pages/onboard/set_profile_picture.dart` | Onboarding profile setup |

### Edge Functions

| File | Purpose |
|------|---------|
| `/functions/upload-post-media/index.js` | Post media upload handler |
| `/functions/get-image/index.js` | Media retrieval and serving |
| `/supabase/functions/upload-profile-image/index.ts` | Profile image upload |

### Database Models

| File | Purpose |
|------|---------|
| `/lib/features/data/models/post_media_model.dart` | Post media structure |
| `/lib/features/auth/data/models/user_model.dart` | User profile data |

## Database Schema

### post_media Table
```sql
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL, -- 'photo' or 'video'
  thumbnail_url TEXT, -- For videos
  width INTEGER, -- Media dimensions
  height INTEGER,
  file_size BIGINT, -- File size in bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### users Table (relevant fields)
```sql
-- Profile images stored in users table
avatar_url TEXT, -- Profile picture URL
banner_url TEXT  -- Banner image URL (if implemented)
```

## Error Handling

### Common Issues and Solutions

1. **Upload Timeout**
   - Videos > 50MB may timeout
   - Implement chunked upload for large files
   - Show progress indicators

2. **Compression Failures**
   - Fallback to original file if compression fails
   - Log compression attempts for debugging

3. **Network Issues**
   - Offline caching provides graceful degradation
   - Retry mechanisms for failed uploads

4. **Storage Quota**
   - Monitor storage usage
   - Implement file size limits
   - Cleanup old cached files

### Monitoring

- Upload success/failure rates logged
- Compression statistics tracked
- Cache hit/miss ratios monitored
- File size distributions analyzed

## Security Considerations

1. **File Type Validation**: Only allowed formats accepted
2. **Size Limits**: Prevent abuse with reasonable limits
3. **Authentication**: All uploads require valid user session
4. **Content Scanning**: Consider implementing content moderation
5. **Access Control**: S3 URLs are public but obscured

## Performance Optimizations

1. **Progressive Loading**: Images load with placeholders
2. **Cache Management**: 2-minute expiry balances freshness/performance
3. **Compression**: Reduces bandwidth and storage costs
4. **CDN Benefits**: Edge functions provide global distribution
5. **Memory Management**: Dispose of resources properly

## Future Improvements

1. **Chunked Upload**: For very large files
2. **WebP Support**: Better compression ratios
3. **Advanced Video Processing**: Better thumbnail extraction
4. **Content Delivery**: Dedicated CDN integration
5. **Analytics**: Upload/download metrics tracking

This documentation provides a comprehensive overview of the media handling system in the application, covering all aspects from user interaction to storage and retrieval.