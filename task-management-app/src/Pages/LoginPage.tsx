import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
// LoginBody import हटाएं या नया type use करें
import toast from "react-hot-toast";
import { authService } from "../Services/User.Services";
import { routepath } from "../Routes/route";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const isDev = Boolean(import.meta.env.DEV);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [apiError, setApiError] = useState<string>("");
  const [loader, setLoader] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(routepath.dashboard, { replace: true });
    }
  }, [navigate]);

  const validateLogin = () => {
    let valid = true;
    let newErrors: any = { email: "", password: "" };

    if (!loginData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = "Invalid email address";
      valid = false;
    }

    if (!loginData.password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (loginData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));

    if (apiError) setApiError("");
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateLogin()) {
      toast.error("Please fill all the fields correctly");
      return;
    }

    setLoader(true);

    try {
      const trimmedPayload = {
        email: loginData.email.trim(),
        password: loginData.password.trim(),
      };

      if (isDev) console.log("📤 Login attempt for:", trimmedPayload.email);

      // Type assertion use करें
      const data = await authService.loginUser(trimmedPayload as any);

      if (isDev) console.log("📥 Full API response:", data);

      if (!data.error && data.result?.token) {
        toast.success(data.msg || "Login successful!");

        localStorage.setItem("token", data.result.token);

        if (data.result.user) {
          const apiUser = data.result.user;
          const userName = apiUser.name ||
            apiUser.username ||
            apiUser.fullName ||
            apiUser.userName ||
            trimmedPayload.email.split('@')[0];

          const userData = {
            id: apiUser.id || apiUser._id || 'user-' + Date.now(),
            name: userName,
            email: apiUser.email || apiUser.userEmail || trimmedPayload.email,
            role: apiUser.role || data.result.role
          };

          if (isDev) console.log("💾 Saving user data:", userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
        }

        navigate(routepath.dashboard, { replace: true });

      } else {
        const errorMsg = data.msg || "Invalid credentials";
        setApiError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("🚨 Login error:", err);
      toast.error("Something went wrong. Please try again.");
    }

    setLoader(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        
        {/* Full Width Logo Header */}
        <div className="w-full bg-gradient-to-r from-blue-700 to-blue-900 flex justify-center items-center py-8">
          <div className="w-full flex justify-center items-center">
            <img 
              src="/logo.jpg" 
              alt="Company Logo"
              className="h-32 w-auto max-w-[80%] object-contain"
              style={{ 
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'text-white text-4xl font-bold text-center';
                fallback.textContent = 'HM² SOLUTIONS';
                e.currentTarget.parentNode?.appendChild(fallback);
              }}
            />
          </div>
        </div>

        <div className="px-8 py-8">
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-gray-700 font-medium text-sm ml-1 block">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="Enter your email"
                  className={`w-full pl-12 pr-4 py-3 rounded-lg border ${errors.email ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-gray-800 placeholder:text-gray-400`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs font-medium ml-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-gray-700 font-medium text-sm ml-1 block">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-3 rounded-lg border ${errors.password ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-gray-800 placeholder:text-gray-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs font-medium ml-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-700 font-medium">Login Failed</p>
                  <p className="text-red-600 text-xs mt-0.5">{apiError}</p>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loader}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow hover:shadow-md 
                disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 
                mt-4 text-base"
            >
              {loader ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </>
              )}
            </button>

            {/* Forgot Password */}
            <div className="pt-4 border-t border-gray-200 mt-6">
              <div className="flex justify-center">
                <Link
                  to={routepath.forgetPassword}
                  className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1.5 
                    transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Forgot Password?
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}