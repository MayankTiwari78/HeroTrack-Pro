const crypto = require("crypto");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const otpStore = new Map();

const generateOTP = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const saveOTP = (phone, otp, now = Date.now()) => {
  const expiresAt = now + OTP_EXPIRY_MS;
  otpStore.set(phone, { otp: String(otp), expiresAt, verified: false });

  const expiryTimer = setTimeout(() => {
    const savedOTP = otpStore.get(phone);
    if (savedOTP?.expiresAt === expiresAt) otpStore.delete(phone);
  }, OTP_EXPIRY_MS);
  expiryTimer.unref();

  return expiresAt;
};

const verifyOTP = (phone, otp, now = Date.now()) => {
  const savedOTP = otpStore.get(phone);

  if (!savedOTP || savedOTP.expiresAt <= now) {
    otpStore.delete(phone);
    return false;
  }

  if (savedOTP.otp !== String(otp)) return false;

  savedOTP.verified = true;
  return true;
};

const isOTPVerified = (phone, now = Date.now()) => {
  const savedOTP = otpStore.get(phone);

  if (!savedOTP || savedOTP.expiresAt <= now) {
    otpStore.delete(phone);
    return false;
  }

  return savedOTP.verified === true;
};

const invalidateOTP = (phone) => otpStore.delete(phone);

const consumeOTPVerification = (phone) => {
  if (!isOTPVerified(phone)) return false;
  otpStore.delete(phone);
  return true;
};

module.exports = {
  OTP_EXPIRY_MS,
  consumeOTPVerification,
  generateOTP,
  invalidateOTP,
  isOTPVerified,
  saveOTP,
  verifyOTP,
};
