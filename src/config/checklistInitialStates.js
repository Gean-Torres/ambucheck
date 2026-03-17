export const initialFormStates = {
  ambulancia: {
    documentacao: {
      crlv: false, licenciamento: false, seguro: false, manual: false,
    },
    veiculo_comum: {
      combustivel: false, oleo: false, agua: false, pneus: false, estepe: false,
      macaco: false, luzes: false, limpador: false, arCondicionado: false,
    },
    iluminacao_carro: {
      lanternas: false, luz_freio: false, luz_re: false, setas: false,
      luz_placa: false, farol_neblina: false,
    },
    parte_externa: {
      pintura: false, riscos: false, alinhamento: false, vidros: false, retrovisores: false,
    },
    pneus_rodas: {
      desgaste: false, sulcos: false,
    },
    interior: {
      cintos: false, bancos: false, painel: false, vidros_eletricos: false,
      travamento: false, buzina: false,
    },
    motor_fluidos: {
      arrefecimento: false, freio: false, vazamentos: false,
    },
    freios: {
      pedal: false, freio_mao: false, ruidos: false,
    },
    suspensao_direcao: {
      ruidos: false, direcao: false, volante: false,
    },
    equipamentos: {
      triangulo: false,
    },
    veiculo_ambulancia: {
      setas: false, giroflex: false, sirene: false, maca: false, travasMaca: false,
    },
    imobilizacao: {
      prancha: false, cintoAranha: false, headBlock: false, colares: false,
      talas: false, bandagens: false, cobertor: false, cadeiraRemocao: false,
    },
    oxigenacao: {
      cilindroCheio: false, cilindroReserva: false, fluxometro: false, umidificador: false,
      mascaraAdulto: false, mascaraPed: false, mascaraReservatorio: false,
      ambuAdulto: false, ambuPed: false, aspirador: false, sondas: false,
    },
    biosseguranca: {
      lixoInfectante: false, lixoComum: false, desinfetante: false,
      papelToalha: false, caixaPerfuro: false,
    },
    liberada: false,
    assinatura: '',
    driverName: '',
    veiculoNome: '',
    kilometragem: '',
    local: '',
  },
  carro_pequeno: {
    documentacao: {
      crlv: false, licenciamento: false, seguro: false, manual: false,
    },
    veiculo_comum: {
      combustivel: false, oleo: false, agua: false, pneus: false, estepe: false,
      macaco: false, luzes: false, limpador: false, arCondicionado: false,
    },
    iluminacao_carro: {
      lanternas: false, luz_freio: false, luz_re: false, setas: false,
      luz_placa: false, farol_neblina: false,
    },
    parte_externa: {
      pintura: false, riscos: false, alinhamento: false, vidros: false, retrovisores: false,
    },
    pneus_rodas: {
      desgaste: false, sulcos: false,
    },
    interior: {
      cintos: false, bancos: false, painel: false, vidros_eletricos: false,
      travamento: false, buzina: false,
    },
    motor_fluidos: {
      arrefecimento: false, freio: false, vazamentos: false,
    },
    freios: {
      pedal: false, freio_mao: false, ruidos: false,
    },
    suspensao_direcao: {
      ruidos: false, direcao: false, volante: false,
    },
    equipamentos: {
      triangulo: false,
    },
    liberada: false,
    assinatura: '',
    driverName: '',
    veiculoNome: '',
    kilometragem: '',
    local: '',
  },
};
