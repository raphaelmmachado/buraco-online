export const SERVER_ADDRESS =
  import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3000`;

console.log(import.meta.env.VITE_PORT);
