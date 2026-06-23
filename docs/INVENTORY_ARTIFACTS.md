# Eclero 2.0 - Key Artifacts Inventory

## 1. PRISMA SCHEMA (Database Models, Relations, Enums)

**Location**: `./prisma/schema.prisma`

### Models:
1. **Profiles**
   - **Fields**: id (String, @id), email (String, @unique), name (String), role (String), bio (String?), avatar (String?), phone (String?), hourlyRate (Float?), availability (Json?), isAvailableNow (Boolean?), rating (Float?), education (Json?), experience (Json?), created_at (DateTime), updated_at (DateTime)
   - **Relations**: subjects (ProfilesOnSubjects[]), tutorSessions (Sessions[]), studentSessions (Sessions[])
   - **Note**: Uses Supabase auth.users.id as primary key

2. **Subjects**
   - **Fields**: id (String, @id, @default(uuid())), name (String), code (String?), grade (Int?), category (String?), created_at (DateTime), updated_at (DateTime)
   - **Relations**: profiles (ProfilesOnSubjects[])

3. **ProfilesOnSubjects** (Many-to-Many Junction)
   - **Fields**: profileId (String), subjectId (String), created_at (DateTime)
   - **Relations**: profile (Profiles), subject (Subjects)
   - **Primary Key**: [profileId, subjectId]

4. **Sessions**
   - **Fields**: id (String, @id, @default(uuid())), tutor_id (String), student_id (String), status (String, default: "pending"), topic (String?), notes (String?), created_at (DateTime), started_at (DateTime?), ended_at (DateTime?)
   - **Relations**: tutor (Profiles), student (Profiles)
   - **Status Values**: pending, accepted, declined, in_progress, completed, cancelled

### Database Provider:
- **Type**: PostgreSQL
- **Connection**: Uses DATABASE_URL environment variable

---

## 2. API ROUTES (/app/api) - REST ENDPOINTS

### Sessions API:
1. **POST /api/sessions/create**
   - **Method**: POST
   - **Input**: `{ tutorId, studentId, topic?, notes? }`
   - **Response**: `{ success: boolean, session?: object, error?: string }`
   - **Purpose**: Create new tutoring session

2. **GET /api/sessions/student**
   - **Method**: GET
   - **Input**: Query param `studentId`
   - **Response**: `{ success: boolean, sessions: array }`
   - **Purpose**: Get sessions where user is student

3. **GET /api/sessions/tutor**
   - **Method**: GET
   - **Input**: Query param `tutorId`
   - **Response**: `{ success: boolean, sessions: array }`
   - **Purpose**: Get sessions where user is tutor

4. **PATCH /api/sessions/update-status**
   - **Method**: PATCH
   - **Input**: `{ sessionId, status, userId }`
   - **Response**: `{ success: boolean, session?: object }`
   - **Purpose**: Update session status with authorization check

### Profiles API:
1. **POST /api/profiles/create**
   - **Method**: POST
   - **Input**: `{ id, email, name, role }`
   - **Response**: Profile object
   - **Purpose**: Create new user profile

2. **GET /api/profiles/get**
   - **Method**: GET
   - **Input**: Query param `email`
   - **Response**: `{ role: string }`
   - **Purpose**: Get basic profile info (role only)

3. **GET /api/profiles/get-full**
   - **Method**: GET
   - **Input**: Query param `email`
   - **Response**: Full profile object with subjects
   - **Purpose**: Get complete profile information

4. **PUT /api/profiles/update**
   - **Method**: PUT
   - **Input**: `{ email, firstName?, lastName?, name?, phone?, bio?, subjects?, hourlyRate?, education?, experience? }`
   - **Response**: Updated profile object
   - **Purpose**: Update profile with transaction handling for subjects

5. **PATCH /api/profiles/update-availability**
   - **Method**: PATCH
   - **Input**: `{ isAvailableNow: boolean, userEmail: string }`
   - **Response**: `{ id, email, isAvailableNow }`
   - **Purpose**: Toggle tutor availability status

6. **GET /api/profiles/available-tutors**
   - **Method**: GET
   - **Response**: `{ tutors: array }`
   - **Purpose**: Get all tutors with availability and subjects

### Subjects API:
1. **GET /api/subjects**
   - **Method**: GET
   - **Response**: Array of subjects ordered by category, grade, name
   - **Purpose**: Get all available subjects

### LiveKit API:
1. **POST /api/livekit/token**
   - **Method**: POST
   - **Input**: `{ room: string, user: string }`
   - **Response**: `{ token: string }`
   - **Purpose**: Generate LiveKit access token for video sessions

### Placeholder/Empty APIs:
- **POST /api/booking/create** - Empty export
- **POST /api/booking/cancel** - Empty export
- **POST /api/stripe/webhook** - Empty export

---

## 3. AUTH-RELATED LOGIC

### Supabase Client Configuration:
**Location**: `./lib/supabaseClient.ts`
- **Client**: Uses `@supabase/supabase-js`
- **Environment Variables**: 
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Auth Pages:

