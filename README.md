# CivicSnap

CivicSnap is a civic engagement web application that empowers citizens to report local infrastructure issues and track their resolution. By simply uploading a photo, the platform automatically extracts geographic data, routes the complaint to the correct municipal ward, and allows the community to track and upvote issues.

## 🌟 Key Features

* **Automated Location Tracking**: Extracts GPS metadata (Exif) directly from uploaded images to accurately map the issue.
* **Smart Spatial Routing**: Utilizes PostGIS spatial queries (`ST_Contains`) to automatically route complaints to the appropriate administrative ward based on coordinates.
* **Duplicate Detection**: Prevents redundant reporting by checking for similar active issues within a 20-meter radius (`ST_DWithin`) before accepting new submissions.
* **Civic Media Feed**: A community feed where users can view ongoing complaints in their area and upvote them to raise priority.
* **Image Compression**: Compresses images on the backend before securely uploading them to Supabase Storage.

## 🛠 Architecture & Tech Stack

### Frontend Overview
The frontend is built as a Single Page Application (SPA) using React 19 and Vite. It handles user authentication, media processing, and provides tailored dashboards for different user roles.

* **Core Framework:** React 19, React Router DOM
* **Styling & UI:** Tailwind CSS v4, Framer Motion for animations, Lucide React for icons.
* **Client-side Processing:** Uses `exif-js` to read image metadata before submission.
* **Primary Routes:**
  * `/` - Landing Page
  * `/dashboard` - User's personal overview (Protected)
  * `/report` - Issue submission portal (Protected)
  * `/civic-media` - Public community feed
  * `/admin/issues` - Dedicated administrative management view

### Backend Overview
* **Framework:** Python Flask REST API.
* **Database & Storage:** Supabase (PostgreSQL with PostGIS extension for geospatial queries, and Supabase Storage for images).

---

## 📂 Project Structure

```text
CivicSnap/
├── backend/
│   ├── app.py                # Main Flask application and REST API endpoints
│   ├── helper.py             # Utility functions (GPS extraction, image compression, DB connection)
│   ├── init.sql              # Database schema, PostGIS configuration, and initial setup
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── public/               # Static assets (icons, web manifest, logos)
│   ├── src/
│   │   ├── components/       # Reusable React components (Layout, ProtectedRoute, Modals)
│   │   ├── context/          # React Context providers (AuthContext)
│   │   ├── lib/              # Utility classes and Supabase client initialization (supabase.ts, utils.ts)
│   │   ├── pages/            # Page-level components corresponding to routes (Home, Dashboard, etc.)
│   │   ├── App.tsx           # Main application routing definition
│   │   ├── main.tsx          # React application entry point
│   │   └── index.css         # Global Tailwind styles
│   ├── index.html            # Main HTML template
│   ├── package.json          # Node.js dependencies and run scripts
│   ├── vite.config.ts        # Vite build configuration
│   └── netlify.toml          # Deployment configuration for Netlify
├── .gitignore                # Git exclusion rules
└── README.md                 # This documentation file
```

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+ recommended)
* Python 3.8+
* A Supabase Project (with PostGIS enabled)

### Environment Setup

#### 1. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create and activate a virtual environment.
3. Install dependencies: `pip install -r requirements.txt`
4. Create a `.env` file in the `backend` directory and add the following variables:
   ```env
   # Database Connection
   DB_HOST=your_database_host
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASS=your_database_password
   DB_PORT=5432

   # Supabase Credentials
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_service_role_key
   SUPABASE_BUCKET=your_storage_bucket_name
   ```
5. Run the Flask server: `python app.py` (Server will start on port 5000).

#### 2. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install the necessary packages: `npm install`
3. Create a `.env` file for your Supabase frontend credentials and API base URL:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_BASE_URL=http://localhost:5000
   ```
4. Start the Vite development server: `npm run dev` (The frontend will be available at `http://localhost:3000`).

---

## 📡 API Endpoints Summary

The Flask backend exposes several REST endpoints under `/api/v1/`:

* **`GET /`** - Health check
* **`POST /api/v1/report`** - Submit a new issue (requires image with GPS metadata)
* **`GET /api/v1/complaints/user/<phone_number>`** - Fetch complaints reported by a specific user
* **`GET /api/v1/complaints/ward?lat=&lon=`** - Fetch complaints surrounding a specific geographic coordinate
* **`GET /api/v1/admin/complaints`** - Admin route to view complaints (filters by admin's allocated ward)
* **`PATCH /api/v1/admin/complaints/<issue_id>/status`** - Admin route to update issue statuses (`pending`, `in_progress`, `resolved`, `rejected`)
* **`POST /api/v1/complaints/<issue_id>/vote`** - Increment community upvotes for a specific issue
* **`GET /api/v1/wards`** - Fetch the list of available wards