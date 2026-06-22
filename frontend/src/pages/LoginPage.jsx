import { Link, useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import * as yup from "yup";
import { FiBarChart2, FiLock, FiTruck } from "react-icons/fi";
import { login } from '../features/authSlice'; 

function LoginPage() {
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const dashboardByRole = {
    admin: "/AdminDashboard",
    manager: "/ManagerDashboard",
    staff: "/StaffDashboard",
  };
  const schema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    dispatch(login(data))
    .unwrap()
    .then((result)=>{
      const role = result.user?.role;
      navigator(dashboardByRole[role] || "/LoginPage");
    })
    .catch(() => {});
  };

  return (
    <div className="auth-page grid min-h-screen bg-[#f4f6f9] text-[#172033] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="auth-hero-panel flex min-h-[320px] flex-col justify-between bg-[#111827] p-8 text-white lg:min-h-screen lg:p-12">
        <Link to="/" className="flex items-center gap-3">
          <span className="auth-brand-mark grid h-11 w-11 place-items-center rounded-md bg-[#d71920] text-sm font-black">HTP</span>
          <span>
            <span className="block text-lg font-black">HERO TRACK PRO</span>
            <span className="block text-xs font-bold text-gray-300">Hero MotoCorp Plant ERP</span>
          </span>
        </Link>

        <div className="auth-hero-copy max-w-xl py-10">
          <p className="mb-4 text-sm font-black uppercase text-[#ffb4b8]">Secure Operations Console</p>
          <h2 className="text-4xl font-black leading-tight lg:text-5xl">Enterprise Spare Parts Control</h2>
          <p className="mt-5 text-lg leading-8 text-gray-300">
            Track department-wise stock, approvals, movements and low-stock risk across Hero MotoCorp operations.
          </p>
        </div>

        <div className="auth-feature-grid grid gap-3 sm:grid-cols-3">
          {[
            { icon: FiTruck, label: "Movements" },
            { icon: FiLock, label: "Role Access" },
            { icon: FiBarChart2, label: "Analytics" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="auth-feature-card rounded-md border border-white/10 bg-white/10 p-4">
                <Icon className="mb-3 text-[#ffb4b8]" />
                <span className="text-xs font-black uppercase text-gray-200">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="auth-form-panel w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-xl">
          <div className="mb-8">
            <p className="text-sm font-black uppercase text-[#d71920]">Operator Login</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Welcome back</h1>
            <p className="mt-2 text-gray-600">Sign in to the HeroTrack Pro ERP workspace.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                {...register("email")}
                className="auth-input w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500">{errors.email.message}</p>}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                {...register("password")}
                className="auth-input w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center mb-6">
              <input type="checkbox" id="2fa" className="auth-checkbox mr-2" />
              <label htmlFor="2fa" className="text-gray-600 text-sm">Agree on terms and conditions</label>
            </div>

            <button
              type="submit"
              className="auth-primary-button w-full rounded-md bg-[#d71920] p-3 font-black text-white transition duration-300 hover:bg-[#b9141a]"
            >
              Sign in
            </button>
          </form>

          <div className="text-center mt-6">
            <p>Don't have an account? <Link to='/SignupPage' className="auth-link text-[#2455a6] text-sm font-bold hover:underline">Create one</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