1. **Login Page** (`./app/auth/login/page.tsx`)
   - **Method**: `supabase.auth.signInWithPassword()`
   - **Flow**: 
     1. Sign in with email/password
     2. Fetch user role via `/api/profiles/get`
     3. Redirect to role-specific home page (`/home/student`, `/home/tutor`, `/home/admin`)
   - **Features**: Role-based routing, error handling
   - **Redirect Logic**: Based on user role from database

2. **Registration Page** (`./app/auth/register/page.tsx`)
   - **Method**: `supabase.auth.signUp()`
   - **Flow**:
     1. Create Supabase user account
     2. Update user metadata with name and role
     3. Create profile in database via `/api/profiles/create`
     4. Auto-login user
     5. Redirect to `/home`
   - **Features**: Role selection (student/tutor/admin), multi-step process

3. **Home Layout** (`./app/home/layout.tsx`)
   - **Auth Check**: `supabase.auth.getUser()`
   - **Protection**: Redirects to `/auth/login` if not authenticated
   - **User Data**: Fetches full profile for display name
   - **Features**: Session management, profile modal context

4. **Landing Page** (`./app/page.tsx`)
   - **Auth Links**: `/auth/login`, `/auth/register?role=student`, `/auth/register?role=tutor`
   - **Features**: Role-based registration links

### Middleware:
**Location**: `./middleware.ts`
- **Current State**: Empty/passthrough implementation
- **Purpose**: Could be used for route protection (not currently implemented)

---

## 4. LIVEKIT USAGE (Video Sessions)

### LiveKit Server Integration:
1. **Token Generation** (`./app/api/livekit/token/route.ts`)
   - **SDK**: `livekit-server-sdk`
   - **Method**: `AccessToken` class
   - **Environment Variables**: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - **Grants**: `roomJoin: true`, `canPublish: true`, `canSubscribe: true`
   - **Features**: Room-based access tokens with publishing permissions

2. **Client Component** (`./components/LiveKitRoom.tsx`)
   - **SDK**: `@livekit/components-react`, `livekit-client`
   - **Components**: `LiveKitRoom`, `RoomAudioRenderer`, `VideoTrack`, `useTracks`, `useDataChannel`, `useRoomContext`
   - **Features**: 
     - Token fetching from API with error handling
     - Loading states and connection management
     - Multi-view interface (whiteboard, file sharing, screen sharing)
     - Real-time collaboration via data channels
     - Screen sharing with browser compatibility detection
     - Multiple screen share management
     - Audio/video continuity during view switches
   - **Server URL**: `NEXT_PUBLIC_LIVEKIT_URL` or default cloud URL

### Screen Sharing Implementation:

#### Core Screen Share Utilities (`./lib/screenShare.ts`):
1. **Browser Compatibility Detection**:
   - **Mobile Detection**: Automatic detection via user agent
   - **Safari Version Check**: Ensures Safari 16+ for screen sharing support
   - **getDisplayMedia API**: Validates browser screen sharing capabilities
   - **Graceful Degradation**: Provides user-friendly error messages for unsupported browsers

2. **Screen Share Functions**:
   - **`startScreenShare(room)`**: Initiates screen sharing using LiveKit SDK
     - Uses `room.localParticipant.setScreenShareEnabled(true)`
     - Handles permission errors (NotAllowedError, NotFoundError, NotSupportedError)
     - Returns boolean success/failure status
   - **`stopScreenShare(room)`**: Stops active screen sharing
     - Uses `room.localParticipant.setScreenShareEnabled(false)`
     - Graceful handling when no share is active
   - **`isScreenSharing(room)`**: Checks current screen sharing status
   - **Error Handling**: Comprehensive error types with user-friendly messages

3. **State Management**:
   - **Track Management**: Monitors screen share tracks via LiveKit events
   - **Multi-participant**: Supports multiple simultaneous screen shares
   - **Priority System**: Most recent screen share takes precedence
   - **UI Synchronization**: Automatic view switching when screen sharing starts/stops

#### Screen Sharing Features:
1. **Automatic View Switching**: 
   - Switches to screen view when sharing starts
   - Maintains other views (whiteboard, files) in background
   - Audio/video streams continue uninterrupted

2. **Multiple Screen Share Support**:
   - Handles concurrent screen shares from different participants
   - UI selector for switching between active screen shares
   - Timestamp-based prioritization for display

3. **Permission Handling**:
   - Graceful error handling for permission denial
   - UI recovery after permission errors
   - Retry functionality maintained after errors

4. **Browser Compatibility**:
   - Mobile browser detection with disabled UI
   - Safari version validation (16+ required)
   - Feature detection for getDisplayMedia API
   - Contextual error messages for unsupported environments

### Collaborative Features:

