import { useState } from "react";
import { authService } from "../Services/User.Services";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { routepath } from "../Routes/route";

export default function ForgotPassword() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loader, setLoader] = useState<boolean>(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const navigate = useNavigate();
  const isDev = Boolean(import.meta.env.DEV);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 

    // Required check
    if (!email) {
      setError("Email is required");
      return;
    }

    // Format check
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoader(true);
      const data = await authService.forgetPassword({ email });
      
      if (isDev) console.log("Response from API:", data); 
      
      // Check if data exists
      if (!data) {
        setError("No response from server. Please try again.");
        setLoader(false);
        return;
      }
      
      // Check if error is true
      if (data.error === true) {
        setError(data.msg || "Failed to send OTP");
        toast.error(data.msg || "Failed to send OTP");
      } 
      // Check if success
      else if (data.success || data.msg) {
        toast.success(data.msg || "OTP sent successfully!");
        setError("");
        
        if (data.otp) {
          setDebugOtp(String(data.otp));
        }
        
        // Navigate to OTP page with email
        navigate(routepath.verifyOtp, {
          replace: true,
          state: { email: email }
        });
      } 
      // Default error
      else {
        setError("Something went wrong. Please try again.");
        toast.error("Something went wrong. Please try again.");
      }
      
      setLoader(false);
      
    } catch (error) {
      if (isDev) console.error("Catch block error:", error);
      setError("Network error. Please check your connection.");
      toast.error("Network error. Please check your connection.");
      setLoader(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <style>
        {`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}
      </style>

      <div className="relative w-full max-w-md">
        {/* Card Container with glass effect */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-8 transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
              Reset Password
            </h1>
            <p className="text-gray-500 text-sm">
              Enter your email to receive a verification code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <span className="text-xs text-gray-400">Required</span>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 placeholder-gray-400 ${
                      error 
                        ? 'border-red-400 focus:ring-red-200 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
                    }`}
                    disabled={loader}
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start space-x-2 text-red-500 text-sm animate-fadeIn">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loader}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loader ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600 text-sm">
              Remember your password?{" "}
              <button
                onClick={() => navigate(routepath.login)}
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200 inline-flex items-center gap-1 hover:gap-2"
              >
                Sign in here
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </p>
          </div>

          {/* Debug OTP Display */}
          {debugOtp && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Test OTP</span>
                </div>
                <span className="text-xs text-yellow-600">Development Mode</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-2xl font-mono font-bold text-yellow-900 tracking-wider bg-white/50 px-4 py-2 rounded-lg border border-yellow-300">
                  {debugOtp}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(debugOtp)}
                  className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-lg transition-colors"
                  title="Copy OTP"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-yellow-700 text-center mt-2">
                Use this code if email doesn't arrive
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            <svg className="inline-block w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Your information is securely encrypted
          </p>
        </div>
      </div>
    </div>
  );
}