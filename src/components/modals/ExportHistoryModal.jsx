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
  vehicleTypeFilter,
  setVehicleTypeFilter,
  exportLayout,
  setExportLayout,
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
          <label className="text-sm font-medium">Tipo de Veículo</label>
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="mt-1 p-2 border rounded"
          >
            <option value="all">Todos os tipos</option>
            <option value="ambulancia">Apenas Ambulância</option>
            <option value="carro_pequeno">Apenas Carro Pequeno</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Layout do CSV</label>
          <div className="mt-1 inline-flex rounded border overflow-hidden">
            <button
              type="button"
              onClick={() => setExportLayout('horizontal')}
              className={`px-3 py-2 text-sm ${exportLayout === 'horizontal' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Horizontal
            </button>
            <button
              type="button"
              onClick={() => setExportLayout('vertical')}
              className={`px-3 py-2 text-sm border-l ${exportLayout === 'vertical' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Vertical
            </button>
          </div>
        </div>

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
