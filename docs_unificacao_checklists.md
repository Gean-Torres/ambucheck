# Unificação do checklist de Ambulância e Carro Pequeno

## Objetivo
Reduzir duplicidade entre os dois fluxos sem perder o que é específico e crítico de cada tipo de veículo.

## Itens que podem virar um **núcleo comum**

### 1) Segurança e rodagem
- Pneus calibrados / estado dos pneus
- Estepe em condições
- Macaco + chave de roda
- Freios (funcionamento básico)
- Direção (sem folgas/ruídos)

### 2) Iluminação e sinalização
- Faróis (alta/baixa)
- Lanternas e luz de freio
- Setas/pisca
- Luz de ré

### 3) Fluidos e motor
- Óleo do motor
- Arrefecimento (água/radiador)
- Limpador/água do para-brisa
- Checagem de vazamentos

### 4) Cabine e conforto operacional
- Ar-condicionado
- Cintos de segurança
- Painel sem alertas críticos
- Buzina

### 5) Documentação e obrigatórios
- Documentação do veículo regular
- Triângulo
- Estepe, macaco e chave de roda (quando não cobertos no bloco de rodagem)

## Itens que devem permanecer **exclusivos** da ambulância
- Giroflex
- Sirene
- Maca e travas da maca
- Kit de imobilização (prancha, colares, talas etc.)
- Oxigenação e ventilação (cilindros, ambu, aspirador etc.)
- Biossegurança (lixo infectante, perfurocortante, desinfecção)

## Proposta de estrutura unificada no formulário

1. **Checklist Base (todos os veículos)**
   - Segurança e rodagem
   - Iluminação e sinalização
   - Fluidos e motor
   - Cabine e itens obrigatórios
2. **Módulo Específico por Tipo**
   - Ambulância: atendimento pré-hospitalar + biossegurança
   - Carro pequeno: acabamento/itens não críticos de socorro

## Ganhos práticos
- Menos manutenção no código (um único bloco base de itens compartilhados).
- Menos tempo de preenchimento para o motorista (ordem padrão para todos).
- Menor risco de inconsistência entre checklists semelhantes.
- Preserva conformidade operacional da ambulância nos itens clínicos e de emergência.

## Sugestão de implementação no código (incremental)
1. Criar um objeto `baseChecklistSections` reutilizável para os dois tipos.
2. Manter `ambulanciaSections` e `carroPequenoSections` só com diferenças reais.
3. Renderizar com `common + specific` ao invés de dois fluxos totalmente separados.
4. Revisar labels para nomenclatura única (ex.: `arCondicionado` vs `ar_condicionado`).
5. Consolidar exportação para colunas padrão + colunas específicas.
