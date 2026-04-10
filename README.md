# CivicSnap - Frontend

The frontend repository for **CivicSnap**, a location-aware civic issue reporting platform. This application provides a seamless, mobile-responsive interface for citizens to report local issues, view community feeds, and upvote existing problems. It also includes a secure, dedicated dashboard for city administrators to track and manage reports.

## ✨ Key Features

* **Phone-Based Authentication:** Secure, singup using OTPs via Supabase Auth.
* **Role-Based Routing:** Dynamic navigation and protected routes that instantly adapt based on whether the user is a `citizen` or an `admin`.
* **Smart Reporting Flow:** Users can upload photos, select categories, and provide descriptions. The app connects with the backend to verify GPS metadata and detect duplicates.
* **Duplicate Detection & Upvoting:** If a user tries to report an issue that already exists within a 20-meter radius, the UI intuitively prompts them to "Upvote" the existing issue instead of creating a duplicate.
* **Local Civic Feed:** A geolocation-powered feed that automatically shows users the reported issues specific to their current city ward.
* **Admin Control Panel:** A comprehensive dashboard for admins to view high-priority (highly upvoted) issues, view full-screen evidence, check locations on Google Maps, and update resolution statuses in real-time.

## 🛠️ Tech Stack

* **Framework:** [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Routing:** [React Router v6](https://reactrouter.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **API Requests:** [Axios](https://axios-http.com/)
* **Authentication / BaaS:** [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)

## 📁 Project Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── IssueDetailsModal.tsx  # Shared modal for viewing issue details & voting
│   │   └── Logo.tsx               # Application logo component
│   ├── context/
│   │   └── AuthContext.tsx        # Global state for Supabase user session & roles
│   ├── lib/
│   │   └── supabase.ts            # Supabase client initialization
│   ├── pages/
│   │   ├── AdminIssues.tsx        # Protected admin management table
│   │   ├── CivicMedia.tsx         # Public, location-based issue feed
│   │   ├── Dashboard.tsx          # Citizen's personal report history
│   │   ├── Report.tsx             # Issue submission form with duplicate detection
│   │   └── Signup.tsx             # Phone OTP & role-selection registration
│   ├── App.tsx                    # Route definitions and route protection
│   ├── Layout.tsx                 # Dynamic Navbar and mobile bottom-nav wrapper
│   └── main.tsx                   # React DOM entry point
├── public/                        # Static assets
├── .env                           # Environment variables (Not in version control)
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind theme configuration
└── vite.config.ts                 # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

* Node.js (v16 or higher)
* npm or yarn
* The [CivicSnap Flask Backend](https://github.com/aswin7512/CivicSnap) running locally or deployed.

### 1. Installation

Clone the repository, checkout the frontend branch, and install the dependencies:

```bash
git clone https://github.com/aswin7512/CivicSnap.git
git checkout frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the root of the frontend directory. You will need your Supabase keys and the URL pointing to your Flask backend API.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api/v1  # Points to your Flask backend
```

### 3. Running the Development Server

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🔐 Authentication & Roles

This application relies on custom `user_metadata` stored in Supabase during the signup process.

* **Citizens:** Created by default with `role: 'citizen'`. They have access to the Local Feed, Report form, and their personal Dashboard.
* **Admins:** Designated by `role: 'admin'` and a specific `ward_allocated` integer. They have exclusive access to the Admin Control Panel (`/admin/issues`) to manage reports for their assigned territory.

## 📄 License

This project is licensed under the MIT License.
