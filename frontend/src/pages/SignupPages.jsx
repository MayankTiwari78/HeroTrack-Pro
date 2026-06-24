import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../features/authSlice";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  FiCheckCircle,
  FiCreditCard,
  FiGrid,
  FiLock,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const phonePattern = /^[0-9]{10}$/;
const passwordValidationMessage =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";
const dashboardByRole = {
  admin: "/AdminDashboard",
  manager: "/ManagerDashboard",
  staff: "/StaffDashboard",
};
const signupSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  email: yup
    .string()
    .trim()
    .required("Please enter a valid email address.")
    .matches(emailPattern, "Please enter a valid email address."),
  password: yup
    .string()
    .required("Password is required")
    .matches(passwordPattern, passwordValidationMessage),
  role: yup
    .string()
    .oneOf(["admin", "manager", "staff"], "Select a valid role.")
    .required("Role is required"),
  employeeId: yup.string().trim().when("role", {
    is: (role) => role === "staff" || role === "manager",
    then: (schema) => schema
      .required("Employee ID is required.")
      .min(3, "Employee ID must be between 3 and 20 characters.")
      .max(20, "Employee ID must be between 3 and 20 characters."),
    otherwise: (schema) => schema.notRequired().strip(),
  }),
  phone: yup
    .string()
    .trim()
    .required("Please enter a valid 10 digit mobile number.")
    .matches(phonePattern, "Please enter a valid 10 digit mobile number."),
});

