const getSocketAddress = () => {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;

  const { hostname, protocol, port } = window.location;
  
  // 1. Se estiver em HTTPS (Túnel Cloudflare), usa o domínio direto
  if (protocol === "https:") {
    return `https://${hostname}`;
  }

  // 2. Se o navegador já estiver na 3050 ou 3000, usa a mesma porta
  if (port === "3050" || port === "3000") {
    return `http://${hostname}:${port}`;
  }

  // 3. Se estiver no Vite (5173) ou outro, tenta a 3050 por padrão
  // mas permite trocar via localStorage para facilitar seu teste manual
  const savedPort = localStorage.getItem("baralho_debug_port") || "3050";
  return `http://${hostname}:${savedPort}`;
};

export const SERVER_ADDRESS = getSocketAddress();
console.log(`[SOCKET] Alvo: ${SERVER_ADDRESS} | Origem: ${window.location.port}`);
