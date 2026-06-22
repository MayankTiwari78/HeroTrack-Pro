import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBox,
  FiCheckCircle,
  FiDatabase,
  FiGrid,
  FiShield,
  FiTruck,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FaMotorcycle } from "react-icons/fa";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import heroMaverickBanner from "../images/hero-mavrick-erp-banner.png";

const stats = [
  { value: "7", label: "Plant Departments", detail: "Stores, production, QC, assembly and dispatch coverage" },
  { value: "100+", label: "Spare Parts", detail: "Motorcycle part master with reorder controls" },
  { value: "500+", label: "Stock Movements", detail: "Department-wise issue, return and transfer records" },
  { value: "24/7", label: "Operations View", detail: "Approvals, notifications and analytics in one console" },
];

const plantSignals = [
  "Stores intake",
  "Production issue",
  "Quality gate",
  "Assembly fitment",
  "Dispatch readiness",
];

const modules = [
  {
    icon: FiBox,
    title: "Spare Parts Master",
    text: "Maintain Hero MotoCorp part numbers, stock levels, reorder points, suppliers and storage locations.",
  },
  {
    icon: FiTruck,
    title: "Inventory Movement",
    text: "Track every issue, return, transfer and adjustment across plant departments with transaction history.",
  },
  {
    icon: FiCheckCircle,
    title: "Approval Control",
    text: "Route high-quantity movement requests through manager approvals without changing existing workflows.",
  },
  {
    icon: FiUsers,
    title: "Department Stock",
    text: "Keep department-wise stock availability visible for production, quality, maintenance and dispatch teams.",
  },
  {
    icon: FiBarChart2,
    title: "Analytics Console",
    text: "Review low-stock risk, most-used parts, monthly consumption and department performance signals.",
  },
  {
    icon: FiShield,
    title: "Role Governance",
    text: "Support admin, manager and staff workspaces with focused access.",
  },
];

const previewRows = [
  { label: "Warehouse to Production", value: "88%", tone: "red" },
  { label: "Production to QC", value: "64%", tone: "blue" },
  { label: "QC to Assembly", value: "72%", tone: "green" },
  { label: "Maintenance Requests", value: "46%", tone: "amber" },
];

