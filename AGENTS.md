# Dental Flow — frontend

React + Vite + JavaScript/JSX e CSS Modules, com MVVM nos módulos existentes. Consulte o plano e a evidência atual antes de presumir integração com backend ou publicação.

- Documentos ficam no repositório irmão `../documentos`. Quando precisar se localizar, abra `../documentos/_brain/dental_flow_ap_clinic_SPC_index.md` e somente as fontes pertinentes. Se o checkout documental estiver ausente, informe essa limitação e confirme o estado no código.
- Camadas: Views em JSX; ViewModels como hooks de estado/comandos; Models sem React/DOM/persistência; Repository sobre a sessão de dados. Não acrescente regras à View nem copie regras em vários módulos.
- Preserve visual, hash routes, filtros, `dental_flow_demo_v1`, versão 1, IDs, relações e registros locais. Estoque verifica saldo novamente antes de gravar. Login/Cadastro são demonstrações; não persistir senhas ou promover permissões locais a autorização real.
- Verifique a mudança com `npm run lint`, `npm run test:unit`, builds e as regressões pertinentes. Integração final: `npm run build:pages` e `npm run test:e2e` também na prévia `/frontend/`.
- Os resultados históricos de typecheck pertencem ao código TypeScript anterior; o script atual foi removido. Lint não equivale à checagem de tipos.
- Atualize README, documento afetado e ficha correspondente no brain com a evidência real.
- Preserve alterações concorrentes. Commit, push e publicação dependem de autorização explícita.
