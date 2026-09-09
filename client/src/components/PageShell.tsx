import {
  ClipboardList,
  History,
  Home,
  PlusCircle,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Home",
    icon: Home
  },
  {
    to: "/new",
    label: "New",
    icon: PlusCircle
  },
  {
    to: "/surveys",
    label: "History",
    icon: History
  },
  {
    to: "/profile",
    label: "Profile",
    icon: UserRound
  },
  {
    to: "/admin",
    label: "Admin",
    icon: ShieldCheck
  }
];

export function PageShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vku-600 text-white">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-950">
              VKU Field Survey
            </p>
            <p className="text-xs text-slate-500">Offline Data Collection</p>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-3xl px-4 py-5 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                    isActive
                      ? "bg-vku-50 text-vku-700"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
