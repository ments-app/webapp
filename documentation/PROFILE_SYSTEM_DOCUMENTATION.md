# Profile System Implementation Documentation

## Overview

This document provides comprehensive documentation for the profile page system in the Ments Flutter application. It covers all aspects needed to implement the same functionality in a Next.js web application using the same Supabase backend.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Profile Page Implementation](#profile-page-implementation)
4. [Edit Profile Functionality](#edit-profile-functionality)
5. [Experience Management System](#experience-management-system)
6. [Portfolio Management](#portfolio-management)
7. [Media Handling & File Uploads](#media-handling--file-uploads)
8. [Authentication Integration](#authentication-integration)
9. [API Endpoints & Database Operations](#api-endpoints--database-operations)
10. [Data Models](#data-models)
11. [Error Handling](#error-handling)
12. [Performance Optimizations](#performance-optimizations)
13. [Next.js Implementation Guide](#nextjs-implementation-guide)

## System Architecture

### High-Level Architecture
The profile system follows Clean Architecture principles with the following layers:

```
Presentation Layer (UI)
├── Profile Page (/lib/features/presentation/pages/profile_page.dart)
├── Edit Profile Page (/lib/features/presentation/pages/edit_profile_page.dart)
├── Experience Pages (/lib/features/presentation/pages/exprience/)
├── Portfolio Pages (/lib/features/presentation/pages/edit_portfolio_page.dart)
└── Widgets (/lib/features/presentation/widgets/)

Data Layer (Repository Pattern)
├── User Model (/lib/features/data/models/user_model.dart)
├── Experience Model (/lib/features/auth/data/models/experience_model.dart)
├── Portfolio Model (/lib/features/auth/data/models/portfolio_model.dart)
└── Repository Implementations

Backend (Supabase)
├── Database Tables (users, work_experiences, positions, portfolios, portfolio_platforms)
├── Edge Functions (upload-profile-image, get-image)
├── Storage Buckets (ments-public)
└── Row Level Security (RLS) Policies
```

### Key Components
- **Profile Display**: Shows user information, experience timeline, portfolios, and posts
- **Profile Editing**: Form-based editing with image upload capabilities
- **Experience Management**: Timeline-based experience and position management
- **Portfolio Management**: Platform-based portfolio links with preview
- **Media Upload**: S3-compatible storage with compression and processing

## Database Schema

### Primary Tables

#### 1. Users Table
```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  about text,
  current_city text,
  tagline text,
  user_type text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  banner_image text,
  is_verified boolean DEFAULT false,
  is_onboarding_done boolean DEFAULT false
);
```

**Key Fields:**
- `id`: UUID primary key (linked to Supabase Auth)
- `username`: Unique identifier for user profiles
- `full_name`: Display name
- `about`: Bio/description (max 250 characters)
- `tagline`: Professional headline (max 60 characters)
- `avatar_url`: Profile picture URL (S3 path)
- `banner_image`: Banner image URL (S3 path)
- `is_verified`: Verification badge status

#### 2. Work Experiences Table
```sql
CREATE TABLE public.work_experiences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  domain text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
```

#### 3. Positions Table
```sql
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id uuid REFERENCES public.work_experiences(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
```

#### 4. Portfolios Table
```sql
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);
```

#### 5. Portfolio Platforms Table
```sql
CREATE TABLE public.portfolio_platforms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE,
  platform text NOT NULL,
  link text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

### Indexes for Performance
```sql
-- User lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Experience queries
CREATE INDEX idx_work_experiences_user_id ON work_experiences(user_id);
CREATE INDEX idx_work_experiences_sort_order ON work_experiences(sort_order);
CREATE INDEX idx_positions_experience_id ON positions(experience_id);
CREATE INDEX idx_positions_sort_order ON positions(sort_order);

-- Portfolio queries
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolio_platforms_portfolio_id ON portfolio_platforms(portfolio_id);
```

## Profile Page Implementation

### Main Profile Page Structure
**File:** `/lib/features/presentation/pages/profile_page.dart`

The profile page is a complex StatefulWidget with multiple tabs and sections:

#### Key Features:
1. **Header Section**
   - Banner image with gradient overlay
   - Profile picture with edit button
   - User info (name, username, tagline, verification badge)
   - Follow/Edit buttons
   - Stats (followers, following, posts)

2. **Tab System**
   - Posts tab with user's posts and replies
   - Experience tab with timeline view
   - Portfolio tab with platform links
   - Projects tab (if available)

3. **Performance Optimizations**
   - Cached network images with memory limits
   - Debounced API calls
   - Pagination for posts
   - RepaintBoundary widgets for expensive UI

#### Core Data Loading:
```dart
Future<void> _fetchProfileData() async {
  // Parallel data fetching for better performance
  final futures = await Future.wait([
    // User profile data
    supabase.from('users').select().eq('id', userId).single(),
    
    // Experience with positions
    supabase.from('work_experiences')
      .select('*, positions(*)')
      .eq('user_id', userId),
    
    // Portfolios with platforms
    supabase.from('portfolios')
      .select('*, portfolio_platforms(*)')
      .eq('user_id', userId),
    
    // User posts
    _fetchUserPosts(),
  ]);
}
```

### UI Components Structure:
```
ProfilePage
├── AppBar (with settings button)
├── SingleChildScrollView
  ├── Hero Section (banner + profile info)
  ├── Stats Section (followers, following, posts)
  ├── Action Buttons (Edit Profile / Follow)
  ├── TabBar (Posts, Experience, Portfolio, Projects)
  └── TabBarView
    ├── PostsTab (PostCard widgets)
    ├── ExperienceTab (ExperienceTimelineTile widgets)
    ├── PortfolioTab (PortfolioPlatformTile widgets)
    └── ProjectsTab (ProjectCard widgets)
```

## Edit Profile Functionality

### Edit Profile Page Structure
**File:** `/lib/features/presentation/pages/edit_profile_page.dart`

#### Key Features:
1. **Image Upload System**
   - Profile picture and banner image upload
   - Image cropping with aspect ratio constraints
   - Image compression and optimization
   - S3-compatible storage upload

2. **Form Fields**
   - Full Name (required)
   - Username (required, unique, lowercase)
   - Tagline (60 character limit)
   - About/Bio (250 character limit)
   - All with real-time validation

3. **Advanced UI Features**
   - Glass morphism design
   - Smooth animations and transitions
   - Loading states with progress indicators
   - Error handling with user-friendly messages

#### Form Validation Rules:
```dart
// Username validation
- Lowercase only (enforced by TextInputFormatter)
- Alphanumeric and underscore only
- Must be unique across all users
- Required field

// Character limits
- Tagline: 60 characters max
- About: 250 characters max
- Full Name: Required, no specific limit

// Image constraints
- Profile: 1:1 aspect ratio, min 800x800px
- Banner: 348:112 aspect ratio, min 1200x400px
```

#### Update Profile API Call:
```dart
Future<void> _updateProfile() async {
  // Check username uniqueness
  final usernameCheck = await supabase
    .from('users')
    .select()
    .eq('username', username)
    .neq('id', currentUserId);
    
  if (usernameCheck.isNotEmpty) {
    throw Exception('Username already taken');
  }
  
  // Update profile
  await supabase.from('users').update({
    'full_name': fullName,
    'username': username.toLowerCase(),
    'about': bio,
    'tagline': tagline,
  }).eq('id', currentUserId);
}
```

## Experience Management System

### Experience Data Structure
The experience system uses a two-level hierarchy:
- **Work Experience**: Company-level information
- **Positions**: Individual roles within companies

#### Experience Page Structure:
**File:** `/lib/features/presentation/pages/exprience/edit_experience_page.dart`

#### Key Features:
1. **Company Grouping**: Multiple experiences at the same company are grouped
2. **Position Management**: Each company can have multiple positions
3. **Drag-and-Drop Ordering**: Custom sort order for both companies and positions
4. **Timeline Visualization**: Visual timeline showing career progression

#### Data Models:
```dart
class Experience {
  final String id;
  final String companyName;
  final String description;
  final List<Position> positions;
}

class Position {
  final String id;
  final String experienceId;
  final String title;
  final DateTime? startDate;
  final DateTime? endDate;
  final String description;
}
```

#### Database Operations:
```dart
// Fetch experiences with embedded positions
final data = await supabase
  .from('work_experiences')
  .select('*, positions(*)')
  .eq('user_id', userId);

// Create new experience
await supabase.from('work_experiences').insert({
  'user_id': userId,
  'company_name': companyName,
  'domain': domain,
  'sort_order': sortOrder,
});

// Create new position
await supabase.from('positions').insert({
  'experience_id': experienceId,
  'title': title,
  'start_date': startDate?.toIso8601String(),
  'end_date': endDate?.toIso8601String(),
  'description': description,
  'sort_order': sortOrder,
});
```

### Experience Timeline Widget
**File:** `/lib/features/presentation/widgets/experience_timeline_tile.dart`

Creates a visual timeline showing:
- Company information with domain
- Multiple positions with date ranges
- Current position indicators
- Responsive design for mobile/desktop

## Portfolio Management

### Portfolio System Architecture
**File:** `/lib/features/presentation/pages/edit_portfolio_page.dart`

#### Key Features:
1. **Multiple Portfolios**: Users can have multiple portfolio collections
2. **Platform Integration**: Support for major platforms (GitHub, Figma, Dribbble, etc.)
3. **Custom Links**: Support for custom platform links
4. **Platform Icons**: SVG icons for supported platforms
5. **Link Validation**: URL validation for portfolio links

#### Supported Platforms:
```dart
final List<String> availablePlatforms = [
  'github',      // Code repositories
  'figma',       // Design files
  'dribbble',    // Design portfolio
  'behance',     // Creative work
  'linkedin',    // Professional profile
  'youtube',     // Video content
  'notion',      // Documents
  'substack',    // Articles
  'custom',      // Custom links
];
```

#### Data Operations:
```dart
// Create new portfolio
await supabase.from('portfolios').insert({
  'user_id': userId,
  'title': title,
  'description': description,
});

// Add platform to portfolio
await supabase.from('portfolio_platforms').insert({
  'portfolio_id': portfolioId,
  'platform': platform,
  'link': link,
});

// Fetch portfolios with platforms
final portfolios = await supabase
  .from('portfolios')
  .select('*, portfolio_platforms(*)')
  .eq('user_id', userId);
```

#### Platform Icon System:
```dart
String getIconName() {
  switch (platform.toLowerCase()) {
    case 'github':
      return 'assets/platforms/github.svg';
    case 'figma':
      return 'assets/platforms/figma.svg';
    // ... more platforms
    default:
      return 'assets/platforms/custom.svg';
  }
}
```

## Media Handling & File Uploads

### Image Upload Architecture
The system uses a sophisticated image upload pipeline with compression and S3 storage.

#### Upload Process Flow:
1. **Image Selection**: Uses `image_picker` package
2. **Image Cropping**: Uses `image_cropper` with aspect ratio constraints
3. **Image Processing**: Compression in isolate for performance
4. **Upload to S3**: Via Supabase Edge Function
5. **Database Update**: Store S3 URL in user profile

### Edge Functions

#### Upload Profile Image Function
**File:** `/supabase/functions/upload-profile-image/index.ts`

```typescript
const KOS_ACCESS_KEY = 'PSS4REXMS4CJ0TSVEJRL';
const KOS_SECRET_KEY = 'Q5uRU0AqA8GtnYfH6vR5Bc0LxmvQ7XVvXE5NtG6q';

// Process: base64 decode → S3 upload → return URL
const uploadUrl = `https://${host}/${bucketName}/${filePath}`;
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'image/jpeg',
  },
  body: binaryData,
});
```

#### Get Image Function
**File:** `/supabase/functions/get-image/index.ts`

Serves images from S3 storage with authentication and caching headers.

### Image Processing Pipeline:
```dart
// 1. Pick and crop image
final croppedFile = await ImageCropper().cropImage(
  sourcePath: pickedFile.path,
  aspectRatio: CropAspectRatio(ratioX: 1, ratioY: 1),
);

// 2. Compress in isolate
final base64Image = await compute(_processImageInIsolate, {
  'imagePath': croppedFile.path,
  'quality': 85,
  'minWidth': 800,
  'minHeight': 800,
});

// 3. Upload to server
final imageUrl = await _uploadImageToServer(base64Image);

// 4. Update profile
await supabase.from('users').update({
  'avatar_url': imageUrl,
}).eq('id', userId);
```

### Storage Configuration:
- **Bucket**: `ments-public`
- **Path Structure**: `avatars/{userId}/{timestamp}-{filename}`
- **URL Format**: `s3://ments-public/avatars/...`
- **Access**: Public read, authenticated write

## Authentication Integration

### User Authentication Flow
The profile system integrates with Supabase Auth for user management.

#### Authentication Check:
```dart
final User? user = supabase.auth.currentUser;
if (user == null) {
  // Redirect to login
  return;
}
```

#### Session Management:
```dart
// Get current session for API calls
final session = supabase.auth.currentSession;
if (session == null) return null;

// Use session token for Edge Function calls
headers: {
  'Authorization': 'Bearer ${session.accessToken}',
}
```

### Row Level Security (RLS)
Database tables use RLS policies for security:

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Similar policies for experiences, portfolios, etc.
```

## API Endpoints & Database Operations

### Core Database Queries

#### 1. Get User Profile:
```sql
SELECT * FROM users WHERE id = $1;
```

#### 2. Get User Experiences:
```sql
SELECT we.*, p.* 
FROM work_experiences we
LEFT JOIN positions p ON we.id = p.experience_id
WHERE we.user_id = $1
ORDER BY we.sort_order, p.sort_order;
```

#### 3. Get User Portfolios:
```sql
SELECT port.*, pp.*
FROM portfolios port
LEFT JOIN portfolio_platforms pp ON port.id = pp.portfolio_id
WHERE port.user_id = $1;
```

#### 4. Update Profile:
```sql
UPDATE users 
SET full_name = $1, username = $2, about = $3, tagline = $4
WHERE id = $5;
```

#### 5. Username Uniqueness Check:
```sql
SELECT id FROM users 
WHERE username = $1 AND id != $2;
```

### Edge Function Endpoints

#### 1. Upload Profile Image:
- **URL**: `https://{supabase_url}/functions/v1/upload-profile-image`
- **Method**: POST
- **Auth**: Bearer token required
- **Payload**: 
  ```json
  {
    "imageData": "data:image/jpeg;base64,...",
    "fileName": "profile_123456789.jpg",
    "userId": "user-uuid",
    "imageType": "profile" // or "banner"
  }
  ```
- **Response**:
  ```json
  {
    "imageUrl": "s3://ments-public/avatars/user-uuid/timestamp-filename.jpg"
  }
  ```

#### 2. Get Image:
- **URL**: `https://{supabase_url}/functions/v1/get-image?url={s3_url}`
- **Method**: GET
- **Response**: Binary image data with caching headers

## Data Models

### 1. User Model
```dart
class UserModel {
  final String id;
  final String email;
  final String username;
  final String fullName;
  final String? about;
  final String? currentCity;
  final String? tagline;
  final String userType;
  final DateTime? createdAt;
  final String? avatarUrl;
  final String? bannerImage;
  final bool isVerified;
}
```

### 2. Experience Model
```dart
class Experience {
  final String id;
  final String companyName;
  final String description;
  final List<Position> positions;
}

class Position {
  final String id;
  final String experienceId;
  final String title;
  final DateTime? startDate;
  final DateTime? endDate;
  final String description;
}
```

### 3. Portfolio Model
```dart
class Portfolio {
  final String id;
  final String userId;
  final String title;
  final String? description;
  final String? createdAt;
  final List<PortfolioPlatform> platforms;
}

class PortfolioPlatform {
  final String id;
  final String portfolioId;
  final String platform;
  final String link;
  final String? createdAt;
}
```

## Error Handling

### Error Handling Patterns

#### 1. Database Errors:
```dart
try {
  await supabase.from('users').update(data).eq('id', userId);
} catch (e) {
  throw Exception('Failed to update profile: ${e.toString()}');
}
```

#### 2. Network Errors:
```dart
try {
  final response = await http.post(uploadUrl, body: data);
  if (response.statusCode != 200) {
    throw Exception('Upload failed: ${response.statusCode}');
  }
} catch (e) {
  // Handle network errors
}
```

#### 3. User-Friendly Messages:
```dart
class ErrorHandler {
  static String getUserFriendlyMessage(dynamic error) {
    if (error.toString().contains('username')) {
      return 'This username is already taken';
    }
    if (error.toString().contains('network')) {
      return 'Please check your internet connection';
    }
    return 'Something went wrong. Please try again';
  }
}
```

#### 4. UI Error Display:
```dart
void _showSnackBar(String message, {bool isError = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: isError ? Colors.red : Colors.green,
      behavior: SnackBarBehavior.floating,
    ),
  );
}
```

## Performance Optimizations

### 1. Database Optimizations
- **Eager Loading**: Fetch related data in single queries
- **Indexes**: Proper indexing on frequently queried columns
- **Pagination**: Limit data returned per request
- **Caching**: 2-minute cache for profile data

### 2. Image Optimizations
- **Compression**: Reduce image size before upload
- **Aspect Ratios**: Enforce consistent image dimensions
- **Caching**: CachedNetworkImage with memory limits
- **Lazy Loading**: Load images as needed

### 3. UI Optimizations
- **RepaintBoundary**: Prevent unnecessary repaints
- **Animation Controllers**: Efficient animations
- **Debouncing**: Prevent excessive API calls
- **Memory Management**: Proper disposal of controllers

### 4. Code Optimizations
- **Compute Isolates**: Heavy processing in isolates
- **Cached Values**: Store frequently accessed data
- **Single setState**: Batch state updates
- **Widget Reuse**: Reusable UI components

## Next.js Implementation Guide

### Required Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/auth-helpers-nextjs": "^0.7.0",
    "next": "^13.0.0",
    "react": "^18.0.0",
    "react-dropzone": "^14.0.0",
    "react-image-crop": "^10.0.0",
    "sharp": "^0.32.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "@tanstack/react-query": "^4.0.0"
  }
}
```

### 1. Database Setup
Use the same Supabase project with identical table structure. Enable RLS and set up the same policies.

### 2. Authentication Setup
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()
```

### 3. Profile Page Component
```typescript
// components/ProfilePage.tsx
import { useUser } from '@supabase/auth-helpers-react'
import { useQuery } from '@tanstack/react-query'

export default function ProfilePage({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId),
  })

  const { data: experiences } = useQuery({
    queryKey: ['experiences', userId],
    queryFn: () => fetchUserExperiences(userId),
  })

  // ... component implementation
}
```

### 4. API Routes
```typescript
// pages/api/profile/update.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { fullName, username, about, tagline } = req.body
  
  // Check username uniqueness
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .single()

  if (existingUser) {
    return res.status(400).json({ error: 'Username already taken' })
  }

  // Update profile
  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName, username, about, tagline })
    .eq('id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
```

### 5. Image Upload Component
```typescript
// components/ImageUpload.tsx
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function ImageUpload({ onUpload, type = 'profile' }) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Convert to base64
    const base64 = await fileToBase64(file)
    
    // Upload via Edge Function
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64,
        fileName: file.name,
        imageType: type,
      }),
    })

    const result = await response.json()
    onUpload(result.imageUrl)
  }, [onUpload, type])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drop image here or click to select</p>
    </div>
  )
}
```

### 6. Form Validation
```typescript
// lib/validation.ts
import { z } from 'zod'

export const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string()
    .min(1, 'Username is required')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  tagline: z.string().max(60, 'Tagline must be 60 characters or less').optional(),
  about: z.string().max(250, 'About must be 250 characters or less').optional(),
})
```

### 7. Data Fetching Utilities
```typescript
// lib/api.ts
export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
    
  if (error) throw error
  return data
}

export async function fetchUserExperiences(userId: string) {
  const { data, error } = await supabase
    .from('work_experiences')
    .select('*, positions(*)')
    .eq('user_id', userId)
    .order('sort_order')
    
  if (error) throw error
  return data
}

export async function fetchUserPortfolios(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*, portfolio_platforms(*)')
    .eq('user_id', userId)
    
  if (error) throw error
  return data
}
```

### Key Implementation Differences:
1. **State Management**: Use React Query instead of setState
2. **Routing**: Next.js App Router or Pages Router
3. **Authentication**: Supabase Auth Helpers for Next.js
4. **Image Processing**: Sharp instead of Flutter image packages
5. **File Upload**: FormData and fetch instead of isolate processing
6. **Styling**: Tailwind CSS or styled-components instead of Flutter widgets

### Recommended File Structure:
```
src/
├── components/
│   ├── Profile/
│   │   ├── ProfilePage.tsx
│   │   ├── EditProfileForm.tsx
│   │   ├── ExperienceSection.tsx
│   │   ├── PortfolioSection.tsx
│   │   └── ImageUpload.tsx
│   └── ui/ (reusable components)
├── pages/
│   ├── api/
│   │   ├── profile/
│   │   ├── experiences/
│   │   └── portfolios/
│   └── profile/
├── lib/
│   ├── supabase.ts
│   ├── api.ts
│   ├── validation.ts
│   └── utils.ts
└── types/
    └── database.ts
```

This documentation provides all the necessary information to implement the same profile system functionality in Next.js while maintaining compatibility with the existing Supabase backend and data structure.