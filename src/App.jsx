import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc, 
  setDoc
} from 'firebase/firestore';
import { app, auth, db } from '../firebase';
import { 
  ClipboardCheck, 
  History, 
  LogOut, 
  User, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2
} from 'lucide-react';

// Firebase is initialized in `firebase.js` and exported as `app`, `auth`, `db`.
const appId = 'ambulance-checklist-app';

// --- Componente de Assinatura (Canvas) ---
const SignaturePad = ({ onSave, onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    onSave(canvasRef.current.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="w-full">
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-32 touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button 
          onClick={clear}
          className="absolute top-2 right-2 text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
        >
          Limpar
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold text-center">Assinatura do Motorista</p>
    </div>
  );
};

// --- Aplicação Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('form'); // 'form' ou 'history'
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Estado do Formulário
  const initialFormState = {
    veiculo: {
      combustivel: false, oleo: false, agua: false, pneus: false, estepe: false, 
      macaco: false, luzes: false, setas: false, giroflex: false, sirene: false, 
      limpador: false, arCondicionado: false, maca: false, travasMaca: false
    },
    imobilizacao: {
      prancha: false, cintoAranha: false, headBlock: false, colares: false, 
      talas: false, bandagens: false, cobertor: false, cadeiraRemocao: false
    },
    oxigenacao: {
      cilindroCheio: false, cilindroReserva: false, fluxometro: false, umidificador: false,
      mascaraAdulto: false, mascaraPed: false, mascaraReservatorio: false,
      ambuAdulto: false, ambuPed: false, aspirador: false, sondas: false
    },
    biosseguranca: {
      lixoInfectante: false, lixoComum: false, desinfetante: false, 
      papelToalha: false, caixaPerfuro: false
    },
    liberada: true,
    assinatura: '',
    driverName: '',
    veiculoNome: '',
    kilometragem: '',
    local: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  // states for export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  // Inicializar Auth
  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
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
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = (section, item) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [item]: !prev[section][item] }
    }));
  };

  // flatten object recursively for CSV export
  const flatten = (obj, prefix = '') => {
    let res = {};
    for (const key in obj) {
      if (
        obj[key] &&
        typeof obj[key] === 'object' &&
        !Array.isArray(obj[key])
      ) {
        Object.assign(res, flatten(obj[key], prefix + key + '.'));
      } else {
        res[prefix + key] = obj[key];
      }
    }
    return res;
  };

  // mapping for human-readable column names
  const fieldLabels = {
    motorista: 'Motorista',
    loggedInUser: 'Usuário logado',
    createdAt: 'Timestamp',
    dataString: 'Data',
    liberada: 'Liberada',
    motoristaUid: 'UID do motorista',
    'veiculo.combustivel': 'Combustível acima de ½ tanque',
    'veiculo.oleo': 'Óleo do motor',
    'veiculo.agua': 'Água do radiador',
    'veiculo.pneus': 'Pneus calibrados',
    'veiculo.estepe': 'Estepe em condições',
    'veiculo.macaco': 'Macaco e chave de roda',
    'veiculo.luzes': 'Luz alta e baixa',
    'veiculo.setas': 'Setas e luz de freio',
    'veiculo.giroflex': 'Giroflex funcionando',
    'veiculo.sirene': 'Sirene funcionando',
    'veiculo.limpador': 'Limpador de para-brisa',
    'veiculo.arCondicionado': 'Ar-condicionado',
    'veiculo.maca': 'Maca principal funcionando',
    'veiculo.travasMaca': 'Travas da maca',
    'imobilizacao.prancha': 'Prancha longa',
    'imobilizacao.cintoAranha': 'Cinto aranha',
    'imobilizacao.headBlock': 'Tirante de cabeça (head block)',
    'imobilizacao.colares': 'Colares cervicais',
    'imobilizacao.talas': 'Talas de imobilização',
    'imobilizacao.bandagens': 'Bandagens triangulares',
    'imobilizacao.cobertor': 'Cobertor/manta térmica',
    'imobilizacao.cadeiraRemocao': 'Cadeira de rodas/remoção',
    'oxigenacao.cilindroCheio': 'Cilindro de oxigênio cheio',
    'oxigenacao.cilindroReserva': 'Cilindro reserva',
    'oxigenacao.fluxometro': 'Fluxômetro e umidificador',
    'oxigenacao.umidificador': 'Umidificador',
    'oxigenacao.mascaraAdulto': 'Máscara O2 adulto',
    'oxigenacao.mascaraPed': 'Máscara O2 ped',
    'oxigenacao.mascaraReservatorio': 'Máscara de reservatório',
    'oxigenacao.ambuAdulto': 'Ambu adulto',
    'oxigenacao.ambuPed': 'Ambu ped',
    'oxigenacao.aspirador': 'Aspirador portátil',
    'biosseguranca.lixoInfectante': 'Lixo infectante',
    'biosseguranca.lixoComum': 'Lixo comum',
    'biosseguranca.desinfetante': 'Desinfetante e papel-toalha',
    'biosseguranca.papelToalha': 'Papel toalha',
    'biosseguranca.caixaPerfuro': 'Caixa coletora perfurocortante',
    driverName: 'Nome do motorista',
    veiculoNome: 'Nome do veículo',
    kilometragem: 'Kilometragem',
    local: 'Local',
  };

  const handleExport = () => {
    if (!exportStart || !exportEnd) return;
    // parse local dates instead of relying on Date(string) which converts
    // the value to UTC and then .setHours() applies local tz, resulting in
    // offsets that can exclude same-day records (e.g. Brazil UTC-3).
    const parseLocalDate = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const startDate = parseLocalDate(exportStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = parseLocalDate(exportEnd);
    endDate.setHours(23, 59, 59, 999);
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();
    const filtered = history.filter(
      (item) => item.createdAt >= startTs && item.createdAt <= endTs
    );
    if (filtered.length === 0) {
      alert('Nenhum registro no período selecionado.');
      return;
    }
    const rows = filtered.map((r) => {
      const clone = { ...r };
      delete clone.assinatura;
      delete clone.id;          // remove firestore document id
      return flatten(clone);
    });
    let headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    // ensure ordering: motorista then loggedInUser first
    headers = headers.filter(h => h !== 'motorista' && h !== 'loggedInUser');
    headers.unshift('loggedInUser');
    headers.unshift('motorista');
    const humanHeaders = headers.map(h => fieldLabels[h] || h);
    const formatVal = (v) => v === true ? 'Sim' : v === false ? 'Não' : v;
    const csv = [humanHeaders.join(',')]
      .concat(
        rows.map((r) =>
          headers
            .map((h) => JSON.stringify(formatVal(r[h] ?? '')))
            .join(',')
        )
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_${exportStart}_${exportEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setExportStart('');
    setExportEnd('');
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

    setSubmitting(true);
    try {
      console.log("Tentando enviar checklist para Firestore...", { uid: user.uid, name: formData.driverName });
      const docRef = await addDoc(collection(db, 'checklists'), {
        ...formData,
        motorista: formData.driverName,
        loggedInUser: user.displayName || user.email,
        motoristaUid: user.uid,
        createdAt: Date.now(),
        dataString: new Date().toLocaleString('pt-BR')
      });
      console.log("✅ Checklist salvo com sucesso! ID:", docRef.id);
      setFormData(initialFormState);
      setView('history');
    } catch (err) {
      console.error("❌ Erro ao salvar:", err.code, err.message);
      alert(`Erro ao salvar: ${err.message}`);
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
      <p className="mt-12 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Unidade Mista São Vicente de Paulo</p>
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
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {view === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Nova Conferência</h2>
              <p className="text-xs text-gray-500 mb-4">{new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR')}</p>
              
              <div className="space-y-6">
                {/* 1. Condições do Veículo */}
                <Section title="1. Condições do Veículo">
                  <CheckItem label="Combustível acima de ½ tanque" active={formData.veiculo.combustivel} onToggle={() => handleToggle('veiculo', 'combustivel')} />
                  <CheckItem label="Óleo do motor" active={formData.veiculo.oleo} onToggle={() => handleToggle('veiculo', 'oleo')} />
                  <CheckItem label="Água do radiador" active={formData.veiculo.agua} onToggle={() => handleToggle('veiculo', 'agua')} />
                  <CheckItem label="Pneus calibrados" active={formData.veiculo.pneus} onToggle={() => handleToggle('veiculo', 'pneus')} />
                  <CheckItem label="Estepe em condições" active={formData.veiculo.estepe} onToggle={() => handleToggle('veiculo', 'estepe')} />
                  <CheckItem label="Macaco e chave de roda" active={formData.veiculo.macaco} onToggle={() => handleToggle('veiculo', 'macaco')} />
                  <CheckItem label="Luz alta e baixa" active={formData.veiculo.luzes} onToggle={() => handleToggle('veiculo', 'luzes')} />
                  <CheckItem label="Setas e luz de freio" active={formData.veiculo.setas} onToggle={() => handleToggle('veiculo', 'setas')} />
                  <CheckItem label="Giroflex funcionando" active={formData.veiculo.giroflex} onToggle={() => handleToggle('veiculo', 'giroflex')} />
                  <CheckItem label="Sirene funcionando" active={formData.veiculo.sirene} onToggle={() => handleToggle('veiculo', 'sirene')} />
                  <CheckItem label="Limpador de para-brisa" active={formData.veiculo.limpador} onToggle={() => handleToggle('veiculo', 'limpador')} />
                  <CheckItem label="Ar-condicionado" active={formData.veiculo.arCondicionado} onToggle={() => handleToggle('veiculo', 'arCondicionado')} />
                  <CheckItem label="Maca principal funcionando" active={formData.veiculo.maca} onToggle={() => handleToggle('veiculo', 'maca')} />
                  <CheckItem label="Travas da maca" active={formData.veiculo.travasMaca} onToggle={() => handleToggle('veiculo', 'travasMaca')} />
                </Section>

                {/* 2. Imobilização */}
                <Section title="2. Equipamentos de Imobilização">
                  <CheckItem label="Prancha longa" active={formData.imobilizacao.prancha} onToggle={() => handleToggle('imobilizacao', 'prancha')} />
                  <CheckItem label="Cinto aranha" active={formData.imobilizacao.cintoAranha} onToggle={() => handleToggle('imobilizacao', 'cintoAranha')} />
                  <CheckItem label="Tirante de cabeça (head block)" active={formData.imobilizacao.headBlock} onToggle={() => handleToggle('imobilizacao', 'headBlock')} />
                  <CheckItem label="Colares cervicais (PP ao GG)" active={formData.imobilizacao.colares} onToggle={() => handleToggle('imobilizacao', 'colares')} />
                  <CheckItem label="Talas de imobilização" active={formData.imobilizacao.talas} onToggle={() => handleToggle('imobilizacao', 'talas')} />
                  <CheckItem label="Bandagens triangulares" active={formData.imobilizacao.bandagens} onToggle={() => handleToggle('imobilizacao', 'bandagens')} />
                  <CheckItem label="Cobertor/manta térmica" active={formData.imobilizacao.cobertor} onToggle={() => handleToggle('imobilizacao', 'cobertor')} />
                  <CheckItem label="Cadeira de rodas/remoção" active={formData.imobilizacao.cadeiraRemocao} onToggle={() => handleToggle('imobilizacao', 'cadeiraRemocao')} />
                </Section>

                {/* 3. Oxigenação */}
                <Section title="3. Oxigenação e Ventilação">
                  <CheckItem label="Cilindro de oxigênio cheio" active={formData.oxigenacao.cilindroCheio} onToggle={() => handleToggle('oxigenacao', 'cilindroCheio')} />
                  <CheckItem label="Cilindro reserva" active={formData.oxigenacao.cilindroReserva} onToggle={() => handleToggle('oxigenacao', 'cilindroReserva')} />
                  <CheckItem label="Fluxômetro e Umidificador" active={formData.oxigenacao.fluxometro} onToggle={() => handleToggle('oxigenacao', 'fluxometro')} />
                  <CheckItem label="Máscaras O2 (Adulto/Ped)" active={formData.oxigenacao.mascaraAdulto} onToggle={() => handleToggle('oxigenacao', 'mascaraAdulto')} />
                  <CheckItem label="Ambu (Adulto/Ped)" active={formData.oxigenacao.ambuAdulto} onToggle={() => handleToggle('oxigenacao', 'ambuAdulto')} />
                  <CheckItem label="Aspirador portátil" active={formData.oxigenacao.aspirador} onToggle={() => handleToggle('oxigenacao', 'aspirador')} />
                </Section>

                {/* 4. Biossegurança */}
                <Section title="4. Biossegurança">
                  <CheckItem label="Sacou para lixo infectante/comum" active={formData.biosseguranca.lixoInfectante} onToggle={() => handleToggle('biosseguranca', 'lixoInfectante')} />
                  <CheckItem label="Desinfetante e Papel Toalha" active={formData.biosseguranca.desinfetante} onToggle={() => handleToggle('biosseguranca', 'desinfetante')} />
                  <CheckItem label="Caixa coletora perfurocortante" active={formData.biosseguranca.caixaPerfuro} onToggle={() => handleToggle('biosseguranca', 'caixaPerfuro')} />
                </Section>

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
                {/* Nome do Veículo */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700">Nome do Veículo</p>
                  <input
                    type="text"
                    value={formData.veiculoNome}
                    onChange={(e) => setFormData({ ...formData, veiculoNome: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    placeholder="Ex: Ambulância 01"
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
                <HistoryCard key={item.id} data={item} />
              ))
            )}
          </div>
        )}
      </main>


      {/* export modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Exportar Histórico</h3>
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
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                disabled={
                  !exportStart || !exportEnd || exportStart > exportEnd
                }
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}

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

// --- Sub-componentes UI ---

function Section({ title, children }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-bold text-gray-700">{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function CheckItem({ label, active, onToggle }) {
  return (
    <div 
      onClick={onToggle}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${active ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}
    >
      <span className={`text-sm ${active ? 'text-green-700 font-medium' : 'text-gray-600'}`}>{label}</span>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-green-500' : 'bg-gray-100'}`}>
        {active && <CheckCircle2 className="text-white" size={14} />}
      </div>
    </div>
  );
}

function HistoryCard({ data }) {
  const [expanded, setExpanded] = useState(false);

  const sections = [
    { key: 'veiculo', label: 'Veículo' },
    { key: 'imobilizacao', label: 'Imobilização' },
    { key: 'oxigenacao', label: 'Oxigenação' },
    { key: 'biosseguranca', label: 'Biossegurança' }
  ];
  
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
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-red-600 flex items-center gap-1"
        >
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>
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
