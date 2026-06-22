import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import heroMotoCorpLogo from "../assets/heromotocorp-logo.png";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white p-1.5 shadow-lg shadow-red-950/30 ring-1 ring-white/10 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_30px_rgba(215,25,32,0.38)]">
            <img src={heroMotoCorpLogo} alt="Hero MotoCorp" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0">
            <strong className="block text-sm font-black text-white sm:text-base">HERO MOTOCORP</strong>
            <span className="hidden text-xs font-semibold uppercase text-[#9fb2cf] sm:block">
              Spare Parts ERP Platform
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/LoginPage"
            className="hidden rounded-md px-4 py-2 text-sm font-bold text-[#dbe7f8] transition hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/SignupPage"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#d71920] px-4 text-sm font-black text-white transition hover:bg-[#b9141a] sm:px-5"
          >
            Start
            <FiArrowRight />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
