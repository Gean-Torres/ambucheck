import React from 'react';

/**
 * Base modal wrapper used across the app.
 * Keeps a single source of truth for backdrop, spacing and actions layout.
 */
export default function BaseModal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Cancelar
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}
