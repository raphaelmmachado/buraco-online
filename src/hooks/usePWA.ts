import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker registrado. Checagem automática desativada.');
    },
    onNeedRefresh() {
      console.log('PWA: Nova versão detectada e aguardando comando.');
    },
    onOfflineReady() {
      console.log('PWA: App pronto para uso offline.');
    }
  });

  const checkForUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('PWA: Buscando atualização manualmente...');
        await registration.update();
        
        if (registration.waiting) {
            setNeedRefresh(true);
            return true;
        }
      }
    }
    return false;
  };

  const handleUpdate = async () => {
    await updateServiceWorker(true);
  };

  return {
    needRefresh,
    offlineReady,
    checkForUpdate,
    updateServiceWorker: handleUpdate,
  };
};
