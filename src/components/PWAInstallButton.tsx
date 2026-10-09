import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed and running as standalone app, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <button
        id="pwa-install-btn"
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer shrink-0"
        title="ติดตั้งแอปลงในโทรศัพท์มือถือ หรือดาวน์โหลดไฟล์ APK (Android / iOS)"
      >
        <Smartphone className="h-3.5 w-3.5 animate-bounce" />
        <span>ติดตั้งแอป / APK 📲</span>
      </button>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
