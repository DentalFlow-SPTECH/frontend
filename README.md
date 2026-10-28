# Dental Flow — frontend da clínica

React + Vite + JavaScript/JSX, CSS Modules, axios e MVVM, integrado à API do Dental Flow. A identidade visual é a **direção A · Conversa**, aprovada em 28/10/2026, com a agenda em grade semanal pedida pelo grupo. O estudo, as propostas e a decisão estão em [`../documentos/1_SPC/c_design/dental_flow_ap_clinic_SPC_frontend_identity_study.md`](../documentos/1_SPC/c_design/dental_flow_ap_clinic_SPC_frontend_identity_study.md).

## Telas

| Área | Perfis | O que faz |
| --- | --- | --- |
| Entrar | — | Login por `GET /auth/me` (HTTP Basic). Sem recuperação de senha na API: a tela orienta falar com o responsável. |
| Hoje | Todos | Consultas do dia em lista (estilo conversas), próximo paciente, quem não confirmou e o detalhe com WhatsApp, ligar e próximos passos. |
| Agenda | Todos | Semana em grade (horas no eixo vertical, dias no horizontal, cartões pela duração do procedimento), dia por dentista, 3 dias no celular e mês. Mudança de situação com "Desfazer"; cancelar e faltou pedem confirmação. Agendar/remarcar com horários livres e aviso de conflito. |
| Pacientes | Todos | Busca por nome, CPF ou telefone (sem acento), ficha e cadastro/edição com máscaras. |
| Clínica | Todos (escrita: Dentista) | Dados da clínica, dentistas, procedimentos (preço e duração) e criação de acesso (`POST /user`). |
| Painel | Dentista | Indicadores do mês, alertas, entradas e saídas por dia, funil de consultas, por dentista e produção. |
| Mapa do dia | Dentista | Lançamento com as consultas do dia sugeridas, vales, despesas, descontos e produção; fechamento após conferência. |
| Estoque | Dentista | Materiais com entrada, saída e ajuste (sem saldo negativo) e equipamentos com custo por uso. |

Orçamentos, Caixa, Relatórios e auditoria da demonstração anterior saíram do menu e do código porque ainda não têm API (o guia proíbe simular dados salvos). O código continua no histórico do Git.

## Arquitetura

- `src/data/api/http_client.js`: axios com Basic Auth em todas as chamadas, `X-Requested-With` (evita a janela de login do navegador no 401), desembrulha `data` e normaliza erros em `{ code, status, message }`.
- `src/data/api/api.js`: rotas do guia. `src/data/session.js`: sessão **somente em memória** (atualizar a página pede login). `src/data/lookups.js`: cache de dentistas, procedimentos e pacientes por clínica, porque a consulta retorna só IDs.
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

Banco vazio: a API ainda não tem fluxo para o primeiro usuário `DENTISTA`. Depois de criá-lo direto no banco, `node test/seed/seed_api.mjs [baseUrl] [login] [senha]` cadastra pela própria API dentistas, procedimentos, pacientes, consultas da semana, um acesso de recepção, estoque e um mapa do dia fictícios.

## Verificação

```powershell
npm run check          # lint, testes unitários e build
npm run build:pages
npm run test:e2e       # desktop 1440 px e celular 375 px, com API simulada
$env:E2E_REAL_API = '1'; npx playwright test real_api.spec.js --project=desktop   # contra a API local
```

Os testes E2E usam uma API falsa no navegador (`test/e2e/fake_api.js`) que segue o contrato do guia, com relógio fixo em 28/10/2026 09:40. `real_api.spec.js` só roda com `E2E_REAL_API=1` e cria registros novos a cada execução.

**Resultado em 28/10/2026:** lint sem erros; 22 testes unitários; `npm run build` e `npm run build:pages` aprovados; `npm run test:e2e` com 34 aprovados e 8 ignorados por projeto/ambiente (cenários exclusivos de desktop ou celular e os testes de API real); `real_api.spec.js` com 2 aprovados contra a API local (MySQL 8.4 em Docker). Inclui axe nas telas principais, ausência de rolagem horizontal e reflow em 320 px. O pacote JavaScript tem 639 kB (o aviso do Vite acima de 500 kB continua). É evidência local com Edge/Playwright: não equivale a publicação nem a teste com pessoas, leitor de tela ou dispositivo físico.

## Limites conhecidos

- A API não tem paginação, listagem/edição de usuários, recuperação de senha nem bloqueio de horário sobreposto (o frontend só avisa).
- A agenda consulta um dia por chamada: a semana faz 7 chamadas e o mês até 31.
- O botão WhatsApp abre `wa.me` com o telefone do paciente e um texto pronto; não envia nada automaticamente.
- O workflow do GitHub Pages publica somente o frontend; sem `VITE_API_URL` apontando para uma API acessível, a versão publicada não funciona.
