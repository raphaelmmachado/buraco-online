import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const usePWA = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateFunction, setUpdateFunction] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('Nova versão detectada!');
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log('App pronto para uso offline.');
        setOfflineReady(true);
      },
      onRegistered(r) {
        console.log('Service Worker registrado.');
        // Checa por atualizações a cada 10 minutos
        r && setInterval(() => {
          console.log('Checagem automática de atualização...');
          r.update();
        }, 10 * 60 * 1000);
      },
    });
    setUpdateFunction(() => updateSW);
  }, []);

  const updateServiceWorker = async () => {
    if (updateFunction) {
      await updateFunction(true);
    }
  };

  const checkForUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Solicitando checagem de atualização ao SW...');
        await registration.update();
        
        // Retorna true se houver uma nova versão esperando ou instalando
        return registration.waiting !== null || registration.installing !== null;
      }
    }
    return false;
  };

  return {
    needRefresh,
    offlineReady,
    checkForUpdate,
    updateServiceWorker,
  };
};
