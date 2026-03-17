import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  ClipboardCheck,
  History,
  LogOut,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2
} from 'lucide-react';
import ExportHistoryModal from './components/modals/ExportHistoryModal';
import BaseModal from './components/modals/BaseModal';
import OnlineStatusIndicator from './components/OnlineStatusIndicator';
import { useOnlineStatus, useOfflineStorage } from './hooks/useOnlineStatus';
import SignaturePad from './components/form/SignaturePad';
import Section from './components/form/Section';
import CheckItem from './components/form/CheckItem';
import { initialFormStates } from './config/checklistInitialStates';
import { fieldLabels } from './config/fieldLabels';
import { commonFormSections, ambulanceExtraSections } from './config/formSections';
import { buildHistoryCsv, buildRecordCsv } from './utils/exportCsv';

// --- Aplicação Principal ---
export default function App() {
  const { isOnline, syncStatus, setSyncStatus } = useOnlineStatus();
  const { storePendingChecklist, getPendingChecklists, removePendingChecklist } = useOfflineStorage();

  const [user, setUser] = useState(null);
  const [view, setView] = useState('form'); // 'form' ou 'history'
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const [vehicleType, setVehicleType] = useState(null); // 'ambulancia' or 'carro_pequeno'
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(true);
  const [formData, setFormData] = useState(initialFormStates.ambulancia);
  // states for export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all'); // 'all', 'ambulancia', 'carro_pequeno'
  const [exportLayout, setExportLayout] = useState('horizontal'); // 'horizontal' | 'vertical'

  const selectVehicleType = (type) => {
    setVehicleType(type);
    setFormData(initialFormStates[type]);
    setShowVehicleTypeModal(false);
  };

  const renderSectionList = (sections) => sections.map((sectionConfig) => (
    <Section key={sectionConfig.title} title={sectionConfig.title}>
      {sectionConfig.items.map((itemConfig) => (
        <CheckItem
          key={`${itemConfig.section}.${itemConfig.item}`}
          label={itemConfig.label}
          active={formData[itemConfig.section][itemConfig.item]}
          onToggle={() => handleToggle(itemConfig.section, itemConfig.item)}
        />
      ))}
    </Section>
  ));

  const renderFormSections = () => {
    const sections = vehicleType === 'ambulancia'
      ? [...commonFormSections, ...ambulanceExtraSections]
      : commonFormSections;

    return <>{renderSectionList(sections)}</>;
  };

  // Inicializar Auth
  useEffect(() => {
    let isMounted = true;

    const resolveRedirectResult = async () => {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        console.error('Erro no login por redirecionamento:', err);
        if (isMounted) {
          setAuthError('Não foi possível concluir o login no retorno do Google. Tente novamente.');
        }
      }
    };

    resolveRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!isMounted) return;
      setUser(u);
      setLoading(false);
    });

    const loadingWatchdog = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      setAuthError((prev) => prev || 'Não foi possível concluir a autenticação automaticamente. Tente entrar novamente.');
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(loadingWatchdog);
      unsubscribe();
    };
  }, []);

  // Buscar Histórico
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'checklists');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenação manual em memória (Regra 2)
      const sorted = docs.sort((a, b) => b.createdAt - a.createdAt);
      setHistory(sorted);
    }, (err) => console.error("Firestore error", err));

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError('');

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const fallbackToRedirectCodes = new Set([
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment'
      ]);

      if (fallbackToRedirectCodes.has(err?.code)) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error('Erro ao fazer fallback para redirect:', redirectErr);
          setAuthError('Seu navegador bloqueou o pop-up e não foi possível redirecionar para login.');
          return;
        }
      }

      console.error('Erro no login com Google:', err);
      setAuthError('Não foi possível entrar com Google. Verifique sua conexão e tente novamente.');
    }
  };

  const handleToggle = (section, item) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [item]: !prev[section][item] }
    }));
  };

  const downloadCsvFile = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (!exportStart || !exportEnd) return;

    const csv = buildHistoryCsv({
      history,
      exportStart,
      exportEnd,
      vehicleTypeFilter,
      exportLayout,
    });

    if (!csv) {
      alert('Nenhum registro no período selecionado.');
      return;
    }

    downloadCsvFile(csv, `history_${exportStart}_${exportEnd}.csv`);
    setShowExportModal(false);
    setExportStart('');
    setExportEnd('');
    setVehicleTypeFilter('all'); // Reset filter after export
    setExportLayout('horizontal');
  };

  const handleExportEvent = (record, layout = 'horizontal') => {
    const csv = buildRecordCsv(record, layout);
    if (!csv) {
      alert('Não há dados disponíveis para exportar.');
      return;
    }

    const slug = record.id || record.dataString || Date.now();
    downloadCsvFile(csv, `evento_${slug}.csv`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.driverName) {
      alert("Por favor, preencha o nome do motorista.");
      return;
    }
    if (!formData.veiculoNome) {
      alert("Por favor, informe o nome do veículo.");
      return;
    }
    if (!formData.assinatura) {
      alert("Por favor, assine antes de enviar.");
      return;
    }

    // Count unchecked items and get their labels
    const getUncheckedItems = (obj, prefix = '') => {
      let unchecked = [];
      for (const key in obj) {
        if (typeof obj[key] === 'boolean' && obj[key] === false) {
          unchecked.push(prefix + key);
        } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          unchecked = unchecked.concat(getUncheckedItems(obj[key], prefix + key + '.'));
        }
      }
      return unchecked;
    };

    const uncheckedItems = getUncheckedItems(formData);
    const uncheckedCount = uncheckedItems.length;

    // Warning about unchecked items
    if (uncheckedCount > 0) {
      const proceedWithUnchecked = window.confirm(
        `Atenção: Você tem ${uncheckedCount} item(ns) não verificado(s).\n\n` +
        `Isso pode indicar que o veículo não está completamente pronto.\n\n` +
        `Deseja prosseguir mesmo assim?`
      );
      if (!proceedWithUnchecked) {
        return;
      }
    }

    // Warning about vehicle status
    if (!formData.liberada) {
      const proceedWithNotReady = window.confirm(
        `⚠️ ATENÇÃO: Você marcou que o veículo NÃO está liberado para atendimento.\n\n` +
        `Isso significa que o veículo tem problemas que impedem seu uso.\n\n` +
        `Tem certeza de que deseja enviar este checklist?`
      );
      if (!proceedWithNotReady) {
        return;
      }
    } else {
      // Vehicle is marked as ready, but check for unchecked items
      if (uncheckedCount > 0) {
        const uncheckedLabels = uncheckedItems.map(item => {
          return fieldLabels[item] || item.replace(/^[^\.]+\./, '').replace(/\./g, ' ').replace(/([A-Z])/g, ' $1').trim();
        }).join('\n• ');

        const proceedWithFailures = window.confirm(
          `⚠️ ATENÇÃO: O veículo foi marcado como LIBERADO, mas existem itens não verificados!\n\n` +
          `Itens não verificados:\n• ${uncheckedLabels}\n\n` +
          `O veículo será liberado apesar dessas falhas. Tem certeza?`
        );
        if (!proceedWithFailures) {
          return;
        }
      } else {
        const confirmReady = window.confirm(
          `✅ O veículo foi marcado como LIBERADO para atendimento.\n\n` +
          `Confirme que todas as verificações foram realizadas corretamente e o veículo está em condições seguras de uso.`
        );
        if (!confirmReady) {
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const checklistData = {
        ...formData,
        vehicleType,
        motorista: formData.driverName,
        loggedInUser: user.displayName || user.email,
        motoristaUid: user.uid,
        createdAt: Date.now(),
        dataString: new Date().toLocaleString('pt-BR')
      };

      if (isOnline) {
        // Online: send directly to Firestore
        console.log("Tentando enviar checklist para Firestore...", { uid: user.uid, name: formData.driverName });
        const docRef = await addDoc(collection(db, 'checklists'), checklistData);
        console.log("✅ Checklist salvo com sucesso! ID:", docRef.id);
        setFormData(initialFormStates[vehicleType]);
        setView('history');
      } else {
        // Offline: store locally and show message
        console.log("Offline: armazenando checklist localmente...");
        await storePendingChecklist(checklistData);
        alert("✅ Checklist salvo localmente! Será sincronizado quando você voltar online.");
        setFormData(initialFormStates[vehicleType]);
        setView('history');
      }
    } catch (err) {
      console.error("❌ Erro ao salvar:", err.code, err.message);
      if (!isOnline) {
        // Try to store offline even if there was an error
        try {
          await storePendingChecklist({
            ...formData,
            vehicleType,
            motorista: formData.driverName,
            loggedInUser: user.displayName || user.email,
            motoristaUid: user.uid,
            createdAt: Date.now(),
            dataString: new Date().toLocaleString('pt-BR')
          });
          alert("⚠️ Erro de conexão, mas dados salvos localmente. Serão sincronizados quando online.");
          setFormData(initialFormStates[vehicleType]);
          setView('history');
        } catch (offlineErr) {
          alert(`Erro ao salvar offline: ${offlineErr.message}`);
        }
      } else {
        alert(`Erro ao salvar: ${err.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
          <ClipboardCheck className="text-white w-8 h-8" />
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <ClipboardCheck size={40} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Checklist Ambulância</h1>
      <p className="text-gray-500 mb-8 max-w-xs">Entre com a sua conta Google para realizar conferências e consultar o histórico.</p>
      <button 
        onClick={login}
        className="flex items-center gap-3 bg-white border border-gray-300 px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all font-semibold text-gray-700"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        Entrar com Google
      </button>
      {authError && (
        <p className="mt-3 text-xs text-red-600 max-w-xs">{authError}</p>
      )}
      <div className="mt-12 text-center space-y-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secretaria Municipal de Sáude de Datas 2026</p>
        <p className="text-[10px] text-gray-400">Developed by Gean Torres</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-inner">
            <ClipboardCheck className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">AmbuCheck</h1>
            <p className="text-[10px] text-gray-500 uppercase font-semibold">S. Vicente de Paulo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-gray-700">{user.displayName}</p>
          </div>
          {vehicleType && (
            <button
              onClick={() => setShowVehicleTypeModal(true)}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
            >
              {vehicleType === 'ambulancia' ? '🚑 Ambulância' : '🚗 Carro Pequeno'}
            </button>
          )}
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Online Status Indicator */}
      <OnlineStatusIndicator isOnline={isOnline} syncStatus={syncStatus} />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Modal para escolher tipo de veículo */}
        {showVehicleTypeModal && (
          <BaseModal title="Escolher Tipo de Veículo" onClose={() => setShowVehicleTypeModal(false)}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Selecione o tipo de veículo para o checklist:</p>
              <div className="flex gap-4">
                <button
                  onClick={() => selectVehicleType('ambulancia')}
                  className="flex-1 bg-red-500 text-white py-4 px-6 rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  🚑 Ambulância
                </button>
                <button
                  onClick={() => selectVehicleType('carro_pequeno')}
                  className="flex-1 bg-blue-500 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-600 transition-colors"
                >
                  🚗 Carro Pequeno
                </button>
              </div>
            </div>
          </BaseModal>
        )}

        {view === 'form' && vehicleType ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Nova Conferência</h2>
              <p className="text-xs text-gray-500 mb-4">{new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR')}</p>
              
              <div className="space-y-6">
                {renderFormSections()}

                {/* Status Final */}
                <div className="bg-gray-50 p-4 rounded-xl">
                   <p className="text-sm font-bold text-gray-700 mb-3">Liberada para atendimento?</p>
                   <div className="flex gap-4">
                     <button 
                        type="button"
                        onClick={() => setFormData({...formData, liberada: true})}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.liberada ? 'bg-green-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}
                     >
                       SIM
                     </button>
                     <button 
                        type="button"
                        onClick={() => setFormData({...formData, liberada: false})}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${!formData.liberada ? 'bg-red-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}
                     >
                       NÃO
                     </button>
                   </div>
                </div>

                {/* Nome do Motorista */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Nome do Motorista</p>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    placeholder="Digite seu nome completo"
                  />
                </div>
                {/* Placa do Veículo */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Placa do Veiculo</p>
                  <input
                    type="text"
                    value={formData.veiculoNome}
                    onChange={(e) => setFormData({ ...formData, veiculoNome: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    placeholder="Ex: CN2P74"
                  />
                </div>
                {/* Kilometragem */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Kilometragem</p>
                  <input
                    type="number"
                    value={formData.kilometragem}
                    onChange={(e) => setFormData({ ...formData, kilometragem: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    placeholder="Último odômetro"
                  />
                </div>
                {/* Local */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Local</p>
                  <select
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300"
                  >
                    <option value="">Selecione</option>
                    <option>UBS Datas</option>
                    <option>UBS Palmital</option>
                    <option>UBS Tombadouro</option>
                    <option>Unidade Mista</option>
                  </select>
                </div>

                {/* Assinatura */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Assinatura Digital</p>
                  <SignaturePad 
                    onSave={(data) => setFormData({...formData, assinatura: data})} 
                    onClear={() => setFormData({...formData, assinatura: ''})}
                  />
                </div>

                <button 
                  disabled={submitting}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'FINALIZAR CONFERÊNCIA'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 px-2 flex justify-between items-center">
              Histórico Online
              <button
                onClick={() => setShowExportModal(true)}
                className="text-sm font-bold text-red-600"
              >
                Exportar
              </button>
            </h2>
            {history.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200">
                <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">Nenhum registo encontrado.</p>
              </div>
            ) : (
              history.map((item) => (
                <HistoryCard key={item.id} data={item} onExport={handleExportEvent} />
              ))
            )}
          </div>
        )}
      </main>


      {/* export modal */}
      {showExportModal && (
        <ExportHistoryModal
          exportStart={exportStart}
          exportEnd={exportEnd}
          setExportStart={setExportStart}
          setExportEnd={setExportEnd}
          vehicleTypeFilter={vehicleTypeFilter}
          setVehicleTypeFilter={setVehicleTypeFilter}
          exportLayout={exportLayout}
          setExportLayout={setExportLayout}
          onClose={() => {
            setShowExportModal(false);
            setVehicleTypeFilter('all'); // Reset filter when modal closes
            setExportLayout('horizontal');
          }}
          onExport={handleExport}
        />
      )}

      {/* Footer */}
      <footer className="mt-20 mb-20 text-center space-y-1 py-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secretaria Municipal de Sáude de Datas 2026</p>
      </footer>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around shadow-lg">
        <button 
          onClick={() => setView('form')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'form' ? 'text-red-600' : 'text-gray-400'}`}
        >
          <Plus size={24} />
          <span className="text-[10px] font-bold uppercase">Novo</span>
        </button>
        <button 
          onClick={() => setView('history')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'history' ? 'text-red-600' : 'text-gray-400'}`}
        >
          <History size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </button>
      </nav>
    </div>
  );
}

function HistoryCard({ data, onExport }) {
  const [expanded, setExpanded] = useState(false);
  const [exportLayout, setExportLayout] = useState('horizontal');

  const getSections = () => {
    if (data.vehicleType === 'carro_pequeno') {
      return [
        { key: 'documentacao', label: 'Documentação' },
        { key: 'veiculo_comum', label: 'Veículo - Comum' },
        { key: 'iluminacao_carro', label: 'Iluminação' },
        { key: 'parte_externa', label: 'Parte Externa' },
        { key: 'pneus_rodas', label: 'Pneus e Rodas' },
        { key: 'interior', label: 'Interior' },
        { key: 'motor_fluidos', label: 'Motor e Fluídos' },
        { key: 'freios', label: 'Freios' },
        { key: 'suspensao_direcao', label: 'Suspensão e Direção' },
        { key: 'equipamentos', label: 'Equipamentos' }
      ];
    } else {
      return [
        { key: 'documentacao', label: 'Documentação' },
        { key: 'veiculo_comum', label: 'Veículo - Comum' },
        { key: 'iluminacao_carro', label: 'Iluminação' },
        { key: 'parte_externa', label: 'Parte Externa' },
        { key: 'pneus_rodas', label: 'Pneus e Rodas' },
        { key: 'interior', label: 'Interior' },
        { key: 'motor_fluidos', label: 'Motor e Fluídos' },
        { key: 'freios', label: 'Freios' },
        { key: 'suspensao_direcao', label: 'Suspensão e Direção' },
        { key: 'equipamentos', label: 'Equipamentos' },
        { key: 'veiculo_ambulancia', label: 'Equipamentos - Ambulância' },
        { key: 'imobilizacao', label: 'Equipamentos - Imobilização' },
        { key: 'oxigenacao', label: 'Oxigenação' },
        { key: 'biosseguranca', label: 'Biossegurança' }
      ];
    }
  };

  const sections = getSections();
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{data.motorista}</h3>
          <p className="text-xs text-gray-500">Logado como: {data.loggedInUser}</p>
          <p className="text-xs text-gray-500">Veículo: {data.veiculoNome} | Km: {data.kilometragem || '-'} | Local: {data.local || '-'}</p>
          <p className="text-[10px] text-gray-500 uppercase font-bold">{data.dataString}</p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${data.liberada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {data.liberada ? 'Liberada' : 'Bloqueada'}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-red-600 flex items-center gap-1"
          >
            {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
          <div className="flex items-center gap-2">
            <select
              value={exportLayout}
              onChange={(e) => setExportLayout(e.target.value)}
              className="text-[10px] font-semibold text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
            <button
              type="button"
              onClick={() => onExport?.(data, exportLayout)}
              className="text-xs font-bold text-gray-600 border border-gray-200 rounded-xl px-3 py-1 transition hover:border-gray-300"
            >
              Exportar CSV
            </button>
          </div>
        </div>
        <img src={data.assinatura} alt="Assinatura" className="h-8 opacity-60" />
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {sections.map((section) => (
            <div key={section.key} className="bg-gray-50 p-3 rounded-xl">
              <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">{section.label}</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                {data[section.key] && Object.entries(data[section.key]).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1">
                    {val ? <CheckCircle2 size={10} className="text-green-500" /> : <AlertCircle size={10} className="text-red-400" />}
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
