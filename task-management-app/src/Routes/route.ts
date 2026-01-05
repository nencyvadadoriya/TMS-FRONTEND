// router/index.tsx
import { createHashRouter } from "react-router-dom";

const lazyComponent = <T extends { default: any }>(
    loader: () => Promise<T>
) => {
    return async () => {
        const mod = await loader();
        return { Component: mod.default };
    };
};

export const routepath = {
    login: '/login',
    dashboard: '/dashboard',
    forgetPassword: '/forgetPassword',
    verifyOtp: '/verifyOtp',
    changePassword: '/changePassword',
    tasks: '/tasks',
    calendar: '/calendar',
    analyze: '/analyze',
    team: '/team',
    profile: '/profile',
    brands: '/brands',
    brandDetail: '/brands/:brandId'
};

export const route = createHashRouter([
    {
        path: '/',
        lazy: lazyComponent(() => import("../App")),
        children: [
            {
                index: true,
                lazy: lazyComponent(() => import("../Pages/LoginPage"))
            },
            {
                path: routepath.login,
                lazy: lazyComponent(() => import("../Pages/LoginPage"))
            },
            {
                path: routepath.dashboard,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.forgetPassword,
                lazy: lazyComponent(() => import("../Pages/ForgetPasswordPage"))
            },
            {
                path: routepath.verifyOtp,
                lazy: lazyComponent(() => import("../Pages/OtpVerifyPage"))
            },
            {
                path: routepath.changePassword,
                lazy: lazyComponent(() => import("../Pages/ChangePasswordPage"))
            },
            {
                path: routepath.tasks,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.calendar,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.analyze,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.team,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.profile,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.brands,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            },
            {
                path: routepath.brandDetail,
                lazy: lazyComponent(() => import("../Pages/DashboardPage"))
            }
        ]
    }
]);
