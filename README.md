# Dental Flow — frontend da clínica

Aplicação React + Vite + TypeScript para apresentar os fluxos de **orçamentos e estoque** de uma clínica odontológica. Este recorte é uma demonstração: pacientes, doutores, procedimentos, materiais, valores e históricos são fictícios. Não há backend, endpoints, autenticação real ou envio de dados a um servidor.

## Executar localmente

Use Node.js 22.12 ou superior (Node 24 recomendado) e npm.

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5178/`. A aplicação entra em Orçamentos. As rotas usam hash, como `#/estoque`, para funcionar com recarregamento e acesso direto em hospedagem estática.

```powershell
npm run typecheck
npm run build
npm run preview
```

O build fica em `dist/`. A prévia local abre em `http://127.0.0.1:4178/`.

## Escopo implementado

| Área | Operações disponíveis |
| --- | --- |
| Orçamentos | Buscar/selecionar paciente; consultar orçamentos e histórico; criar e editar registros locais; adicionar, alterar e remover itens; calcular os valores ilustrativos; guardar observações e condições em texto livre. |
| Estoque | Buscar por nome/código/categoria; filtrar abaixo do mínimo; consultar produto e histórico; cadastrar material fictício; registrar entrada e saída com motivo; conferir saldo atualizado. |
| Pacientes | Consultar cadastros fictícios por nome/código/telefone e abrir os orçamentos do paciente. Não inclui edição cadastral ou prontuário. |
| Revisão da interface | Guardar dados no navegador; restaurar o cenário inicial mediante confirmação; experimentar carregamento lento e falhas de leitura/gravação fora da navegação da clínica. |

Os orçamentos pré-carregados são somente para consulta. Seus status são exemplos e não têm transições disponíveis. Registros criados pelo visitante podem ser editados e não recebem um status comercial inventado: a lista mostra um travessão com nome acessível “Situação não definida”. A marca `local` e o valor interno `Registro local` identificam esses registros no modelo da demonstração, sem aparecer como avisos na rotina.

As entradas de estoque somam a quantidade ao saldo local; as saídas subtraem e exigem um motivo. Ambas registram uma movimentação com data e responsável. Ajustes pré-carregados servem apenas para consulta. Nenhuma movimentação recalcula o custo, administra saldo por lote ou gera pagamento, dívida ou lançamento financeiro.

**Decisão confirmada pelo usuário nesta continuação:** a clínica não permite saldo negativo. A saída valida a quantidade no formulário e verifica novamente o saldo atual antes de persistir. Material sem saldo orienta o registro de entrada. Retirar exatamente o saldo disponível resulta em zero.

### Convenções aprovadas somente para este protótipo

- Quantidades inteiras positivas nos itens de orçamento e nas entradas/saídas; saldo inicial e mínimo de produto podem ser zero.
- Valores ilustrativos em reais, com até duas casas decimais; cálculo de quantidade × valor unitário e soma dos itens, sem desconto.
- Nome e unidade identificam o material do exemplo. Paciente, doutor, data e ao menos um item permitem demonstrar a criação de orçamento. A obrigatoriedade final dos campos depende da clínica.
- Categoria, fornecedor, lote e condições são textos de referência; não constituem catálogos definitivos. Validade informada não gera expiração automática.

Essas convenções não definem moeda, precisão, arredondamento, limites comerciais ou custeio para o produto integrado. A proibição de saldo negativo está confirmada; as demais políticas de estoque continuam pendentes.

## Interface para a rotina da clínica

A interface prioriza pessoas com pouca familiaridade com sistemas: ações com nomes diretos, textos secundários escuros, rótulos de campo com 16 px, textos auxiliares de pelo menos 14 px, foco visível e controles com pelo menos 44 px. O texto secundário usa `#35484E`, com contraste de pelo menos 7:1 nas superfícies branca e de trabalho; os testes verificam esse par além da análise com axe.

Os avisos de demonstração, cabeçalho redundante de desktop, rodapé repetitivo, notas técnicas e blocos sobre funcionalidades futuras foram removidos das telas de uso a pedido do usuário. Limitações e proveniência ficam neste README e na revisão técnica. Isso não altera a natureza fictícia dos dados ou a ausência de backend.

