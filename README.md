# Connectify

Connectify is a modern, full-stack social media application designed for seamless communication and community engagement. Built with a powerful tech stack including React 19, Supabase, and Redux Toolkit, it offers real-time features and a premium user experience.

## ✨ Features

- **Real-time Messaging**: Instant chat functionality with Supabase Realtime.
- **Dynamic Feed**: Explore the latest posts and updates from the community.
- **Stickers & Emojis**: Express yourself with a rich collection of stickers and an integrated emoji picker.
- **Voice Messages**: Share audio clips directly within your conversations.
- **Notifications**: Stay updated with real-time alerts for messages and interactions.
- **User Profiles**: Personalize your presence and showcase your activity.
- **Auth System**: Secure login, signup, and forgot password flows.
- **Infinite Scroll**: Seamlessly browse through content with high-performance scrolling.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop views with Tailwind CSS and Framer Motion.

## 🚀 Tech Stack

- **Frontend**: React 19, React Router DOM, Framer Motion
- **State Management**: Redux Toolkit (RTK)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Backend / DB**: Supabase (Database, Auth, Storage, Realtime)
- **Developer Tools**: Vite, TypeScript, PostCSS

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd connectify
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## 📂 Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application screens (Feed, Explore, Messages, etc.).
- `src/redux`: State management logic and slices.
- `src/services`: API calls and Supabase client configuration.
- `src/assets`: Static assets like images and styles.

## 🚀 Live Demo

Check out the live version of Connectify:

🔗 https://connectify-hdcwpq3pi-muammad-arslans-projects.vercel.app/

---
