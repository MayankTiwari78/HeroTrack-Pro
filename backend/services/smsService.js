let smsProvider = null;

const setSMSProvider = (provider) => {
  if (!provider || typeof provider.sendMessage !== "function") {
    throw new TypeError("SMS provider must implement sendMessage().");
  }
  smsProvider = provider;
};

const sendOTP = async (phone, otp) => {
  const message = `Your HeroTrack Pro verification code is ${otp}. It expires in 5 minutes.`;

  if (smsProvider) {
    return smsProvider.sendMessage({ to: phone, message });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[SMS development] OTP for ${phone}: ${otp}`);
    return { accepted: true, provider: "development" };
  }

  throw new Error("SMS provider is not configured.");
};

module.exports = { sendOTP, setSMSProvider };
