# AmbuCheck — Firebase React App

Resumo rápido: app React que usa Firebase Auth (Google) e Firestore para salvar checklists. `main.jsx` já está pronto para uso com `firebase.js` (contém as credenciais atuais — substitua por variáveis de ambiente em produção).

Instalação (dependências já presentes em `package.json`):

1. Crie um arquivo `.env` na raiz com as variáveis do `.env.example` preenchidas (NÃO comite `.env`).

2. Instale dependências:

```bash
npm install
```

3. Instale as dependências de desenvolvimento do Vite (se ainda não instalou):

```bash
npm install -D vite @vitejs/plugin-react
```

Executar em desenvolvimento:

```bash
npm run dev
```

Configurar Firebase Hosting e deploy:

1. Instale as ferramentas do Firebase CLI (global):

```bash
npm install -g firebase-tools
```

2. Faça login no Firebase (abre o browser):

```bash
firebase login
```

3. Inicialize o hosting (já incluí `.firebaserc` e `firebase.json` neste repositório):

```bash
firebase init hosting
# Se preferir não executar interativo, os arquivos `.firebaserc` e `firebase.json` aqui já apontam para o projeto e pasta `dist`.
```

4. Build e deploy:

```bash
npm run build
firebase deploy --only hosting
```

Notas de segurança e ambiente:
- Não comite credenciais sensíveis. Substitua o objeto `firebaseConfig` em `firebase.js` por variáveis de ambiente em produção (ex.: `import.meta.env.VITE_FIREBASE_API_KEY`).
- Revise e ajuste as regras do Firestore/Storage no console do Firebase antes do deploy.

Próximos passos que posso fazer para você (posso executar se autorizar):
- Executar `npm install` e instalar o Vite.
- Rodar `npm run build` e `firebase deploy` (requer `firebase login` interactivo).
- Converter armazenamento de assinaturas para Firebase Storage e salvar URL no Firestore.

Diga qual desses passos quer que eu execute agora.
