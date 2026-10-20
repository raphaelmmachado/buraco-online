import { useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = () => {
  const visibilityBound = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker registrado. Checando atualizações na inicialização...');
      if (!r) return;

      // Checa se há atualização disponível quando o app é aberto (sem instalar automaticamente)
      r.update().catch((e) => console.log('PWA: erro na verificação inicial:', e));

      if (visibilityBound.current) return;
      visibilityBound.current = true;

      // Checa por atualizações sempre que o jogador volta ao aplicativo ou abre a tela
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          console.log('PWA: App focado/aberto. Checando se há novas versões...');
          r.update().catch((e) => console.log('PWA: erro na verificação ao focar:', e));
        }
      });
    },
    onNeedRefresh() {
      console.log('PWA: Nova versão baixada e aguardando o jogador aplicar.');
    },
    onOfflineReady() {
      console.log('PWA: App salvo no dispositivo! Pronto para uso offline.');
    },
    onRegisterError(error) {
      console.log('PWA: falha ao registrar o Service Worker:', error);
    }
  });

  const checkForUpdate = async () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;

      console.log('PWA: Buscando atualização manualmente...');
      await registration.update();

      // O update() pode resolver antes do novo worker terminar de instalar.
      const installing = registration.installing;
      if (installing) {
        await new Promise<void>((resolve) => {
          const onStateChange = () => {
            if (
              installing.state === 'installed' ||
              installing.state === 'activated' ||
              installing.state === 'redundant'
            ) {
              installing.removeEventListener('statechange', onStateChange);
              resolve();
            }
          };
          installing.addEventListener('statechange', onStateChange);
          onStateChange();
        });
      }

      if (registration.waiting) {
        setNeedRefresh(true);
        return true;
      }
    } catch (error) {
      console.log('PWA: erro ao buscar atualização:', error);
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
