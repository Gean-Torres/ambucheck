# AmbuCheck

Aplicação React + Firebase para checklist diário de ambulâncias, com autenticação Google, histórico online e exportação CSV.

## Stack
- React 18 + Vite
- Firebase Auth (Google)
- Cloud Firestore
- Tailwind CSS

## Estrutura atual (resumo)

```txt
src/
  App.jsx
  components/
    modals/
      BaseModal.jsx
      ExportHistoryModal.jsx
firebase.js
```

### Organização de modais
Para facilitar manutenção e evolução, os modais foram separados em componentes dedicados:
- `BaseModal.jsx`: estrutura visual e layout comum (backdrop, container e ações).
- `ExportHistoryModal.jsx`: comportamento específico de exportação por intervalo de datas.

## Como executar

1. Instale dependências:
```bash
npm install
```

2. Rode o ambiente de desenvolvimento:
```bash
npm run dev
```

3. Gere build de produção:
```bash
npm run build
```

4. (Opcional) Visualize a build localmente:
```bash
npm run preview
```

## Configuração Firebase
As credenciais estão em `firebase.js`. Para produção, prefira variáveis de ambiente (`import.meta.env`) e nunca versione segredos reais.

## Deploy (Firebase Hosting)
```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting
```

## Notas de manutenção
- Componentes de interface reutilizáveis devem ficar em `src/components`.
- Novos modais devem reutilizar `BaseModal` para manter consistência visual.
- Regras de exportação e transformação de dados devem permanecer no `App.jsx` ou ser extraídas para utilitários caso cresçam.
