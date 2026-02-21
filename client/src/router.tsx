import { createRouter, createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { TreePage } from "./routes/index.js";
import { LoginPage } from "./routes/login.js";
import { RegisterPage } from "./routes/register.js";

const rootRoute = createRootRoute({ component: () => <Outlet /> });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: TreePage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: LoginPage });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: RegisterPage });

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute]);
export const router = createRouter({ routeTree });
