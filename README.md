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
3. Installation
Bash

# Clone the repository
git clone [https://github.com/yourusername/eduagent-mobile.git](https://github.com/yourusername/eduagent-mobile.git)

# Install dependencies
npm install

# Start the development server with a clean cache
npx expo start -c
🔒 Authentication Flow
The app implements a Triangle of Trust architecture to handle user access:

Bootstrapping: The AuthProvider checks SecureStore for an existing userToken immediately upon app launch.

The Guard: The _layout.tsx monitors the userToken. If no token exists, it restricts the user to the /auth folder (Register/Login).

Handshake: Upon successful login (OAuth or Manual), the backend returns a token. The app saves this to SecureStore and updates the global userToken state.

Automatic Entry: The Layout Guard detects the new token state and instantly triggers router.replace to move the user into the /(app) protected group.

📁 Project Structure
Plaintext

├── app/
│   ├── (app)/               # Protected routes (Dashboard, AI Tools)
│   ├── auth/                # Public routes (Login, Register, OTP)
│   ├── context/             # AuthContext.tsx (Global auth state)
│   └── _layout.tsx          # The "Gatekeeper" - Route guard logic
├── assets/                  # Images and brand assets
├── components/              # Reusable UI (Buttons, Inputs)
└── app.json                 # Expo config & Android Package Name
⚠️ Troubleshooting
DEPLOYMENT_NOT_FOUND: This occurs if your API_BASE_URL points to an old Vercel deployment. Always use your Production Domain in the .env file rather than a unique deployment hash.

JSON Parse Error: Our logic captures raw text responses. If you see this, check the console logs for "Raw Server Response" to see if the backend is returning an HTML error page (like a 404 or 500) instead of JSON.

Metro Connection: Ensure your mobile device and computer are on the same Wi-Fi network. For physical devices on corporate or public Wi-Fi, use the npx expo start --tunnel flag.

🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📝 License
Distributed under the MIT License. See LICENSE for more information.


Would you like me to add a **"Screenshots"** section placeholder or a **"API Endpoints
