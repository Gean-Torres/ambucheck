export const commonFormSections = [
  {
    title: 'Segurança e Rodagem',
    items: [
      { section: 'veiculo_comum', item: 'pneus', label: 'Pneus calibrados' },
      { section: 'veiculo_comum', item: 'estepe', label: 'Estepe em condições' },
      { section: 'veiculo_comum', item: 'macaco', label: 'Macaco e chave de roda' },
      { section: 'freios', item: 'pedal', label: 'Pedal de freio firme' },
      { section: 'freios', item: 'freio_mao', label: 'Freio de mão funcionando' },
      { section: 'freios', item: 'ruidos', label: 'Ausência de ruídos ao frear' },
      { section: 'suspensao_direcao', item: 'ruidos', label: 'Sem ruídos ao passar em irregularidades' },
      { section: 'suspensao_direcao', item: 'direcao', label: 'Direção alinhada' },
      { section: 'suspensao_direcao', item: 'volante', label: 'Volante sem vibrações' },
      { section: 'equipamentos', item: 'triangulo', label: 'Triângulo de sinalização' },
    ],
  },
  {
    title: 'Iluminação e Sinalização',
    items: [
      { section: 'veiculo_comum', item: 'luzes', label: 'Luz alta e baixa' },
      { section: 'iluminacao_carro', item: 'lanternas', label: 'Lanternas traseiras' },
      { section: 'iluminacao_carro', item: 'luz_freio', label: 'Luz de freio' },
      { section: 'iluminacao_carro', item: 'luz_re', label: 'Luz de ré' },
      { section: 'iluminacao_carro', item: 'setas', label: 'Setas' },
      { section: 'iluminacao_carro', item: 'luz_placa', label: 'Luz de placa' },
      { section: 'iluminacao_carro', item: 'farol_neblina', label: 'Farol de neblina (se houver)' },
    ],
  },
  {
    title: 'Fluidos e Motor',
    items: [
      { section: 'veiculo_comum', item: 'combustivel', label: 'Combustível acima de ½ tanque' },
      { section: 'veiculo_comum', item: 'oleo', label: 'Óleo do motor' },
      { section: 'veiculo_comum', item: 'agua', label: 'Água do radiador' },
      { section: 'veiculo_comum', item: 'limpador', label: 'Limpador de para-brisa' },
      { section: 'motor_fluidos', item: 'arrefecimento', label: 'Nível do líquido de arrefecimento' },
      { section: 'motor_fluidos', item: 'freio', label: 'Fluído de freio' },
      { section: 'motor_fluidos', item: 'vazamentos', label: 'Vazamentos aparentes no motor' },
    ],
  },
  {
    title: 'Cabine e Conforto Operacional',
    items: [
      { section: 'veiculo_comum', item: 'arCondicionado', label: 'Ar-condicionado' },
      { section: 'interior', item: 'cintos', label: 'Funcionamento dos cintos de segurança' },
      { section: 'interior', item: 'bancos', label: 'Bancos firmes e regulagem funcionando' },
      { section: 'interior', item: 'painel', label: 'Painel sem alertas acesos' },
      { section: 'interior', item: 'vidros_eletricos', label: 'Vidros elétricos' },
      { section: 'interior', item: 'travamento', label: 'Travamento das portas' },
      { section: 'interior', item: 'buzina', label: 'Buzina funcionando' },
    ],
  },
  {
    title: 'Parte Externa',
    items: [
      { section: 'parte_externa', item: 'pintura', label: 'Estado geral da pintura' },
      { section: 'parte_externa', item: 'riscos', label: 'Presença de riscos, amassados ou ferrugem' },
      { section: 'parte_externa', item: 'alinhamento', label: 'Alinhamento de portas, capô e porta-malas' },
      { section: 'parte_externa', item: 'vidros', label: 'Vidros sem trincas ou rachaduras' },
      { section: 'parte_externa', item: 'retrovisores', label: 'Retrovisores firmes e íntegros' },
    ],
  },
  {
    title: 'Pneus e Rodas',
    items: [
      { section: 'pneus_rodas', item: 'desgaste', label: 'Desgaste uniforme dos pneus' },
      { section: 'pneus_rodas', item: 'sulcos', label: 'Sulcos acima do limite mínimo' },
    ],
  },
  {
    title: 'Documentação',
    items: [
      { section: 'documentacao', item: 'crlv', label: 'CRLV / documento do veículo em dia' },
      { section: 'documentacao', item: 'licenciamento', label: 'Licenciamento pago' },
      { section: 'documentacao', item: 'seguro', label: 'Seguro obrigatório / seguro do veículo (se houver)' },
      { section: 'documentacao', item: 'manual', label: 'Manual do proprietário no carro' },
    ],
  },
];

