import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
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
import ExportHistoryModal from './components/modals/ExportHistoryModal';
import BaseModal from './components/modals/BaseModal';
import OnlineStatusIndicator from './components/OnlineStatusIndicator';
import { useOnlineStatus, useOfflineStorage } from './hooks/useOnlineStatus';

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
  const { isOnline, syncStatus, setSyncStatus } = useOnlineStatus();
  const { storePendingChecklist, getPendingChecklists, removePendingChecklist } = useOfflineStorage();

  const [user, setUser] = useState(null);
  const [view, setView] = useState('form'); // 'form' ou 'history'
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

// Estado do Formulário
  const initialFormStates = {
    ambulancia: {
      documentacao: {
        crlv: false, licenciamento: false, seguro: false, manual: false
      },
      veiculo_comum: {
        combustivel: false, oleo: false, agua: false, pneus: false, estepe: false, 
        macaco: false, luzes: false, limpador: false, arCondicionado: false
      },
      iluminacao_carro: {
        lanternas: false, luz_freio: false, luz_re: false, setas: false, 
        luz_placa: false, farol_neblina: false
      },
      parte_externa: {
        pintura: false, riscos: false, alinhamento: false, vidros: false, retrovisores: false
      },
      pneus_rodas: {
        desgaste: false, sulcos: false
      },
      interior: {
        cintos: false, bancos: false, painel: false, vidros_eletricos: false, 
        travamento: false, buzina: false
      },
      motor_fluidos: {
        arrefecimento: false, freio: false, vazamentos: false
      },
      freios: {
        pedal: false, freio_mao: false, ruidos: false
      },
      suspensao_direcao: {
        ruidos: false, direcao: false, volante: false
      },
      equipamentos: {
        triangulo: false
      },
      veiculo_ambulancia: {
        setas: false, giroflex: false, sirene: false, maca: false, travasMaca: false
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
      liberada: false,
      assinatura: '',
      driverName: '',
      veiculoNome: '',
      kilometragem: '',
      local: ''
    },
    carro_pequeno: {
      documentacao: {
        crlv: false, licenciamento: false, seguro: false, manual: false
      },
      veiculo_comum: {
        combustivel: false, oleo: false, agua: false, pneus: false, estepe: false, 
        macaco: false, luzes: false, limpador: false, arCondicionado: false
      },
      iluminacao_carro: {
        lanternas: false, luz_freio: false, luz_re: false, setas: false, 
        luz_placa: false, farol_neblina: false
      },
      parte_externa: {
        pintura: false, riscos: false, alinhamento: false, vidros: false, retrovisores: false
      },
      pneus_rodas: {
        desgaste: false, sulcos: false
      },
      interior: {
        cintos: false, bancos: false, painel: false, vidros_eletricos: false, 
        travamento: false, buzina: false
      },
      motor_fluidos: {
        arrefecimento: false, freio: false, vazamentos: false
      },
      freios: {
        pedal: false, freio_mao: false, ruidos: false
      },
      suspensao_direcao: {
        ruidos: false, direcao: false, volante: false
      },
      equipamentos: {
        triangulo: false
      },
      liberada: false,
      assinatura: '',
      driverName: '',
      veiculoNome: '',
      kilometragem: '',
      local: ''
    }
  };

  const [vehicleType, setVehicleType] = useState(null); // 'ambulancia' or 'carro_pequeno'
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(true);
  const [formData, setFormData] = useState(initialFormStates.ambulancia);
  // states for export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all'); // 'all', 'ambulancia', 'carro_pequeno'

  const selectVehicleType = (type) => {
    setVehicleType(type);
    setFormData(initialFormStates[type]);
    setShowVehicleTypeModal(false);
  };

  const renderFormSections = () => {
    const renderCommonSections = () => (
      <>
        {/* Segurança e Rodagem */}
        <Section title="Segurança e Rodagem">
          <CheckItem label="Pneus calibrados" active={formData.veiculo_comum.pneus} onToggle={() => handleToggle('veiculo_comum', 'pneus')} />
          <CheckItem label="Estepe em condições" active={formData.veiculo_comum.estepe} onToggle={() => handleToggle('veiculo_comum', 'estepe')} />
          <CheckItem label="Macaco e chave de roda" active={formData.veiculo_comum.macaco} onToggle={() => handleToggle('veiculo_comum', 'macaco')} />
          <CheckItem label="Pedal de freio firme" active={formData.freios.pedal} onToggle={() => handleToggle('freios', 'pedal')} />
          <CheckItem label="Freio de mão funcionando" active={formData.freios.freio_mao} onToggle={() => handleToggle('freios', 'freio_mao')} />
          <CheckItem label="Ausência de ruídos ao frear" active={formData.freios.ruidos} onToggle={() => handleToggle('freios', 'ruidos')} />
          <CheckItem label="Sem ruídos ao passar em irregularidades" active={formData.suspensao_direcao.ruidos} onToggle={() => handleToggle('suspensao_direcao', 'ruidos')} />
          <CheckItem label="Direção alinhada" active={formData.suspensao_direcao.direcao} onToggle={() => handleToggle('suspensao_direcao', 'direcao')} />
          <CheckItem label="Volante sem vibrações" active={formData.suspensao_direcao.volante} onToggle={() => handleToggle('suspensao_direcao', 'volante')} />
          <CheckItem label="Triângulo de sinalização" active={formData.equipamentos.triangulo} onToggle={() => handleToggle('equipamentos', 'triangulo')} />
        </Section>

        {/* Iluminação e Sinalização */}
        <Section title="Iluminação e Sinalização">
          <CheckItem label="Luz alta e baixa" active={formData.veiculo_comum.luzes} onToggle={() => handleToggle('veiculo_comum', 'luzes')} />
          <CheckItem label="Lanternas traseiras" active={formData.iluminacao_carro.lanternas} onToggle={() => handleToggle('iluminacao_carro', 'lanternas')} />
          <CheckItem label="Luz de freio" active={formData.iluminacao_carro.luz_freio} onToggle={() => handleToggle('iluminacao_carro', 'luz_freio')} />
          <CheckItem label="Luz de ré" active={formData.iluminacao_carro.luz_re} onToggle={() => handleToggle('iluminacao_carro', 'luz_re')} />
          <CheckItem label="Setas" active={formData.iluminacao_carro.setas} onToggle={() => handleToggle('iluminacao_carro', 'setas')} />
          <CheckItem label="Luz de placa" active={formData.iluminacao_carro.luz_placa} onToggle={() => handleToggle('iluminacao_carro', 'luz_placa')} />
          <CheckItem label="Farol de neblina (se houver)" active={formData.iluminacao_carro.farol_neblina} onToggle={() => handleToggle('iluminacao_carro', 'farol_neblina')} />
        </Section>

        {/* Fluidos e Motor */}
        <Section title="Fluidos e Motor">
          <CheckItem label="Combustível acima de ½ tanque" active={formData.veiculo_comum.combustivel} onToggle={() => handleToggle('veiculo_comum', 'combustivel')} />
          <CheckItem label="Óleo do motor" active={formData.veiculo_comum.oleo} onToggle={() => handleToggle('veiculo_comum', 'oleo')} />
          <CheckItem label="Água do radiador" active={formData.veiculo_comum.agua} onToggle={() => handleToggle('veiculo_comum', 'agua')} />
          <CheckItem label="Limpador de para-brisa" active={formData.veiculo_comum.limpador} onToggle={() => handleToggle('veiculo_comum', 'limpador')} />
          <CheckItem label="Nível do líquido de arrefecimento" active={formData.motor_fluidos.arrefecimento} onToggle={() => handleToggle('motor_fluidos', 'arrefecimento')} />
          <CheckItem label="Fluído de freio" active={formData.motor_fluidos.freio} onToggle={() => handleToggle('motor_fluidos', 'freio')} />
          <CheckItem label="Vazamentos aparentes no motor" active={formData.motor_fluidos.vazamentos} onToggle={() => handleToggle('motor_fluidos', 'vazamentos')} />
        </Section>

        {/* Cabine e Conforto Operacional */}
        <Section title="Cabine e Conforto Operacional">
          <CheckItem label="Ar-condicionado" active={formData.veiculo_comum.arCondicionado} onToggle={() => handleToggle('veiculo_comum', 'arCondicionado')} />
          <CheckItem label="Funcionamento dos cintos de segurança" active={formData.interior.cintos} onToggle={() => handleToggle('interior', 'cintos')} />
          <CheckItem label="Bancos firmes e regulagem funcionando" active={formData.interior.bancos} onToggle={() => handleToggle('interior', 'bancos')} />
          <CheckItem label="Painel sem alertas acesos" active={formData.interior.painel} onToggle={() => handleToggle('interior', 'painel')} />
          <CheckItem label="Vidros elétricos" active={formData.interior.vidros_eletricos} onToggle={() => handleToggle('interior', 'vidros_eletricos')} />
          <CheckItem label="Travamento das portas" active={formData.interior.travamento} onToggle={() => handleToggle('interior', 'travamento')} />
          <CheckItem label="Buzina funcionando" active={formData.interior.buzina} onToggle={() => handleToggle('interior', 'buzina')} />
        </Section>

        {/* Parte Externa */}
        <Section title="Parte Externa">
          <CheckItem label="Estado geral da pintura" active={formData.parte_externa.pintura} onToggle={() => handleToggle('parte_externa', 'pintura')} />
          <CheckItem label="Presença de riscos, amassados ou ferrugem" active={formData.parte_externa.riscos} onToggle={() => handleToggle('parte_externa', 'riscos')} />
          <CheckItem label="Alinhamento de portas, capô e porta-malas" active={formData.parte_externa.alinhamento} onToggle={() => handleToggle('parte_externa', 'alinhamento')} />
          <CheckItem label="Vidros sem trincas ou rachaduras" active={formData.parte_externa.vidros} onToggle={() => handleToggle('parte_externa', 'vidros')} />
          <CheckItem label="Retrovisores firmes e íntegros" active={formData.parte_externa.retrovisores} onToggle={() => handleToggle('parte_externa', 'retrovisores')} />
        </Section>

        {/* Pneus e Rodas */}
        <Section title="Pneus e Rodas">
          <CheckItem label="Desgaste uniforme dos pneus" active={formData.pneus_rodas.desgaste} onToggle={() => handleToggle('pneus_rodas', 'desgaste')} />
          <CheckItem label="Sulcos acima do limite mínimo" active={formData.pneus_rodas.sulcos} onToggle={() => handleToggle('pneus_rodas', 'sulcos')} />
        </Section>

        {/* Documentação */}
        <Section title="Documentação">
          <CheckItem label="CRLV / documento do veículo em dia" active={formData.documentacao.crlv} onToggle={() => handleToggle('documentacao', 'crlv')} />
          <CheckItem label="Licenciamento pago" active={formData.documentacao.licenciamento} onToggle={() => handleToggle('documentacao', 'licenciamento')} />
          <CheckItem label="Seguro obrigatório / seguro do veículo (se houver)" active={formData.documentacao.seguro} onToggle={() => handleToggle('documentacao', 'seguro')} />
          <CheckItem label="Manual do proprietário no carro" active={formData.documentacao.manual} onToggle={() => handleToggle('documentacao', 'manual')} />
        </Section>
      </>
    );

    if (vehicleType === 'ambulancia') {
      return (
        <>
          {renderCommonSections()}

          {/* Equipamentos Específicos - Ambulância */}
          <Section title="Equipamentos Específicos da Ambulância">
            <CheckItem label="Setas e luz de freio" active={formData.veiculo_ambulancia.setas} onToggle={() => handleToggle('veiculo_ambulancia', 'setas')} />
            <CheckItem label="Giroflex funcionando" active={formData.veiculo_ambulancia.giroflex} onToggle={() => handleToggle('veiculo_ambulancia', 'giroflex')} />
            <CheckItem label="Sirene funcionando" active={formData.veiculo_ambulancia.sirene} onToggle={() => handleToggle('veiculo_ambulancia', 'sirene')} />
            <CheckItem label="Maca principal funcionando" active={formData.veiculo_ambulancia.maca} onToggle={() => handleToggle('veiculo_ambulancia', 'maca')} />
            <CheckItem label="Travas da maca" active={formData.veiculo_ambulancia.travasMaca} onToggle={() => handleToggle('veiculo_ambulancia', 'travasMaca')} />
          </Section>

          {/* 2. Imobilização */}
          <Section title="Equipamentos de Imobilização">
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
          <Section title="Oxigenação e Ventilação">
            <CheckItem label="Cilindro de oxigênio cheio" active={formData.oxigenacao.cilindroCheio} onToggle={() => handleToggle('oxigenacao', 'cilindroCheio')} />
            <CheckItem label="Cilindro reserva" active={formData.oxigenacao.cilindroReserva} onToggle={() => handleToggle('oxigenacao', 'cilindroReserva')} />
            <CheckItem label="Fluxômetro e Umidificador" active={formData.oxigenacao.fluxometro} onToggle={() => handleToggle('oxigenacao', 'fluxometro')} />
            <CheckItem label="Máscaras O2 (Adulto/Ped)" active={formData.oxigenacao.mascaraAdulto} onToggle={() => handleToggle('oxigenacao', 'mascaraAdulto')} />
            <CheckItem label="Ambu (Adulto/Ped)" active={formData.oxigenacao.ambuAdulto} onToggle={() => handleToggle('oxigenacao', 'ambuAdulto')} />
            <CheckItem label="Aspirador portátil" active={formData.oxigenacao.aspirador} onToggle={() => handleToggle('oxigenacao', 'aspirador')} />
          </Section>

          {/* 4. Biossegurança */}
          <Section title="Biossegurança">
            <CheckItem label="Sacou para lixo infectante/comum" active={formData.biosseguranca.lixoInfectante} onToggle={() => handleToggle('biosseguranca', 'lixoInfectante')} />
            <CheckItem label="Desinfetante e Papel Toalha" active={formData.biosseguranca.desinfetante} onToggle={() => handleToggle('biosseguranca', 'desinfetante')} />
            <CheckItem label="Caixa coletora perfurocortante" active={formData.biosseguranca.caixaPerfuro} onToggle={() => handleToggle('biosseguranca', 'caixaPerfuro')} />
          </Section>
        </>
      );
    } else if (vehicleType === 'carro_pequeno') {
      return (
        <>
          {renderCommonSections()}
        </>
      );
    }
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
    // Campos comuns a todos os veículos
    'veiculo_comum.combustivel': 'Combustível acima de ½ tanque',
    'veiculo_comum.oleo': 'Óleo do motor',
    'veiculo_comum.agua': 'Água do radiador',
    'veiculo_comum.pneus': 'Pneus calibrados',
    'veiculo_comum.estepe': 'Estepe em condições',
    'veiculo_comum.macaco': 'Macaco e chave de roda',
    'veiculo_comum.luzes': 'Luz alta e baixa',
    'veiculo_comum.limpador': 'Limpador de para-brisa',
    'veiculo_comum.arCondicionado': 'Ar-condicionado',
    // Campos específicos da ambulância
    'veiculo_ambulancia.setas': 'Setas e luz de freio',
    'veiculo_ambulancia.giroflex': 'Giroflex funcionando',
    'veiculo_ambulancia.sirene': 'Sirene funcionando',
    'veiculo_ambulancia.maca': 'Maca principal funcionando',
    'veiculo_ambulancia.travasMaca': 'Travas da maca',
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
    vehicleType: 'Tipo de veículo',
    // Campos para carro pequeno
    'documentacao.crlv': 'CRLV / documento do veículo em dia',
    'documentacao.licenciamento': 'Licenciamento pago',
    'documentacao.seguro': 'Seguro obrigatório / seguro do veículo',
    'documentacao.manual': 'Manual do proprietário no carro',
    'parte_externa.pintura': 'Estado geral da pintura',
    'parte_externa.riscos': 'Presença de riscos, amassados ou ferrugem',
    'parte_externa.alinhamento': 'Alinhamento de portas, capô e porta-malas',
    'parte_externa.vidros': 'Vidros sem trincas ou rachaduras',
    'parte_externa.retrovisores': 'Retrovisores firmes e íntegros',
    'pneus_rodas.desgaste': 'Desgaste uniforme dos pneus',
    'pneus_rodas.sulcos': 'Sulcos acima do limite mínimo',
    // Iluminação específica do carro
    'iluminacao_carro.lanternas': 'Lanternas traseiras',
    'iluminacao_carro.luz_freio': 'Luz de freio',
    'iluminacao_carro.luz_re': 'Luz de ré',
    'iluminacao_carro.setas': 'Setas',
    'iluminacao_carro.luz_placa': 'Luz de placa',
    'iluminacao_carro.farol_neblina': 'Farol de neblina (se houver)',
    'interior.cintos': 'Funcionamento dos cintos de segurança',
    'interior.bancos': 'Bancos firmes e regulagem funcionando',
    'interior.painel': 'Painel sem alertas acesos',
    'interior.vidros_eletricos': 'Vidros elétricos',
    'interior.travamento': 'Travamento das portas',
    'interior.buzina': 'Buzina funcionando',
    'motor_fluidos.arrefecimento': 'Nível do líquido de arrefecimento',
    'motor_fluidos.freio': 'Fluído de freio',
    'motor_fluidos.vazamentos': 'Vazamentos aparentes no motor',
    'freios.pedal': 'Pedal de freio firme',
    'freios.freio_mao': 'Freio de mão funcionando',
    'freios.ruidos': 'Ausência de ruídos ao frear',
    'suspensao_direcao.ruidos': 'Sem ruídos ao passar em irregularidades',
    'suspensao_direcao.direcao': 'Direção alinhada',
    'suspensao_direcao.volante': 'Volante sem vibrações',
    'equipamentos.triangulo': 'Triângulo de sinalização'
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
      (item) => {
        const inDateRange = item.createdAt >= startTs && item.createdAt <= endTs;
        const matchesType = vehicleTypeFilter === 'all' || item.vehicleType === vehicleTypeFilter;
        return inDateRange && matchesType;
      }
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
    const formatVal = (v) => v === true ? '✅' : v === false ? '❌' : v;
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
    setVehicleTypeFilter('all'); // Reset filter after export
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
                <HistoryCard key={item.id} data={item} />
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
          onClose={() => {
            setShowExportModal(false);
            setVehicleTypeFilter('all'); // Reset filter when modal closes
          }}
          onExport={handleExport}
        />
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
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${active ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
    >
      <span className={`text-sm ${active ? 'text-green-700 font-medium' : 'text-red-600'}`}>{label}</span>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-green-500' : 'bg-gray-100'}`}>
        {active && <CheckCircle2 className="text-white" size={14} />}
      </div>
    </div>
  );
}

function HistoryCard({ data }) {
  const [expanded, setExpanded] = useState(false);

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
