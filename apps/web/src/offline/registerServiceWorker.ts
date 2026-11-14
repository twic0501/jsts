export async function registerOfflineServiceWorker(): Promise<void> {
  // Chỉ đăng ký ở bản production, không đăng ký trong Vite dev.
  if (!import.meta.env.PROD) return;

  if (!("serviceWorker" in navigator)) {
    console.warn(
      "[Paper Galaxy] Trình duyệt không hỗ trợ Service Worker.",
    );
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/sw.js",
      { scope: "/" },
    );

    console.info(
      "[Paper Galaxy] Service Worker registered:",
      registration.scope,
    );

    await navigator.serviceWorker.ready;

    console.info(
      "[Paper Galaxy] Service Worker ready.",
    );
  } catch (error) {
    console.error(
      "[Paper Galaxy] Service Worker registration failed:",
      error,
    );
  }
}
