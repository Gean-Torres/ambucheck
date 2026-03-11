import React from 'react';
import BaseModal from './BaseModal';

/**
 * Modal dedicated to history export date range selection.
 */
export default function ExportHistoryModal({
  exportStart,
  exportEnd,
  setExportStart,
  setExportEnd,
  onClose,
  onExport,
}) {
  return (
    <BaseModal
      title="Exportar Histórico"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onExport}
          className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
          disabled={!exportStart || !exportEnd || exportStart > exportEnd}
        >
          Exportar CSV
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Data inicial</label>
          <input
            type="date"
            value={exportStart}
            onChange={(e) => setExportStart(e.target.value)}
            className="mt-1 p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Data final</label>
          <input
            type="date"
            value={exportEnd}
            onChange={(e) => setExportEnd(e.target.value)}
            className="mt-1 p-2 border rounded"
          />
        </div>
      </div>
    </BaseModal>
  );
}
