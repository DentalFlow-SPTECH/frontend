# Dental Flow — frontend da clínica

React + Vite + JavaScript/JSX, CSS Modules, axios e MVVM, integrado à API do Dental Flow. A identidade visual é a **direção A · Conversa**, aprovada em 28/10/2026, com a agenda em grade semanal pedida pelo grupo. O estudo, as propostas e a decisão estão em [`../documentos/1_SPC/c_design/dental_flow_ap_clinic_SPC_frontend_identity_study.md`](../documentos/1_SPC/c_design/dental_flow_ap_clinic_SPC_frontend_identity_study.md).

## Telas

| Área | Perfis | O que faz |
| --- | --- | --- |
| Entrar | — | Login por `GET /auth/me` (HTTP Basic). Sem recuperação de senha na API: a tela orienta falar com o responsável. |
| Hoje | Todos | Consultas do dia em lista (estilo conversas), próximo paciente, quem não confirmou e o detalhe com WhatsApp, ligar e próximos passos. |
| Agenda | Todos | Semana em grade (horas no eixo vertical, dias no horizontal, cartões pela duração do procedimento), dia por dentista, 3 dias no celular e mês. Mudança de situação com "Desfazer"; cancelar e faltou pedem confirmação. Agendar/remarcar com horários livres e aviso de conflito. |
| Pacientes | Todos | Busca por nome, CPF ou telefone (sem acento), lista com colunas rotuladas (Paciente, Celular, CPF) e 20 por página, ficha e cadastro/edição com máscaras. O CEP preenche rua e bairro pelo ViaCEP. |
| Clínica | Todos (escrita: Dentista) | Dados da clínica (endereço também pelo CEP), dentistas e procedimentos com colunas rotuladas e paginação, e criação de acesso (`POST /user`). |
| Painel | Dentista | Indicadores do mês, alertas, entradas e saídas por dia (duas barras por dia, eixo em R$ e balão com o saldo), funil de consultas, por dentista e produção. |
| Mapa do dia | Dentista | Lançamento com as consultas do dia sugeridas, vales, despesas, descontos e produção; fechamento após conferência. |
| Estoque | Dentista | Materiais com entrada, saída e ajuste (sem saldo negativo) e equipamentos com custo por uso, em listas paginadas. |

### Padrões de tela (revisão de 28/10/2026)

- **Coluna centralizada:** formulários usam `FormPage` (820 px) ou `Page width="wide"` (1180 px, Agendar consulta e Mapa do dia). Cabeçalho e formulário ficam na mesma coluna, no centro da página.
- **Listas:** linhas em grade levam `ListHeader` com o nome de cada coluna (só visual; as células têm o rótulo em texto oculto para leitores de tela). Listas que crescem usam `Paginated` + `usePagination`, com a página em `?pagina=` para voltar da ficha no mesmo lugar.
- **Escolha em cadastro:** `Select` nativo só para listas fixas e curtas (unidade, pagamento, tipo). Procedimentos e dentistas usam `Combobox` (digitar parte do nome, setas + Enter); na agenda, os dentistas aparecem em chips até 6 e viram busca acima disso.
- **Endereço:** `AddressFields` pede o CEP primeiro e separa rua, número e complemento; `src/component/address.js` junta tudo no campo único `address` da API e separa de volta na edição (texto fora do padrão fica inteiro na rua).

Orçamentos, Caixa, Relatórios e auditoria da demonstração anterior saíram do menu e do código porque ainda não têm API (o guia proíbe simular dados salvos). O código continua no histórico do Git.

## Arquitetura

- `src/data/api/http_client.js`: axios com Basic Auth em todas as chamadas, `X-Requested-With` (evita a janela de login do navegador no 401), desembrulha `data` e normaliza erros em `{ code, status, message }`.
- `src/data/api/cep_api.js`: busca de endereço no ViaCEP com `fetch` próprio (`credentials: 'omit'`), separado do cliente da API para nunca enviar o Basic Auth a terceiros. Só os 8 números do CEP saem do sistema; CEP inexistente ou falha deixam os campos para preencher à mão.
- `src/data/api/api.js`: rotas do guia. `src/data/session.js`: sessão em **sessionStorage** (decisão de 28/10/2026, provisória até a API emitir JWT): o F5 não desconecta, fechar a aba sim, e 30 minutos sem uso encerram a sessão. `src/data/lookups.js`: cache de dentistas, procedimentos e pacientes por clínica, porque a consulta retorna só IDs.
- `src/feature/<módulo>/{model,repository,view_model,view}`: Models puros, Repositories sobre a API, ViewModels como hooks e Views em JSX. O ESLint verifica essas fronteiras.
- `src/component/ui/`: componentes no padrão do shadcn/ui (código no projeto, `variant`/`size`, primitivos Radix), estilizados com CSS Modules e tokens da direção A em `src/style/tokens.css`. Ícones: `lucide-react`. Fonte: Figtree via `@fontsource`.
- O `clinicId` vem sempre de `/auth/me`. Menus escondem o que a persona não acessa e as telas também tratam 401 (volta para Entrar) e 403 (tela de sem acesso).

