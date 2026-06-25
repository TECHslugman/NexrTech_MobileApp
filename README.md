# EduAgent Mobile

> An intelligent mobile learning platform with a dual-layered authentication system — built for speed, security, and scale.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue.svg)](https://expo.dev)
[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000020.svg?logo=expo)](https://expo.dev)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2FVercel-brightgreen.svg)](https://vercel.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

EduAgent Mobile is a React Native application built with Expo that provides a seamless, secure onboarding experience for learners. It supports both **Google OAuth 2.0** (one-tap sign-in) and **traditional email/password** authentication, with persistent sessions and resilient networking baked in from the start.

The app is designed to serve as a launchpad for AI-powered educational tools, with a protected route architecture that keeps unauthenticated users out while minimising friction for returning ones.

---

## Features

### Authentication
- **Google One-Tap Sign-In** — native Google Identity tokens for a frictionless OAuth flow
- **Email & Password Login** — secure registration and login with real-time field validation
- **Persistent Sessions** — on-device token storage via `expo-secure-store`; users stay logged in across app restarts
- **Smart Auth Guard** — automatic redirection based on session state using Expo Router's protected segment logic

### Networking & Reliability
- **Resilient Fetch Handling** — raw server response capture prevents JSON parse crashes during backend outages or cold starts
- **Loading States** — activity indicators across all async operations for constant user feedback

### Developer Experience
- **File-based Routing** — Expo Router keeps navigation declarative and colocated with screens
- **Serverless Backend** — Node.js/Express deployed on Vercel; zero-config scaling

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React Native (Expo SDK) |
| Navigation | Expo Router (file-based) |
| Backend | Node.js / Express (Vercel Serverless) |
| State Management | React Context API |
| Secure Storage | Expo SecureStore |
| Identity | Google OAuth 2.0 / JWT |

---

## Architecture

EduAgent implements a **Triangle of Trust** pattern for authentication:

```
App Launch
    │
    ▼
AuthProvider (checks SecureStore for existing token)
    │
    ├── Token found ──────► router.replace("/(app)/dashboard")
    │
    └── No token ─────────► Restricted to /auth routes
                                │
                                ├── Google OAuth ──► Backend validates ──► JWT issued
                                │
                                └── Email/Password ─► Backend validates ──► JWT issued
                                                           │
                                                           ▼
                                                  Token saved to SecureStore
                                                           │
                                                           ▼
                                                  Auth state updated ──► Protected routes unlocked
```

### Route Guards

The root `_layout.tsx` acts as the **Gatekeeper**. It watches the global `userToken` state and enforces:

- `userToken === null` → user is constrained to the `/auth` segment
- `userToken !== null` → user is redirected into `/(app)` automatically

This means screens never need to manage auth redirects themselves — the guard handles it universally.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- [Expo Go](https://expo.dev/client) installed on a physical device, or an iOS/Android simulator
- EAS CLI: `npm install -g eas-cli`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/eduagent-mobile.git
cd eduagent-mobile

# 2. Install dependencies
npm install

# 3. Copy the environment template and fill in your values
cp .env.example .env

# 4. Start the development server with a clean cache
npx expo start -c
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS) to launch on your device.

### Running on a Simulator

```bash
# iOS (macOS only)
npx expo run:ios

# Android
npx expo run:android
```

---

## Project Structure

```
eduagent-mobile/
├── app/
│   ├── (app)/                  # Protected routes — accessible after login
│   │   ├── dashboard.tsx       # Main home screen
│   │   └── _layout.tsx         # Inner layout for protected group
│   ├── auth/                   # Public routes — no token required
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── otp.tsx
│   ├── context/
│   │   └── AuthContext.tsx     # Global auth state — token, user, sign-out
│   └── _layout.tsx             # Root gatekeeper — enforces auth guard
├── components/                 # Reusable UI primitives (Buttons, Inputs, Cards)
├── assets/                     # Images, fonts, icons
├── api/                        # Vercel serverless functions (backend)
│   └── auth/
│       ├── register.js
│       ├── login.js
│       └── google.js
├── .env.example                # Environment variable template
├── app.json                    # Expo config and Android package name
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## API Endpoints

All endpoints are hosted at your `API_BASE_URL` (e.g. `https://your-app.vercel.app/api`).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Authenticate with email and password |
| `POST` | `/auth/google` | Validate a Google Identity token and issue a JWT |
| `GET` | `/auth/user` | Return the authenticated user's profile (requires Bearer token) |

### Example Request — Login

```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
```

### Example Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com",
    "name": "Pradeep"
  }
}
```

---

## Environment Variables

Create a `.env` file in the project root. A `.env.example` template is included for reference.

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_WEB_CLIENT_ID` | Google OAuth Web Client ID from Google Cloud Console |
| `API_BASE_URL` | Your production Vercel backend URL (use the Production Domain, not a deployment hash) |

> **Note:** Variables prefixed with `EXPO_PUBLIC_` are bundled into the client. Never put secret keys in `EXPO_PUBLIC_` variables.

---

## Troubleshooting

**`DEPLOYMENT_NOT_FOUND`**
Your `API_BASE_URL` is pointing to a specific Vercel deployment hash rather than the stable Production Domain. Update `.env` to use the domain shown in your Vercel project's "Domains" tab.

**JSON Parse Error**
The app logs the raw server response as `"Raw Server Response"` in the console. If you see this error, check those logs — the backend is likely returning an HTML error page (404 or 500) instead of JSON, usually due to a misconfigured route or cold-start crash.

**Metro / Device Connection Issues**
Your phone and computer must be on the same Wi-Fi network. On corporate, university, or public networks that block peer-to-peer connections, use the tunnel flag:
```bash
npx expo start --tunnel
```

---

## Changelog

### [0.2.0] — 2025-06-25
- Added Google One-Tap OAuth sign-in
- Introduced `expo-secure-store` for persistent sessions
- Resilient fetch handler to capture raw server responses on error
- Full loading/activity indicator states across all async flows

### [0.1.0] — 2025-06-10
- Initial project scaffold with Expo Router
- Email/password registration and login
- JWT-based authentication against Node.js/Vercel backend
- Root layout auth guard (Triangle of Trust pattern)

---

## Contributing

Contributions are welcome and appreciated. This project follows a standard fork-and-PR workflow.

### How to Contribute

1. **Fork** the repository
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and write clear, focused commits:
   ```bash
   git commit -m "feat: add OTP resend cooldown timer"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch with a clear description of what you changed and why.

### Commit Message Convention


| Prefix | Use for |
| :--- | :--- |
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation changes only |
| `refactor:` | Code changes that neither fix a bug nor add a feature |
| `chore:` | Maintenance tasks (deps, config, tooling) |

### Reporting Issues

Please open a [GitHub Issue](https://github.com/yourusername/eduagent-mobile/issues) and include:
- Your OS and Expo SDK version
- Steps to reproduce
- Expected vs. actual behaviour
- Relevant console logs or screenshots

### Code Style

- TypeScript strict mode is enabled — avoid `any` types
- Components live in `components/`; screens live in `app/`
- Keep `AuthContext` lean — business logic belongs in service files, not the context

---

*Built with Expo · Deployed on Vercel · Open for contributions*
