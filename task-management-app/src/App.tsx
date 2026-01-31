import { Navigate, Outlet, useLocation } from "react-router";
import { useMemo } from "react";
import { Toaster } from 'react-hot-toast';
import { routepath } from "./Routes/route";

export default function App() {

  const token = localStorage.getItem('token');
  const location = useLocation();
  const pathname = location?.pathname || '/';

  const publicAuthPaths = useMemo(() => {
    return new Set<string>([
      '/',
      routepath.privacyPolicy,
      routepath.termsAndConditions,
      routepath.login,
      routepath.forgetPassword,
      routepath.verifyOtp,
      routepath.changePassword,
    ]);
  }, []);

  const isPublicAuthPath = publicAuthPaths.has(pathname);

  if (!token && !isPublicAuthPath) {
    return <Navigate to={routepath.login} replace />;
  }

  const authOnlyPaths = useMemo(() => {
    return new Set<string>([
      routepath.login,
      routepath.forgetPassword,
      routepath.verifyOtp,
      routepath.changePassword,
    ]);
  }, []);

  const isAuthOnlyPath = authOnlyPaths.has(pathname);

  if (token && isAuthOnlyPath) {
    return <Navigate to={routepath.dashboard} replace />;
  }

  return (
    <>
     <Toaster position="top-right" reverseOrder={false} />
      <Outlet />
    </>
  );
}