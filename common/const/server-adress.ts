const isBrowser = typeof window !== "undefined";
const isProd = isBrowser && import.meta.env && import.meta.env.MODE === "production";

export const SERVER_ADDRESS = isProd
  ? window.location.origin
  : `http://${window.location.hostname}:3000`;