No celular, a lista de pacientes de Orçamentos vira um seletor compacto para alcançar os registros sem percorrer todos os pacientes. Nos formulários de estoque, campos complementares ficam em “Informações adicionais (opcional)”. Se um desses campos tiver erro, a seção abre e o foco vai para a correção.

## Dados locais e cenários

O cenário inicial tem quatro pacientes, dois doutores, quatro procedimentos, três orçamentos, cinco materiais e oito movimentações. Os cadastros foram criados para esta demonstração; nenhum dado veio de pacientes reais.

Os registros salvos ficam na chave `dental_flow_demo_v1` do armazenamento local do navegador. Cada navegador/origem tem seus próprios dados. Não há compartilhamento entre visitantes, sincronização entre abas ou auditoria de servidor. O cenário escolhido nas opções é temporário e volta ao funcionamento normal após recarregar.

Os controles de teste estão em `#/revisao`, sem link na navegação principal. Para conferir uma falha enquanto um formulário está preenchido, use **Ctrl + Alt + R**: o painel de revisão abre sem sair da página nem perder os campos. Ele permite escolher:

- **Funcionamento normal:** permite consultar e salvar.
- **Carregamento lento:** permite conferir o indicador de carregamento e a prevenção de envio repetido.
- **Falha ao carregar:** apresenta erro de leitura e ação para tentar novamente.
- **Falha ao salvar:** mantém os dados preenchidos e mostra erro; volte ao funcionamento normal para repetir o envio.

**Restaurar dados de teste** substitui somente os registros fictícios deste aplicativo pelos dados iniciais. A confirmação informa o descarte de registros e formulários não salvos. O aviso ao sair de um formulário permite permanecer e conservar o preenchimento. Escape fecha o painel e devolve o foco ao controle anterior.

Durante uma gravação, a navegação de saída, a troca de cenário e a restauração aguardam a conclusão. As operações locais são executadas uma de cada vez para evitar que uma gravação pendente reponha dados depois de uma restauração.

Ao carregar snapshots da primeira entrega, apenas os textos fixos dos exemplos iniciais são atualizados para remover notas antigas de demonstração. Os saldos e os registros criados pelo visitante são preservados. Não há migração para banco de dados ou integração externa.

## Validação no navegador

Os testes em `test/e2e/demo.spec.ts` exercitam seleção de paciente, criação/edição e persistência de orçamento, validações/foco, remoção de item, preservação após falha, guarda de saída, filtros de estoque, entrada/histórico/saldo, saída com motivo, bloqueio de saldo negativo, retirada total, material sem saldo, cadastro, campos complementares com erro, restauração, recuperação de dados locais ilegíveis, navegação móvel e recarregamento de rotas.

Também verificam ausência de overflow nas telas principais, erros de JavaScript e regras automatizadas de acessibilidade WCAG A/AA com axe. Os projetos usam desktop de 1440 px e celular de **375 px**. A conferência automática é complementada por inspeção visual; não representa certificação de acessibilidade.

A suíte desta continuação passou com 46 testes: 23 em desktop e 23 em 375 px, executados na versão compilada para Pages. A varredura cobre nove telas da clínica em cada largura, incluindo ausência de avisos de demonstração, overflow horizontal e erros de JavaScript. A página de revisão também tem verificação automatizada de acessibilidade. Após a correção final dos avisos ao remover um item de orçamento, o fluxo afetado foi repetido nas duas larguras e passou novamente; `npm run build:pages` também passou na versão final.

```powershell
npm run test:e2e
```

A configuração utiliza Microsoft Edge instalado, via Playwright. Em uma máquina sem esse navegador, instale o navegador de teste com `npx playwright install msedge` antes de executar. `test-results/` e `playwright-report/` são evidências locais ignoradas pelo Git.

Para conferir a versão de Pages já construída:

```powershell
npm run build:pages
npm run preview:pages
$env:TEST_BASE_URL = 'http://127.0.0.1:4178/frontend/'
npm run test:e2e
Remove-Item Env:TEST_BASE_URL
```

Mantenha a prévia aberta em um terminal e execute os testes em outro. `preview:pages` serve o build no mesmo caminho `/frontend/` previsto para a hospedagem.

