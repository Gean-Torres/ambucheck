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

// Estado do Formulário
  const initialFormStates = {
    ambulancia: {
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
      parte_externa: {
        pintura: false, riscos: false, alinhamento: false, vidros: false, retrovisores: false
      },
      pneus_rodas: {
        calibragem: false, desgaste: false, sulcos: false, estepe: false, macaco_chave: false
      },
      iluminacao: {
        farois: false, lanternas: false, luz_freio: false, luz_re: false, 
        pisca: false, luz_placa: false, farol_neblina: false
      },
      interior: {
        cintos: false, bancos: false, painel: false, ar_condicionado: false, 
        vidros_eletricos: false, travamento: false, buzina: false
      },
      motor_fluidos: {
        oleo: false, arrefecimento: false, freio: false, limpador: false, vazamentos: false
      },
      freios: {
        pedal: false, freio_mao: false, ruidos: false
      },
      suspensao_direcao: {
        ruidos: false, direcao: false, volante: false
      },
      equipamentos: {
        triangulo: false, macaco: false, chave_roda: false, estepe: false
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
    if (vehicleType === 'ambulancia') {
      return (
        <>
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
        </>
      );
    } else if (vehicleType === 'carro_pequeno') {
      return (
        <>
          {/* Documentação */}
          <Section title="Documentação">
            <CheckItem label="CRLV / documento do veículo em dia" active={formData.documentacao.crlv} onToggle={() => handleToggle('documentacao', 'crlv')} />
            <CheckItem label="Licenciamento pago" active={formData.documentacao.licenciamento} onToggle={() => handleToggle('documentacao', 'licenciamento')} />
            <CheckItem label="Seguro obrigatório / seguro do veículo (se houver)" active={formData.documentacao.seguro} onToggle={() => handleToggle('documentacao', 'seguro')} />
            <CheckItem label="Manual do proprietário no carro" active={formData.documentacao.manual} onToggle={() => handleToggle('documentacao', 'manual')} />
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
            <CheckItem label="Calibragem correta" active={formData.pneus_rodas.calibragem} onToggle={() => handleToggle('pneus_rodas', 'calibragem')} />
            <CheckItem label="Desgaste uniforme dos pneus" active={formData.pneus_rodas.desgaste} onToggle={() => handleToggle('pneus_rodas', 'desgaste')} />
            <CheckItem label="Sulcos acima do limite mínimo" active={formData.pneus_rodas.sulcos} onToggle={() => handleToggle('pneus_rodas', 'sulcos')} />
            <CheckItem label="Estepe em bom estado" active={formData.pneus_rodas.estepe} onToggle={() => handleToggle('pneus_rodas', 'estepe')} />
            <CheckItem label="Macaco e chave de roda presentes" active={formData.pneus_rodas.macaco_chave} onToggle={() => handleToggle('pneus_rodas', 'macaco_chave')} />
          </Section>

          {/* Iluminação */}
          <Section title="Iluminação">
            <CheckItem label="Faróis baixos e altos" active={formData.iluminacao.farois} onToggle={() => handleToggle('iluminacao', 'farois')} />
            <CheckItem label="Lanternas traseiras" active={formData.iluminacao.lanternas} onToggle={() => handleToggle('iluminacao', 'lanternas')} />
            <CheckItem label="Luz de freio" active={formData.iluminacao.luz_freio} onToggle={() => handleToggle('iluminacao', 'luz_freio')} />
            <CheckItem label="Luz de ré" active={formData.iluminacao.luz_re} onToggle={() => handleToggle('iluminacao', 'luz_re')} />
            <CheckItem label="Pisca / setas" active={formData.iluminacao.pisca} onToggle={() => handleToggle('iluminacao', 'pisca')} />
            <CheckItem label="Luz de placa" active={formData.iluminacao.luz_placa} onToggle={() => handleToggle('iluminacao', 'luz_placa')} />
            <CheckItem label="Farol de neblina (se houver)" active={formData.iluminacao.farol_neblina} onToggle={() => handleToggle('iluminacao', 'farol_neblina')} />
          </Section>

          {/* Interior do Veículo */}
          <Section title="Interior do Veículo">
            <CheckItem label="Funcionamento dos cintos de segurança" active={formData.interior.cintos} onToggle={() => handleToggle('interior', 'cintos')} />
            <CheckItem label="Bancos firmes e regulagem funcionando" active={formData.interior.bancos} onToggle={() => handleToggle('interior', 'bancos')} />
            <CheckItem label="Painel sem alertas acesos" active={formData.interior.painel} onToggle={() => handleToggle('interior', 'painel')} />
            <CheckItem label="Ar-condicionado / ventilação" active={formData.interior.ar_condicionado} onToggle={() => handleToggle('interior', 'ar_condicionado')} />
            <CheckItem label="Vidros elétricos" active={formData.interior.vidros_eletricos} onToggle={() => handleToggle('interior', 'vidros_eletricos')} />
            <CheckItem label="Travamento das portas" active={formData.interior.travamento} onToggle={() => handleToggle('interior', 'travamento')} />
            <CheckItem label="Buzina funcionando" active={formData.interior.buzina} onToggle={() => handleToggle('interior', 'buzina')} />
          </Section>

          {/* Motor e Fluídos */}
          <Section title="Motor e Fluídos">
            <CheckItem label="Nível do óleo do motor" active={formData.motor_fluidos.oleo} onToggle={() => handleToggle('motor_fluidos', 'oleo')} />
            <CheckItem label="Nível do líquido de arrefecimento" active={formData.motor_fluidos.arrefecimento} onToggle={() => handleToggle('motor_fluidos', 'arrefecimento')} />
            <CheckItem label="Fluído de freio" active={formData.motor_fluidos.freio} onToggle={() => handleToggle('motor_fluidos', 'freio')} />
            <CheckItem label="Fluído do limpador de para-brisa" active={formData.motor_fluidos.limpador} onToggle={() => handleToggle('motor_fluidos', 'limpador')} />
            <CheckItem label="Vazamentos aparentes no motor" active={formData.motor_fluidos.vazamentos} onToggle={() => handleToggle('motor_fluidos', 'vazamentos')} />
          </Section>

          {/* Sistema de Freios */}
          <Section title="Sistema de Freios">
            <CheckItem label="Pedal de freio firme" active={formData.freios.pedal} onToggle={() => handleToggle('freios', 'pedal')} />
            <CheckItem label="Freio de mão funcionando" active={formData.freios.freio_mao} onToggle={() => handleToggle('freios', 'freio_mao')} />
            <CheckItem label="Ausência de ruídos ao frear" active={formData.freios.ruidos} onToggle={() => handleToggle('freios', 'ruidos')} />
          </Section>

          {/* Suspensão e Direção */}
          <Section title="Suspensão e Direção">
            <CheckItem label="Sem ruídos ao passar em irregularidades" active={formData.suspensao_direcao.ruidos} onToggle={() => handleToggle('suspensao_direcao', 'ruidos')} />
            <CheckItem label="Direção alinhada" active={formData.suspensao_direcao.direcao} onToggle={() => handleToggle('suspensao_direcao', 'direcao')} />
            <CheckItem label="Volante sem vibrações" active={formData.suspensao_direcao.volante} onToggle={() => handleToggle('suspensao_direcao', 'volante')} />
          </Section>

          {/* Equipamentos Obrigatórios */}
          <Section title="Equipamentos Obrigatórios">
            <CheckItem label="Triângulo de sinalização" active={formData.equipamentos.triangulo} onToggle={() => handleToggle('equipamentos', 'triangulo')} />
            <CheckItem label="Macaco" active={formData.equipamentos.macaco} onToggle={() => handleToggle('equipamentos', 'macaco')} />
            <CheckItem label="Chave de roda" active={formData.equipamentos.chave_roda} onToggle={() => handleToggle('equipamentos', 'chave_roda')} />
            <CheckItem label="Estepe" active={formData.equipamentos.estepe} onToggle={() => handleToggle('equipamentos', 'estepe')} />
          </Section>
        </>
      );
    }
  };

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
    'pneus_rodas.calibragem': 'Calibragem correta',
    'pneus_rodas.desgaste': 'Desgaste uniforme dos pneus',
    'pneus_rodas.sulcos': 'Sulcos acima do limite mínimo',
    'pneus_rodas.estepe': 'Estepe em bom estado',
    'pneus_rodas.macaco_chave': 'Macaco e chave de roda presentes',
    'iluminacao.farois': 'Faróis baixos e altos',
    'iluminacao.lanternas': 'Lanternas traseiras',
    'iluminacao.luz_freio': 'Luz de freio',
    'iluminacao.luz_re': 'Luz de ré',
    'iluminacao.pisca': 'Pisca / setas',
    'iluminacao.luz_placa': 'Luz de placa',
    'iluminacao.farol_neblina': 'Farol de neblina (se houver)',
    'interior.cintos': 'Funcionamento dos cintos de segurança',
    'interior.bancos': 'Bancos firmes e regulagem funcionando',
    'interior.painel': 'Painel sem alertas acesos',
    'interior.ar_condicionado': 'Ar-condicionado / ventilação',
    'interior.vidros_eletricos': 'Vidros elétricos',
    'interior.travamento': 'Travamento das portas',
    'interior.buzina': 'Buzina funcionando',
    'motor_fluidos.oleo': 'Nível do óleo do motor',
    'motor_fluidos.arrefecimento': 'Nível do líquido de arrefecimento',
    'motor_fluidos.freio': 'Fluído de freio',
    'motor_fluidos.limpador': 'Fluído do limpador de para-brisa',
    'motor_fluidos.vazamentos': 'Vazamentos aparentes no motor',
    'freios.pedal': 'Pedal de freio firme',
    'freios.freio_mao': 'Freio de mão funcionando',
    'freios.ruidos': 'Ausência de ruídos ao frear',
    'suspensao_direcao.ruidos': 'Sem ruídos ao passar em irregularidades',
    'suspensao_direcao.direcao': 'Direção alinhada',
    'suspensao_direcao.volante': 'Volante sem vibrações',
    'equipamentos.triangulo': 'Triângulo de sinalização',
    'equipamentos.macaco': 'Macaco',
    'equipamentos.chave_roda': 'Chave de roda',
    'equipamentos.estepe': 'Estepe'
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

  const getSections = () => {
    if (data.vehicleType === 'carro_pequeno') {
      return [
        { key: 'documentacao', label: 'Documentação' },
        { key: 'parte_externa', label: 'Parte Externa' },
        { key: 'pneus_rodas', label: 'Pneus e Rodas' },
        { key: 'iluminacao', label: 'Iluminação' },
        { key: 'interior', label: 'Interior' },
        { key: 'motor_fluidos', label: 'Motor e Fluídos' },
        { key: 'freios', label: 'Freios' },
        { key: 'suspensao_direcao', label: 'Suspensão e Direção' },
        { key: 'equipamentos', label: 'Equipamentos' }
      ];
    } else {
      return [
        { key: 'veiculo', label: 'Veículo' },
        { key: 'imobilizacao', label: 'Imobilização' },
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