function SignupPage() {
  const { isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: { employeeId: "", phone: "", role: "staff", termsAccepted: false },
  });
  const selectedRole = watch("role");

  const resetOtpVerification = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
  };

  const getRequestError = (error, fallback) => {
    const responseData = error.response?.data;
    if (responseData?.message) return responseData.message;
    if (responseData?.error) return responseData.error;
    if (error.response?.status === 404) {
      return "OTP endpoint is unavailable. Restart the HeroTrack backend and try again.";
    }
    if (!error.response) return "Unable to reach the HeroTrack server. Please try again.";
    return fallback;
  };

  const handleSendOtp = async () => {
    const phoneIsValid = await trigger("phone");
    if (!phoneIsValid) return;

    setIsSendingOtp(true);
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);

    try {
      const response = await axiosInstance.post("auth/send-otp", { phone: getValues("phone") });
      setOtpSent(true);
      toast.success(
        response.data.otp ? `OTP Sent: ${response.data.otp}` : response.data.message || "OTP sent successfully."
      );
    } catch (error) {
      toast.error(getRequestError(error, "Unable to send OTP."));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^[0-9]{6}$/.test(otp)) {
      toast.error("Enter a valid 6 digit OTP.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await axiosInstance.post("auth/verify-otp", {
        phone: getValues("phone"),
        otp,
      });
      if (response.data.verified) {
        setOtpVerified(true);
        toast.success("Mobile number verified successfully.");
      }
    } catch (error) {
      setOtpVerified(false);
      toast.error(getRequestError(error, "Invalid OTP."));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const onSubmit = (data) => {
    if (!termsAccepted) {
      setTermsError("You must accept Terms & Conditions to continue.");
      return;
    }

    if (!otpVerified) {
      toast.error("Verify your mobile number before signup.");
      return;
    }

    dispatch(signup({ ...data, otpVerified: true, termsAccepted }))
      .unwrap()
      .then((result) => {
        toast.success("Account created successfully.");
        const role = result.savedUser?.role;
        navigator(dashboardByRole[role] || "/LoginPage");
      })
      .catch((message) => {
        toast.error(message || "Signup failed");
      });
  };

  return (
    <div className="auth-page grid min-h-screen bg-[#f4f6f9] text-[#172033] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center p-4 lg:p-6">
        <div className="auth-form-panel w-full max-w-[500px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl lg:p-6">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d71920]">Operator Access</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">Create HeroTrack account</h1>
            <p className="mt-1 text-sm text-gray-600">Register a secure, role-based ERP account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <section aria-labelledby="account-information-heading">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d71920]" />
                <h2 id="account-information-heading" className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Account Information
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block text-xs font-bold text-gray-700">Name</label>
                  <div className="relative">
                    <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="name"
                      type="text"
                      {...register("name")}
                      className="auth-input w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                      placeholder="Your name"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-bold text-gray-700">Email</label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="auth-input w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-xs font-bold text-gray-700">Password</label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="password"
                      type="password"
                      {...register("password")}
                      className="auth-input w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                      placeholder="Secure password"
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="role" className="mb-1 block text-xs font-bold text-gray-700">Role</label>
                  <select
                    id="role"
                    {...register("role")}
                    className="auth-input w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                  {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
                </div>
              </div>
            </section>

            <section aria-labelledby="employee-information-heading">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d71920]" />
                <h2 id="employee-information-heading" className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Employee Information
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(selectedRole === "staff" || selectedRole === "manager") && (
                  <div>
                    <label htmlFor="employeeId" className="mb-1 block text-xs font-bold text-gray-700">Employee ID</label>
                    <div className="relative">
                      <FiCreditCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="employeeId"
                        type="text"
                        {...register("employeeId")}
                        className="auth-input w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                        placeholder="Employee ID"
                      />
                    </div>
                    {errors.employeeId && <p className="mt-1 text-xs text-red-600">{errors.employeeId.message}</p>}
                  </div>
                )}

                <div className={selectedRole === "admin" ? "sm:col-span-2" : ""}>
                  <label htmlFor="phone" className="mb-1 block text-xs font-bold text-gray-700">Mobile Number</label>
                  <div className="relative">
                    <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      {...register("phone", { onChange: resetOtpVerification })}
                      className="auth-input w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2455a6]"
                      placeholder="10 digit mobile number"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                </div>
              </div>
            </section>

            <section aria-labelledby="otp-verification-heading" className="rounded-lg border border-[#2455a6]/20 bg-[#f7f9fd] p-3.5">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#2455a6]/10 text-[#2455a6]">
                  <FiShield />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="otp-verification-heading" className="text-sm font-black text-gray-900">OTP Verification</h2>
                  <p className="mt-0.5 text-xs text-gray-600">We will send a 6 digit OTP to your mobile.</p>
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="mt-3 w-full rounded-md border border-[#2455a6] px-4 py-2 text-sm font-bold text-[#2455a6] transition hover:bg-[#2455a6] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingOtp ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <div className="mt-3">
                  <div className="flex gap-2 max-sm:flex-col">
                    <div className="relative min-w-0 flex-1">
                      <FiShield className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => {
                          setOtp(event.target.value.replace(/\D/g, ""));
                          setOtpVerified(false);
                        }}
                        disabled={otpVerified}
                        className="auth-input w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#2455a6] disabled:bg-gray-100"
                        placeholder="6 digit OTP"
                        aria-label="6 digit OTP"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpVerified}
                      className="rounded-md border border-[#2455a6] px-5 py-2 text-sm font-bold text-[#2455a6] transition hover:bg-[#2455a6] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {otpVerified ? "Verified" : isVerifyingOtp ? "Verifying..." : "Verify"}
                    </button>
                  </div>

                  {otpVerified ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-green-700" role="status">
                      <FiCheckCircle /> OTP verified successfully
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="mt-2 text-xs font-bold text-[#2455a6] hover:underline disabled:opacity-50"
                    >
                      {isSendingOtp ? "Resending..." : "Resend OTP"}
                    </button>
                  )}
                </div>
              )}
            </section>

            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    setTermsError("");
                  }}
                  className="auth-checkbox mr-2"
                  aria-invalid={Boolean(termsError)}
                />
                <label htmlFor="termsAccepted" className="text-xs text-gray-600">
                  Agree to Terms &amp; Conditions
                </label>
              </div>
              {termsError && <p className="mt-1 text-xs text-red-600" role="alert">{termsError}</p>}
            </div>

            <button
              type="submit"
              disabled={isUserSignup || !termsAccepted || !otpVerified}
              aria-busy={isUserSignup}
              className="auth-primary-button w-full rounded-md bg-gradient-to-r from-[#d71920] to-[#a90f16] px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:from-[#c5161d] hover:to-[#900c12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUserSignup ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <p>
              Already have an account?
              <Link to="/LoginPage" className="auth-link font-bold text-[#2455a6] hover:underline"> Sign in</Link>
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