## GitHub Pages preparado para publicação posterior

O remote atual é `DentalFlow-SPTECH/frontend`. `npm run build:pages` configura o caminho `/frontend/`, conforme o nome desse repositório. As fontes e a marca são incluídas no build; não dependem de serviços externos no navegador.

O arquivo `.github/workflows/pages.yml` prepara build e publicação pelo GitHub Actions. O gatilho é **somente manual (`workflow_dispatch`)**. Fazer push não dispara publicação automaticamente.

Quando a publicação for autorizada:

1. Versionar e enviar os arquivos ao repositório com autorização específica.
2. Nas configurações do repositório, selecionar **Pages → Build and deployment → Source → GitHub Actions**.
3. Em **Actions**, executar o workflow **Publicar demonstração no GitHub Pages**.
4. Conferir a URL retornada pelo job e executar os fluxos de apresentação no site publicado.

O endereço esperado para esse repositório é `https://dentalflow-sptech.github.io/frontend/`, sujeito à configuração e ao sucesso da publicação. Configuração local e build aprovado não comprovam publicação. Se o repositório ou domínio mudar, atualize o `--base` de `build:pages`.

Referências: [Vite: hospedagem estática e GitHub Pages](https://vite.dev/guide/static-deploy.html), [GitHub: workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Estrutura e estilos

- `src/app`: rotas com hash, navegação e estrutura da aplicação.
- `src/feature/budget`: lista e editor de orçamentos.
- `src/feature/inventory`: lista, detalhe, cadastro, entrada e saída de estoque.
- `src/feature/patient`: consulta de pacientes de referência.
- `src/feature/review`: controles de teste, fora da navegação da clínica.
- `src/component`: controles, feedback, carregamento e comportamento de formulários.
- `src/demo`: modelos de apresentação, cenário inicial e armazenamento local. Não são contratos de API.
- `src/asset/brand`: logotipo original, incorporado sem redesenho.
- `src/style`: fontes locais IBM Plex Sans, normalização e tokens compartilhados.

Componentes e páginas usam CSS Modules. Não há Tailwind, Bootstrap ou biblioteca visual. O foco, as ações, as tabelas/listas e os formulários são próprios da aplicação. IBM Plex Sans é distribuída pelo pacote `@fontsource/ibm-plex-sans` sob a licença SIL Open Font License.

## Decisões necessárias antes da integração

Ainda precisam ser definidas:

- Matriz de perfis/permissões, operador de estoque, autenticação, recuperação de acesso e destino após login.
- Catálogos e transições de consulta/orçamento, aprovação parcial, edição após aprovação, validade e expiração.
- Moeda, descontos por item/global, cumulatividade, limites e arredondamento.
- Modelo de odontograma: dentição, identificação e superfícies.
- Campos obrigatórios, regras de CPF/CRO e validação dos cadastros.
- Unidade/precisão, lotes, validade, ajustes e método de custeio do estoque. Saldo negativo foi rejeitado pelo usuário e está bloqueado.
- Gatilhos e relações entre orçamento, tratamento, consulta, cobrança, pagamento e compra; prevenção de duplicidade.
- Anexos, limites, retenção, dados da clínica e formato de impressão/exportação.
- Contratos reais de integração e tratamento de concorrência/erros do backend.

Agenda, cadastro completo de Pacientes/Doutores, Financeiro, Administração e Acesso real não estão implementados neste recorte. A demonstração entra por Orçamentos; o destino Agenda descrito pela especificação continua pendente para a aplicação integrada.

## Fontes e autoridade

O planejamento aprovado parte dos artefatos do repositório independente `documentos`: `1_SPC/c_design/dental_flow_ap_clinic_SPC_design.md` e `0_Context/b_brief/dental_flow_ap_clinic_SPC_frontend_brief.xlsx`.

A planilha atual tem registros consolidados e derivados; trechos do Markdown ainda descrevem o modelo anterior vazio. Essa divergência não foi corrigida neste recorte. Exemplos de status, perfis, horários e pagamento não foram promovidos a regras aprovadas. Os requisitos registrados na documentação não equivalem a cobertura integral por esta demonstração.
