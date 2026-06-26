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

  // Demo OTP Mode: fall back to backend logs when no SMS provider is configured.
  const mobile = phone;
  console.log(`Demo OTP for ${mobile}: ${otp}`);
  return { accepted: true, provider: "demo", demoMode: true };
};

module.exports = { sendOTP, setSMSProvider };
