🚀 EduAgent MobileAn intelligent mobile platform featuring a robust, dual-layered authentication system. Built with React Native (Expo) and powered by a Node.js/Vercel backend, this app provides a seamless onboarding experience via Google OAuth 2.0 and traditional secure email registration.✨ FeaturesSmart Auth Guard: Automatic redirection based on user session status using Expo Router segments.Google One-Tap Sign-In: Integrated native Google Identity tokens for a frictionless "Continue with Google" experience.Traditional Login: Secure email/password authentication with real-time validation.Persistent Sessions: Secure on-device token storage using expo-secure-store.Visual Feedback: Comprehensive loading states and error handling for a "crash-proof" user experience.🛠️ Tech StackFrontendBackendSecurityReact Native (Expo)Node.js / ExpressGoogle OAuth 2.0Expo Router (File-based)Vercel (Serverless)JWT (JSON Web Tokens)Context API (State Mgmt)RESTful APISHA-1 Fingerprinting🚀 Getting Started1. PrerequisitesNode.js (v18 or newer)Expo Go app on your physical deviceEAS CLI installed (npm install -g eas-cli)2. Environment VariablesCreate a .env file in the root directory:Code snippetEXPO_PUBLIC_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
API_BASE_URL=https://your-production-backend.vercel.app/api/auth/user
3. InstallationBash# Clone the repository
git clone https://github.com/yourusername/eduagent-mobile.git

# Install dependencies
npm install

# Start the development server
npx expo start -c
🔒 Authentication FlowThe app uses a Protected Route Strategy:Splash: The AuthContext checks SecureStore for an existing userToken.Unauthenticated: If no token is found, the user is locked into the /auth group (Register/Login).Authenticated: Upon a successful 200 OK from the Vercel backend, the userToken is updated, and the _layout.tsx guard automatically slides the user into the /(app)/dummydash.📁 Project StructurePlaintext├── app/
│   ├── (app)/               # Protected routes (Dashboard, Profile)
│   ├── auth/                # Public routes (Login, Register, OTP)
│   ├── context/             # AuthContext.tsx (Global state)
│   └── _layout.tsx          # Root Layout & Auth Guard Logic
├── assets/                  # Images and Google Logos
├── components/              # Reusable UI components
└── app.json                 # Expo configuration & Android Package Name
⚠️ TroubleshootingJSON Parse Errors: Usually caused by the backend sending an HTML error page (like DEPLOYMENT_NOT_FOUND). Ensure the API_BASE_URL in your .env matches your Vercel production domain.Metro Connection: Ensure your mobile device and computer are on the same Wi-Fi network.🤝 ContributingContributions, issues, and feature requests are welcome! Feel free to check the issues page.How to use this:Create a file named README.md in your project root.Paste the content above.Replace yourusername and your-production-backend with your actual details.