export const ambulanceExtraSections = [
  {
    title: 'Equipamentos Específicos da Ambulância',
    items: [
      { section: 'veiculo_ambulancia', item: 'setas', label: 'Setas e luz de freio' },
      { section: 'veiculo_ambulancia', item: 'giroflex', label: 'Giroflex funcionando' },
      { section: 'veiculo_ambulancia', item: 'sirene', label: 'Sirene funcionando' },
      { section: 'veiculo_ambulancia', item: 'maca', label: 'Maca principal funcionando' },
      { section: 'veiculo_ambulancia', item: 'travasMaca', label: 'Travas da maca' },
    ],
  },
  {
    title: 'Equipamentos de Imobilização',
    items: [
      { section: 'imobilizacao', item: 'prancha', label: 'Prancha longa' },
      { section: 'imobilizacao', item: 'cintoAranha', label: 'Cinto aranha' },
      { section: 'imobilizacao', item: 'headBlock', label: 'Tirante de cabeça (head block)' },
      { section: 'imobilizacao', item: 'colares', label: 'Colares cervicais (PP ao GG)' },
      { section: 'imobilizacao', item: 'talas', label: 'Talas de imobilização' },
      { section: 'imobilizacao', item: 'bandagens', label: 'Bandagens triangulares' },
      { section: 'imobilizacao', item: 'cobertor', label: 'Cobertor/manta térmica' },
      { section: 'imobilizacao', item: 'cadeiraRemocao', label: 'Cadeira de rodas/remoção' },
    ],
  },
  {
    title: 'Oxigenação e Ventilação',
    items: [
      { section: 'oxigenacao', item: 'cilindroCheio', label: 'Cilindro de oxigênio cheio' },
      { section: 'oxigenacao', item: 'cilindroReserva', label: 'Cilindro reserva' },
      { section: 'oxigenacao', item: 'fluxometro', label: 'Fluxômetro' },
      { section: 'oxigenacao', item: 'umidificador', label: 'Umidificador' },
      { section: 'oxigenacao', item: 'mascaraAdulto', label: 'Máscara O2 adulto' },
      { section: 'oxigenacao', item: 'mascaraPed', label: 'Máscara O2 pediátrica' },
      { section: 'oxigenacao', item: 'mascaraReservatorio', label: 'Máscara de reservatório' },
      { section: 'oxigenacao', item: 'ambuAdulto', label: 'Ambu adulto' },
      { section: 'oxigenacao', item: 'ambuPed', label: 'Ambu pediátrico' },
      { section: 'oxigenacao', item: 'aspirador', label: 'Aspirador portátil' },
      { section: 'oxigenacao', item: 'sondas', label: 'Sondas de aspiração' },
    ],
  },
  {
    title: 'Biossegurança',
    items: [
      { section: 'biosseguranca', item: 'lixoInfectante', label: 'Lixo infectante' },
      { section: 'biosseguranca', item: 'lixoComum', label: 'Lixo comum' },
      { section: 'biosseguranca', item: 'desinfetante', label: 'Desinfetante' },
      { section: 'biosseguranca', item: 'papelToalha', label: 'Papel toalha' },
      { section: 'biosseguranca', item: 'caixaPerfuro', label: 'Caixa coletora perfurocortante' },
    ],
  },
];
