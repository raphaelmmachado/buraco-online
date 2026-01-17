import { type ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

const Portal = ({ children }: { children: ReactNode }) => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const portalRoot = isClient ? document.getElementById("portal-root") : null;

  return portalRoot ? createPortal(children, portalRoot) : null;
};

export default Portal;
