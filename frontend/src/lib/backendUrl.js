const configuredBackendURL = process.env.REACT_APP_BACKEND_URL;

if (!configuredBackendURL) {
  throw new Error("REACT_APP_BACKEND_URL is not configured");
}

const backendURL = configuredBackendURL.replace(/\/$/, "");

export default backendURL;
