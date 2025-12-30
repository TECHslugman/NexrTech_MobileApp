// app/config.js
export const Config = {
  // Base URLs
  API_BASE_URL: "https://edu-agent-backend-git-master-dendups-projects.vercel.app/api/v1",
  
  // Auth Endpoints
  AUTH: {
    // Register flow
    SEND_OTP: "/students/send-otp",
    VERIFY_OTP: "/students/verify-otp",
    RESEND_OTP: "/students/resend-otp",
    
    // Login
    LOGIN: "/students/login",
    
    // Password reset flow
    PASSWORD_RESET_SEND_OTP: "/students/password-reset/send-otp",
    PASSWORD_RESET_VERIFY_OTP: "/students/password-reset/verify-otp",
    PASSWORD_RESET_SET_NEW: "/students/password-reset/set-new",
    
    // Student endpoints (for future use)
    PROFILE: "/students/profile",
    LOGOUT: "/students/logout",
  },
  
  // Helper function to get full URL
  getFullUrl: (endpoint) => {
    const base = Config.API_BASE_URL.replace(/\/$/, '');
    const path = endpoint.replace(/^\//, '');
    return `${base}/${path}`;
  },
  
  // Direct URL methods (for convenience)
  url: {
    // Register flow
    sendOtp: () => Config.getFullUrl(Config.AUTH.SEND_OTP),
    verifyOtp: () => Config.getFullUrl(Config.AUTH.VERIFY_OTP),
    resendOtp: () => Config.getFullUrl(Config.AUTH.RESEND_OTP),
    
    // Login
    login: () => Config.getFullUrl(Config.AUTH.LOGIN),
    
    // Password reset flow
    passwordResetSendOtp: () => Config.getFullUrl(Config.AUTH.PASSWORD_RESET_SEND_OTP),
    passwordResetVerifyOtp: () => Config.getFullUrl(Config.AUTH.PASSWORD_RESET_VERIFY_OTP),
    passwordResetSetNew: () => Config.getFullUrl(Config.AUTH.PASSWORD_RESET_SET_NEW),
  },
  
  // Common headers
  getHeaders: () => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }),
};