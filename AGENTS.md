# Dental Flow — frontend

React + Vite + JavaScript/JSX, CSS Modules, axios e MVVM, integrado à API do Dental Flow (guia de integração da equipe de backend). Consulte o README antes de mudar comportamento.

- Documentos ficam no repositório irmão `../documentos`. Quando precisar se localizar, abra `../documentos/_brain/dental_flow_ap_clinic_SPC_index.md` e somente as fontes pertinentes. A identidade visual aprovada (direção A · Conversa, agenda em grade semanal) está em `../documentos/1_SPC/c_design/dental_flow_ap_clinic_SPC_frontend_identity_study.md`.
- Camadas: Views em JSX; ViewModels como hooks de estado/comandos; Models puros (sem React/DOM/API); Repositories sobre `src/data/api`. Não acrescente regras à View nem copie regras em vários módulos.
- Interface: use `src/component/ui/` e os tokens de `src/style/tokens.css` (nomes semânticos do shadcn). Não traga Tailwind nem o visual padrão do shadcn. Situações sempre com ícone e texto, não só cor.
- API: somente rotas existentes no guia; o `clinicId` vem de `/auth/me`. Não simule como salvas funcionalidades sem rota. Sessão em `sessionStorage` com fim por inatividade (30 min), provisória até a API emitir JWT; nunca em `localStorage`.
- Verifique com `npm run check`, `npm run build:pages` e `npm run test:e2e`. Para a API real, `E2E_REAL_API=1` com o backend local.
- Atualize README, documento afetado e ficha correspondente no brain com a evidência real.
- Preserve alterações concorrentes. Commit, push e publicação dependem de autorização explícita.