## Executar localmente

Node.js 22.12 ou superior e a API do backend em `http://localhost:8080/dentalflow-api/v1`.

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5178/`. O Vite repassa `/dentalflow-api` para `http://localhost:8080` (o backend não tem CORS); use `DENTAL_FLOW_API` para outro endereço. Em produção, sirva frontend e API na mesma origem ou defina `VITE_API_URL` com uma API que libere a origem, sempre em HTTPS.

Banco vazio: a API ainda não tem fluxo para o primeiro usuário `DENTISTA`. Depois de criá-lo direto no banco, `node test/seed/seed_api.mjs [baseUrl] [login] [senha]` cadastra pela própria API dentistas, procedimentos, pacientes, consultas da semana, um acesso de recepção, estoque e um mapa do dia fictícios. Em seguida, `node test/seed/seed_history.mjs` acrescenta um histórico pequeno (semana anterior atendida, próxima semana agendada, mapas do dia do mês e movimentações de estoque); ele pula o que já existe. O frontend não tem dados fixos: tudo vem da API.

## Verificação

```powershell
npm run check          # lint, testes unitários e build
npm run build:pages
npm run test:e2e       # desktop 1440 px e celular 375 px, com API simulada
$env:E2E_REAL_API = '1'; npx playwright test real_api.spec.js --project=desktop   # contra a API local
```

Os testes E2E usam uma API falsa no navegador (`test/e2e/fake_api.js`) que segue o contrato do guia, com relógio fixo em 28/10/2026 09:40. `real_api.spec.js` só roda com `E2E_REAL_API=1` e cria registros novos a cada execução.

**Resultado da refatoração de usabilidade (28/10/2026, noite):** lint sem erros; 32 testes unitários; `npm run build` e `npm run build:pages` aprovados (pacote JavaScript de 658 kB, o aviso do Vite continua); `npm run test:e2e` com 60 aprovados, 12 ignorados por projeto/ambiente e nenhuma falha no servidor de desenvolvimento. Inclui o axe nas telas principais e `test/e2e/layout.spec.js`: centralização medida em 9 formulários, paginação com volta da ficha, CEP com ViaCEP simulado, combobox pelo teclado e balão do gráfico. `real_api.spec.js` com 2 aprovados contra a API local (desktop). Conferência visual com capturas contra a API local (dados do seed) e uma consulta real ao ViaCEP (01001-000). Os E2E na prévia do build Pages não foram rodados nesta revisão.

**Resultado anterior (28/10/2026):** lint sem erros; 26 testes unitários; `npm run build` e `npm run build:pages` aprovados; `npm run test:e2e` com 51 aprovados e 11 ignorados por projeto/ambiente (cenários exclusivos de desktop ou celular e os testes de API real), no servidor de desenvolvimento e na prévia do build para Pages (`TEST_BASE_URL=http://127.0.0.1:4178/frontend/`); `real_api.spec.js` com 2 aprovados contra a API local (MySQL 8.4 em Docker). Inclui axe nas telas principais, ausência de rolagem horizontal e reflow em 320 px. O pacote JavaScript tem 639 kB (o aviso do Vite acima de 500 kB continua). É evidência local com Edge/Playwright: não equivale a publicação nem a teste com pessoas, leitor de tela ou dispositivo físico.

## Marca

O sistema usa o símbolo verde do dente, sem quadrado, na barra de cima e na tela Entrar (`src/asset/brand/dental_flow_symbol.png`). O favicon e o ícone de atalho são o dente branco sobre verde (`public/favicon-32.png`, `apple-touch-icon.png` e `favicon-512.png`).

- `python -I scripts/brand/make_marks.py` extrai o dente do logotipo original (`src/asset/brand/dental_flow_logo.png`) com transparência. Gera as versões recoloridas, o símbolo e os favicons.
- `node scripts/brand/export_variants.mjs` monta, a partir de `scripts/brand/variants.html`, as demais versões em PNG transparente (ícones, logotipo horizontal e empilhado) e a prancha `scripts/brand/out/export/prancha_logotipo.png`.

## Limites conhecidos

- A API não tem paginação, listagem/edição de usuários, recuperação de senha nem bloqueio de horário sobreposto (o frontend só avisa). A paginação das listas é feita na tela, sobre a lista completa que a API devolve.
- A busca de CEP depende do ViaCEP (serviço público externo). Fora do ar ou sem internet, o formulário avisa e o endereço é digitado à mão.
- O endereço da clínica é um texto só na API; o formulário o separa por vírgulas ("Rua, número - complemento, bairro, Cidade/UF, CEP"). Endereços antigos em outro formato aparecem inteiros no campo Rua.
- A agenda consulta um dia por chamada: a semana faz 7 chamadas e o mês até 31.
- O botão WhatsApp abre `wa.me` com o telefone do paciente e um texto pronto; não envia nada automaticamente.
- O workflow do GitHub Pages publica somente o frontend; sem `VITE_API_URL` apontando para uma API acessível, a versão publicada não funciona.