#### Data Channel Integration:
1. **Real-time Communication**:
   - Topic: `eclero-collaboration`
   - **File Sharing**: Upload to Supabase storage, share via data channel
   - **Whiteboard Sync**: Real-time drawing synchronization using Tldraw
   - **Message Protocol**: JSON-based message format with type discrimination

2. **File Sharing Workflow**:
   - File upload to Supabase storage bucket (`eclero-storage`)
   - Public URL generation and secure sharing
   - Automatic view switching to file display
   - Support for images with preview, other files with download links

#### Whiteboard Integration:
1. **Tldraw Integration**: 
   - Collaborative drawing using Tldraw library
   - Real-time synchronization via LiveKit data channels
   - Custom SharePanel component for data channel integration

### LiveKit Integration Points:

1. **Student Sessions** (`./app/home/student/sessions/page.tsx`)
   - **Usage**: Join sessions as student with full screen sharing capabilities
   - **Room Names**: Generated as `session-${sessionId}-${timestamp}`
   - **Features**: Session management, status tracking, screen sharing receiving

2. **Tutor Inbox** (`./app/home/tutor/inbox/page.tsx`)
   - **Usage**: Start sessions as tutor with screen sharing initiation
   - **Features**: Session request management, status updates, screen sharing control
   - **Flow**: Accept request → Start session → LiveKit room with screen sharing

### Video Session Flow:
1. **Session Creation**: via `/api/sessions/create`
2. **Status Updates**: via `/api/sessions/update-status`
3. **Room Generation**: Dynamic room names (not stored in DB)
4. **Token Request**: `/api/livekit/token` with room and user identity
5. **Session Join**: LiveKit component with full video conference UI
6. **Screen Share Lifecycle**: Start → Permission → Track Management → Stop → Cleanup

### Testing Infrastructure:

#### Manual Testing (`./MANUAL_TESTS.md`):
1. **Cross-browser Testing**: Chrome, Firefox, Safari 16+, Edge
2. **Bidirectional Screen Sharing**: Tutor ↔ Student screen sharing
3. **Permission Handling**: Error recovery and retry scenarios
4. **View Switching**: Audio/video continuity during content switches
5. **Performance Testing**: Multiple screen shares, network conditions

#### Automated Testing (`./jest.config.js`, `./__tests__/`):
1. **Jest Configuration**: TypeScript support, jsdom environment, coverage collection
2. **LiveKit Mocking**: Comprehensive mocks for LiveKit SDK components
3. **Component Tests** (`__tests__/LiveKitRoom.test.tsx`):
   - Screen sharing state management
   - UI interactions and view switching
   - Error handling and recovery
   - Multiple screen share scenarios
   - Data channel integration
4. **Utility Tests** (`__tests__/screenShare.test.ts`):
   - Browser compatibility detection
   - Screen share function lifecycle
   - Permission error handling
   - Integration scenarios

### Error Handling & Recovery:
1. **Connection Errors**: Token fetch failures, network issues
2. **Permission Errors**: Screen sharing denial, browser restrictions
3. **Browser Compatibility**: Mobile detection, Safari version checks
4. **State Recovery**: UI consistency after errors, retry mechanisms
5. **Graceful Degradation**: Feature availability based on browser support

---

## 5. SUPPORTING LIBRARIES & UTILITIES

### Database:
- **Prisma Client**: `./lib/prisma.ts` - Database connection management
- **Connection**: Uses singleton pattern for client instance

### Booking Utilities:
- **Location**: `./lib/bookingUtils.ts`
- **Functions**: `bookSession()`, `getSessionsByStudent()`, `getSessionsByTutor()`
- **Purpose**: Abstraction layer for session management

### Package Dependencies:
- **LiveKit**: `@livekit/components-react`, `@livekit/components-styles`, `livekit-server-sdk`
- **Supabase**: `@supabase/supabase-js`
- **Prisma**: `@prisma/client`
- **UI**: Next.js 13+ App Router, React, TypeScript

---

## 6. ENVIRONMENT VARIABLES REQUIRED

### Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database:
- `DATABASE_URL` (PostgreSQL)

### LiveKit:
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_LIVEKIT_URL` (optional, has default)

---

## 7. KEY ARCHITECTURAL PATTERNS

### Authentication Flow:
1. Supabase Auth handles user creation/login
2. Database stores user profiles with roles
3. Role-based routing in application
4. Protected routes via layout authentication

### Session Management:
1. Sessions stored in PostgreSQL via Prisma
2. Real-time video via LiveKit
3. Status tracking through API endpoints
4. User authorization on session operations

### Data Flow:
1. **Auth**: Supabase → Profile API → Role-based routing
2. **Sessions**: Create via API → Status updates → LiveKit integration
3. **Profiles**: Prisma ORM → PostgreSQL → API endpoints

### Security:
- Server-side Supabase client for sensitive operations
- User authorization checks on session updates
- Role-based access control
- Protected API routes with user verification

---

*Generated: $(date)*
*Repository: Eclero 2.0 - Peer-to-Peer Tutoring Platform*