const kpiPreview = [
  { label: "Low stock watch", value: "18", icon: FiZap },
  { label: "Pending approvals", value: "09", icon: FiCheckCircle },
  { label: "Monthly usage", value: "4.8K", icon: FiDatabase },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <Navbar />

      <main>
        <section
          className="landing-hero relative isolate overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(7, 17, 31, 0.97) 0%, rgba(10, 27, 49, 0.9) 38%, rgba(10, 27, 49, 0.52) 62%, rgba(7, 17, 31, 0.22) 100%), url(${heroMaverickBanner})`,
          }}
        >
          <div className="landing-grid absolute inset-0" aria-hidden="true" />
          <div className="landing-scan-line absolute left-0 right-0 top-[62%]" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex min-h-[76vh] max-w-7xl items-center px-6 py-14 lg:px-10">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-black uppercase text-[#b8d7ff] backdrop-blur">
                <span className="hero-signal-dot" />
                Hero MotoCorp Inspired Plant ERP
              </div>

              <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
                HERO TRACK PRO
              </h1>
              <p className="mt-4 max-w-2xl text-2xl font-semibold text-[#e7eefb] md:text-3xl">
                Department-wise spare parts tracking for enterprise motorcycle operations.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#bfd0e8] md:text-lg">
                A premium ERP console for spare-part stock, plant movement, approval workflows,
                low-stock monitoring and analytics across Hero MotoCorp IT and operations teams.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/LoginPage"
                  className="landing-primary-action inline-flex min-h-12 items-center gap-2 rounded-md bg-[#d71920] px-6 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-[#b9141a]"
                >
                  Open ERP Console
                  <FiArrowRight />
                </Link>
                <Link
                  to="/SignupPage"
                  className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:border-white/[0.45] hover:bg-white/20"
                >
                  Create Plant User
                  <FiUsers />
                </Link>
              </div>

              <div className="mt-8 grid max-w-2xl gap-2 sm:grid-cols-5">
                {plantSignals.map((signal) => (
                  <span
                    key={signal}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 bg-[#07111f]/[0.45] px-3 text-center text-xs font-black uppercase text-white/90 backdrop-blur"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0b1729] py-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
            {stats.map((item) => (
              <div key={item.label} className="landing-stat-card rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <strong className="block text-3xl font-black text-white">{item.value}</strong>
                <span className="mt-2 block text-xs font-black uppercase text-[#ffb4b8]">{item.label}</span>
                <p className="mt-3 text-sm leading-6 text-[#aab8cc]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#172033]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
            <div>
              <p className="text-sm font-black uppercase text-[#d71920]">Enterprise Inventory Platform</p>
              <h2 className="mt-2 text-3xl font-black text-[#17233c] md:text-4xl">
                Built for plant visibility, approvals and department accountability.
              </h2>
              <p className="mt-4 text-base leading-8 text-[#536174]">
                The Maverick 440 visual anchors the production context, while HeroTrack Pro remains
                a professional ERP workspace for spare-parts control and operational governance.
              </p>

              <div className="mt-8 grid gap-3">
                {plantSignals.map((signal, index) => (
                  <div key={signal} className="plant-flow-row">
                    <i>{String(index + 1).padStart(2, "0")}</i>
                    <span>{signal}</span>
                    <b>Tracked</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-command-surface rounded-lg border border-[#d8dee8] bg-white p-5 shadow-xl">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-[#d71920]">Command Snapshot</p>
                  <h3 className="mt-1 text-xl font-black text-[#17233c]">HeroTrack Pro Live Console</h3>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-full bg-[#16a34a]/10 px-3 text-xs font-black text-[#15803d]">
                  Online
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {kpiPreview.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="kpi-preview-tile">
                      <Icon />
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-4">
                {previewRows.map((row) => (
                  <div key={row.label} className="analytics-preview-row">
                    <div className="mb-2 flex justify-between gap-4 text-sm font-bold text-[#536174]">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e8edf5]">
                      <i className={`analytics-fill ${row.tone}`} style={{ width: row.value }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 text-[#172033]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-[#d71920]">ERP Modules</p>
                <h2 className="mt-2 text-3xl font-black text-[#17233c] md:text-4xl">
                  Modern controls for Hero MotoCorp spare-parts operations.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#536174]">
                Focused workflows for the teams that manage parts, movement records,
                replenishment risk and plant-level reporting.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.title} className="landing-feature-card rounded-lg border border-[#d8dee8] bg-[#fbfcfe] p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#17233c] text-xl text-white">
                      <Icon />
                    </div>
                    <h3 className="text-lg font-black text-[#17233c]">{module.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#536174]">{module.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#0b1729] py-16 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-10">
            <div>
              <p className="text-sm font-black uppercase text-[#ffb4b8]">Analytics Preview</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                A dashboard language built for managers, IT teams and plant operators.
              </h2>
              <p className="mt-4 text-base leading-8 text-[#aab8cc]">
                HeroTrack Pro surfaces the operational signals that matter: part health,
                approval load, department consumption and recent movement flow.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {["Inventory health", "Approval metrics", "Movement timeline", "Department consumption"].map((item) => (
                  <span key={item} className="rounded-full border border-white/[0.12] bg-white/[0.07] px-4 py-2 text-xs font-black uppercase text-[#dbe7f8]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="landing-analytics-panel rounded-lg border border-white/10 bg-white/[0.07] p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-[#d71920] text-white">
                    <FiGrid />
                  </span>
                  <div>
                    <strong className="block">Operations Intelligence</strong>
                    <span className="text-xs font-bold uppercase text-[#aab8cc]">Executive console preview</span>
                  </div>
                </div>
                <FaMotorcycle className="text-2xl text-[#ffb4b8]" />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.72fr]">
                <div className="analytics-chart-shell">
                  <div className="chart-bars" aria-hidden="true">
                    {[44, 68, 52, 84, 61, 74, 57, 91].map((height, index) => (
                      <i key={height + index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="chart-axis">
                    <span>Stores</span>
                    <span>QC</span>
                    <span>Assembly</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    { label: "Healthy parts", value: "82%", color: "green" },
                    { label: "Approval SLA", value: "94%", color: "blue" },
                    { label: "Reorder risk", value: "12", color: "red" },
                  ].map((item) => (
                    <div key={item.label} className={`analytics-side-metric ${item.color}`}>
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#d71920] px-6 py-14 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-white/80">HeroTrack Pro ERP</p>
              <h2 className="mt-2 text-3xl font-black">Launch the plant spare-parts workspace.</h2>
              <p className="mt-3 max-w-2xl text-white/85">
                Move department stock, approvals, notifications and analytics into a single professional console.
              </p>
            </div>
            <Link
              to="/LoginPage"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-black text-[#d71920] transition hover:bg-gray-100"
            >
              Launch HeroTrack Pro
              <FiArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
