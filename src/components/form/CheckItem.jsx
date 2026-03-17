import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function CheckItem({ label, active, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${active ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
    >
      <span className={`text-sm ${active ? 'text-green-700 font-medium' : 'text-red-600'}`}>{label}</span>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-green-500' : 'bg-gray-100'}`}>
        {active && <CheckCircle2 className="text-white" size={14} />}
      </div>
    </div>
  );
}
