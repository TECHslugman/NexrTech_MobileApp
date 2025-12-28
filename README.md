# 🚀 EduAgent Mobile

An intelligent mobile platform featuring a robust, dual-layered authentication system. Built with **React Native (Expo)** and powered by a **Node.js/Vercel** backend, this app provides a seamless onboarding experience via Google OAuth 2.0 and traditional secure email registration.

---

## ✨ Features

* **Smart Auth Guard:** Automatic redirection based on user session status using Expo Router segments and protected route logic.
* **Google One-Tap Sign-In:** Integrated native Google Identity tokens for a frictionless "Continue with Google" experience.
* **Traditional Login:** Secure email and password authentication with real-time field validation.
* **Persistent Sessions:** Secure on-device token storage using `expo-secure-store`, ensuring users stay logged in across app restarts.
* **Resilient Networking:** Advanced fetch handling that captures raw server responses to prevent JSON parsing crashes during backend outages.
* **Fluid UI/UX:** Comprehensive loading states and activity indicators to provide constant feedback during network requests.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo) |
| **Navigation** | Expo Router (File-based) |
| **Backend** | Node.js / Express (Vercel Serverless) |
| **State Management** | React Context API |
| **Storage** | Expo SecureStore |
| **Identity** | Google OAuth 2.0 / JWT |

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or newer)
* [Expo Go](https://expo.dev/client) app on your physical device
* EAS CLI installed (`npm install -g eas-cli`)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
API_BASE_URL=[https://your-production-backend.vercel.app/api/auth/user](https://your-production-backend.vercel.app/api/auth/user)

# Clone the repository
git clone [https://github.com/yourusername/eduagent-mobile.git](https://github.com/yourusername/eduagent-mobile.git)

# Install dependencies
npm install

# Start the development server with a clean cache
npx expo start -c
