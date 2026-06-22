import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../features/authSlice";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiCheckCircle, FiGrid, FiShield } from "react-icons/fi";

function SignupPage() {
  const { isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const dashboardByRole = {
    admin: "/AdminDashboard",
    manager: "/ManagerDashboard",
    staff: "/StaffDashboard",
  };

  const schema = yup.object().shape({
    name: yup.string().required("Name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
    role: yup.string().required("Role is required"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    dispatch(signup(data))
      .unwrap()
      .then((result) => {
        const role = result.savedUser?.role;
        navigator(dashboardByRole[role] || "/LoginPage");
      })
      .catch(() => {});
  };

  return (
    <div className="auth-page grid min-h-screen bg-[#f4f6f9] text-[#172033] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="auth-form-panel w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-xl">
          <div className="mb-8">
            <p className="text-sm font-black uppercase text-[#d71920]">Operator Access</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Create HeroTrack account</h1>
            <p className="mt-2 text-gray-600">Register a role-based ERP user for Hero MotoCorp spare-parts operations.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-gray-700 text-sm font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="auth-input w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                placeholder="Your name"
              />
              {errors.name && <p className="text-red-500">{errors.name.message}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="auth-input w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500">{errors.email.message}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="auth-input w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-500">{errors.password.message}</p>}
            </div>

            <label className="block">Role</label>
            <select
              {...register("role")}
              className="auth-input mb-8 mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
            {errors.role && <p className="text-red-500">{errors.role.message}</p>}

            <div className="flex items-center mb-6">
              <input type="checkbox" id="2fa" className="auth-checkbox mr-2" />
              <label htmlFor="2fa" className="text-gray-600 text-sm">Agree to terms and conditions</label>
            </div>

            <button type="submit" className="auth-primary-button w-full rounded-md bg-[#d71920] p-3 font-black text-white transition duration-300 hover:bg-[#b9141a]">
              {isUserSignup ? "Signing...." : "Sign Up"}
            </button>
          </form>

          <div className="text-center mt-6">
            <p>
              Already have an account?
              <Link to="/LoginPage" className="auth-link text-[#2455a6] text-sm font-bold hover:underline"> Sign in</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="auth-hero-panel flex min-h-[320px] flex-col justify-between bg-[#111827] p-8 text-white lg:min-h-screen lg:p-12">
        <Link to="/" className="flex items-center gap-3">
          <span className="auth-brand-mark grid h-11 w-11 place-items-center rounded-md bg-[#d71920] text-sm font-black">HTP</span>
          <span>
            <span className="block text-lg font-black">HERO TRACK PRO</span>
            <span className="block text-xs font-bold text-gray-300">Hero MotoCorp Plant ERP</span>
          </span>
        </Link>

        <div className="auth-hero-copy max-w-xl py-10">
          <p className="mb-4 text-sm font-black uppercase text-[#ffb4b8]">Role Based ERP</p>
          <h2 className="text-4xl font-black leading-tight lg:text-5xl">Bring every department into one spare-parts ledger</h2>
          <p className="mt-5 text-lg leading-8 text-gray-300">
            Create secure accounts for admins, managers and staff while preserving the existing HeroTrack backend permissions.
          </p>
        </div>

        <div className="auth-feature-grid grid gap-3 sm:grid-cols-3">
          {[
            { icon: FiGrid, label: "Departments" },
            { icon: FiCheckCircle, label: "Approvals" },
            { icon: FiShield, label: "Access" },
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
    </div>
  );
}

export default SignupPage;
