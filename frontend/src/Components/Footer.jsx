import React from "react";
import { Link } from "react-router-dom";
import { FiBarChart2, FiGrid, FiLayers, FiShield, FiTruck } from "react-icons/fi";

const footerLinks = [
  { to: "/ManagerDashboard", label: "Command Center", icon: FiGrid },
  { to: "/ManagerDashboard/spare-parts", label: "Spare Parts", icon: FiLayers },
  { to: "/ManagerDashboard/movements", label: "Movements", icon: FiTruck },
  { to: "/ManagerDashboard/reports", label: "Analytics", icon: FiBarChart2 },
];

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07111f] py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-[1.1fr_1fr_0.9fr] lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#d71920] text-lg text-white">
              <FiGrid />
            </span>
            <div>
              <h2 className="text-2xl font-black">HeroTrack Pro</h2>
              <p className="text-xs font-bold uppercase text-[#9fb2cf]">Hero MotoCorp Plant ERP</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#aab8cc]">
            Enterprise spare-parts visibility for Hero MotoCorp departments, approvals,
            stock movement and analytics.
          </p>
          <p className="mt-5 text-sm text-[#7e8da5]">
            &copy; {new Date().getFullYear()} HeroTrack Pro. Internal operations workspace.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black uppercase text-white">ERP Workspaces</h3>
          <div className="grid gap-3">
            {footerLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="footer-link">
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black uppercase text-white">Plant Support</h3>
          <div className="grid gap-3 text-sm text-[#aab8cc]">
            <p>support@herotrackpro.com</p>
            <p>Hero MotoCorp IT Operations</p>
            <p>Department Wise Spare Parts Tracking System</p>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase text-[#b8d7ff]">
            <FiShield />
            Secure ERP Access
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
