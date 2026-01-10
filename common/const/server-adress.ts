export const SERVER_ADDRESS =
  import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3000`;

console.log("🔗 Connecting to Server at:", SERVER_ADDRESS);
