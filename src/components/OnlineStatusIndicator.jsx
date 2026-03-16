import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function OnlineStatusIndicator({ isOnline, syncStatus }) {
  if (isOnline && syncStatus === 'idle') {
    return null; // Don't show anything when online and no sync activity
  }

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all ${
        isOnline
          ? syncStatus === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : syncStatus === 'syncing'
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : syncStatus === 'error'
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isOnline ? (
          syncStatus === 'success' ? (
            <CheckCircle size={16} />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : syncStatus === 'error' ? (
            <AlertCircle size={16} />
          ) : (
            <Wifi size={16} />
          )
        ) : (
          <WifiOff size={16} />
        )}

        <span className="text-sm font-medium">
          {isOnline
            ? syncStatus === 'success'
              ? 'Sincronizado'
              : syncStatus === 'syncing'
              ? 'Sincronizando...'
              : syncStatus === 'error'
              ? 'Falha na sincronização'
              : 'Online'
            : 'Offline'
          }
        </span>
      </div>
    </div>
  );
}