import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker registrado. Checando atualizações na inicialização...');
      if (r) {
        // Checa se há atualização disponível quando o app é aberto (sem instalar automaticamente)
        r.update().catch((e) => console.log('PWA: erro na verificação inicial:', e));

        // Checa por atualizações sempre que o jogador volta ao aplicativo ou abre a tela
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            console.log('PWA: App focado/aberto. Checando se há novas versões...');
            r.update().catch((e) => console.log('PWA: erro na verificação ao focar:', e));
          }
        });
      }
    },
    onNeedRefresh() {
      console.log('PWA: Nova versão detectada e aguardando clique do usuário.');
    },
    onOfflineReady() {
      console.log('PWA: App salvo no dispositivo! Pronto para uso offline.');
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
