# Dental Flow — frontend da clínica

Aplicação React + Vite + TypeScript para apresentar **painel, agenda, pacientes, doutores, orçamentos, estoque, caixa e administração** de uma clínica odontológica. Este recorte é uma demonstração: pacientes, doutores, procedimentos, materiais, valores e históricos são fictícios. Não há backend, endpoints, autenticação real ou envio de dados a um servidor.

## Executar localmente

Use Node.js 22.12 ou superior (Node 24 recomendado) e npm.

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5178/`. A aplicação entra no Painel, também disponível diretamente em `#/painel`. As rotas usam hash, como `#/estoque`, para funcionar com recarregamento e acesso direto em hospedagem estática.

```powershell
npm run typecheck
npm run build
npm run preview
```

O build fica em `dist/`. A prévia local abre em `http://127.0.0.1:4178/`.

## Escopo implementado

| Área | Operações disponíveis |
| --- | --- |
| Painel | Selecionar o dia de referência; consultar totais cadastrais, consultas do dia, materiais abaixo do mínimo e orçamentos recentes; comparar entradas e saídas dos últimos seis meses; abrir cada registro e o Caixa com o período mensal selecionado. |
| Agenda | Consultar semana ou mês e dia selecionado; navegar por período/data; filtrar doutor; agendar, editar e cancelar consultas; verificar conflitos de horário; consultar histórico e vínculos de paciente, doutor e orçamento. |
| Orçamentos | Buscar/selecionar paciente; consultar orçamentos e histórico; criar e editar registros locais; adicionar, alterar e remover itens; associar procedimentos a dentes permanentes ou infantis e região/superfície; calcular os valores ilustrativos; guardar observações e condições em texto livre. |
| Estoque | Buscar por nome/código/categoria; filtrar abaixo do mínimo; consultar produto e histórico; cadastrar material fictício; registrar entrada e saída com motivo; conferir saldo atualizado. |
| Pacientes | Buscar por nome/CPF/código/telefone/celular; consultar o cadastro e seus orçamentos; cadastrar e editar dados pessoais, contatos, endereço e informações complementares; consultar o histórico cadastral das gravações. |
| Doutores | Buscar, cadastrar, editar e consultar dados profissionais, histórico e consultas/orçamentos vinculados. |
| Caixa | Registrar entradas e saídas manuais; consultar detalhes e histórico; filtrar por período/tipo/categoria/forma; calcular entradas, saídas e saldo das movimentações exibidas. |
| Administração | Buscar, cadastrar e editar usuários; configurar permissões por módulo/operação; bloquear/reativar mediante confirmação; consultar histórico e auditoria das gravações locais. |
| Revisão da interface | Guardar dados no navegador; restaurar o cenário inicial mediante confirmação; experimentar carregamento lento e falhas de leitura/gravação fora da navegação da clínica. |

Os orçamentos pré-carregados são somente para consulta. Seus status são exemplos e não têm transições disponíveis. Registros criados pelo visitante podem ser editados e não recebem um status comercial inventado: a lista mostra um travessão com nome acessível “Situação não definida”. A marca `local` e o valor interno `Registro local` identificam esses registros no modelo da demonstração, sem aparecer como avisos na rotina.

As entradas de estoque somam a quantidade ao saldo local; as saídas subtraem e exigem um motivo. Ambas registram uma movimentação com data e responsável. Ajustes pré-carregados servem apenas para consulta. Nenhuma movimentação recalcula o custo, administra saldo por lote ou gera pagamento, dívida ou lançamento financeiro.

**Decisão confirmada pelo usuário nesta continuação:** a clínica não permite saldo negativo. A saída valida a quantidade no formulário e verifica novamente o saldo atual antes de persistir. Material sem saldo orienta o registro de entrada. Retirar exatamente o saldo disponível resulta em zero.

### Convenções aprovadas somente para este protótipo

- Quantidades inteiras positivas nos itens de orçamento e nas entradas/saídas; saldo inicial e mínimo de produto podem ser zero.
- Valores ilustrativos em reais, com até duas casas decimais; cálculo de quantidade × valor unitário e soma dos itens, sem desconto.
- Nome e unidade identificam o material do exemplo. Paciente, doutor, data e ao menos um item permitem demonstrar a criação de orçamento. A obrigatoriedade final dos campos depende da clínica.
- Categoria, fornecedor, lote e condições são textos de referência; não constituem catálogos definitivos. Validade informada não gera expiração automática.
- Somente nome completo é obrigatório para pacientes, doutores e usuários. CPF/CRO, contatos e demais campos cadastrais continuam opcionais, sem algoritmo ou regra de unicidade inventados.
- Consultas exigem paciente, doutor, procedimento, data, horário e duração. A situação usa Agendada, Confirmada, Em atendimento, Concluída, Cancelada e Faltou, confirmadas pelo usuário como convenções do protótipo.
- Entradas e saídas de caixa exigem valor positivo, data e descrição. Categoria, forma de pagamento, responsável e observação são opcionais e livres.
- Os perfis Administrador, Recepção, Financeiro e Doutor são referências opcionais confirmadas para o protótipo. Escolher um perfil não atribui permissões; o usuário configura cada permissão individualmente.
- O odontograma permite alternar entre dentição permanente e infantil, conforme decisão do usuário. Dente e região/superfície são opcionais nos itens do orçamento.

Essas convenções não definem moeda, precisão, arredondamento, limites comerciais ou custeio para o produto integrado. A proibição de saldo negativo está confirmada; as demais políticas de estoque continuam pendentes.

### Etapa de Pacientes

O cadastro e a edição seguem RF-11, RF-12 e RF-14 da especificação e da planilha. A pesquisa por CPF complementa RF-10; o contexto cadastral e os orçamentos reais do protótipo cobrem parte de RF-13/RF-52. Os textos de ações e feedback são derivados para permitir o uso do protótipo; não representam aprovação clínica das stories da planilha.

**Decisão confirmada pelo usuário nesta etapa:** somente o nome completo é obrigatório no protótipo. CPF, nascimento, telefone, celular, e-mail, CEP, logradouro, número, complemento, bairro, cidade, estado, observações, contato de emergência, convênio e número da carteirinha são opcionais. O nome vazio é bloqueado no formulário e novamente antes da gravação. CPF e contatos não recebem máscara, algoritmo, unicidade ou combinação obrigatória; endereço e convênio são textos livres. Sexo ficou fora desta etapa porque a documentação o condiciona à necessidade da clínica, ainda não definida.

A lista preserva a busca no endereço e nos retornos do detalhe/cadastro. CPF e telefones podem ser buscados com ou sem pontuação. O paciente recebe um código e identificador locais; a edição conserva ambos e mantém os vínculos com todos os seus orçamentos. Pacientes iniciais também podem ter seus dados cadastrais editados; seus orçamentos iniciais continuam somente para consulta.

O detalhe mostra apenas grupos cadastrais preenchidos, orçamentos vinculados e, quando existir, histórico cadastral. Cada cadastro ou edição efetiva registra data/hora, responsável local e ação; a edição identifica os campos alterados sem duplicar os valores no histórico. Salvar uma edição sem mudanças não gera evento. Os cadastros iniciais não recebem eventos históricos fabricados.

O formulário usa grupos com rótulos, indicação de obrigatoriedade e campos acessíveis. Uma falha conserva o preenchimento e leva o foco ao aviso. A saída com alterações pode ser cancelada para continuar preenchendo; durante gravação os campos ficam bloqueados e a saída aguarda a conclusão. Os controles de revisão continuam fora da navegação principal.

O detalhe cadastral do paciente não implementa prontuário, procedimentos realizados, pagamentos, anexos, inativação/reativação, filtros adicionais ou ordenação. Consultas têm agora seu módulo de Agenda. Permissões efetivas e auditoria de servidor dependem da integração real.

### Agenda, Doutores, Caixa, Administração e odontograma

A continuação solicitada pelo usuário amplia a demonstração com RF-01–RF-09 (Agenda), RF-31–RF-34 (Doutores), RF-35–RF-42 (Caixa), RF-43–RF-47 (Administração) e a associação dentária prevista em RF-18/RF-19. Isso não equivale à cobertura integral dos módulos na aplicação integrada.

A Agenda abre em visão semanal, com os horários efetivamente cadastrados, sem expediente ou duração padrão inventados. A visão mensal mostra todos os dias e as consultas da data escolhida. O cadastro por dia/horário preenche esse contexto; o filtro de doutor acompanha a navegação e os retornos. O store compara o início e o fim das consultas do mesmo doutor, inclusive quando atravessam meia-noite: sobreposição é rejeitada; horários que apenas se encostam são permitidos; consultas canceladas não ocupam o intervalo. A edição preserva paciente e duração conforme RF-08. Cancelar mantém o registro e aceita motivo opcional; mudanças de situação ficam no histórico. Disponibilidade por doutor, expediente, duração por procedimento e regras de transição de produção continuam pendentes.

Doutores conserva os IDs dos profissionais iniciais e seus vínculos com orçamentos. O status profissional é texto livre opcional; a interface não cria um ciclo de ativação/inativação. Disponibilidade, associação de procedimentos e indicadores financeiros por profissional ainda dependem de regras e integração.

Caixa começa vazio. O saldo exibido é entradas menos saídas das movimentações registradas e filtradas; não representa saldo bancário nem pressupõe saldo inicial. Uma saída pode superar as entradas locais: a decisão de proibir saldo negativo se aplica ao estoque. Salvar orçamento, consulta ou movimentação de estoque não cria recebimento ou pagamento. Categorias/formas de pagamento são textos livres; conciliação, geração automática, editabilidade/estorno, relatórios financeiros e relações com cobrança/compra permanecem pendentes.

Administração começa sem usuários ou permissões atribuídas. Há sete módulos e quatro operações (visualizar, criar, alterar, excluir), configuráveis por usuário sem matriz predefinida. Bloquear/reativar conserva o cadastro e gera histórico. Toda gravação efetiva dos módulos acrescenta auditoria com responsável local, data/hora, ação e registro afetado. Cada novo evento permite abrir o registro pelo identificador conservado no vínculo, inclusive quando houver nomes iguais. Eventos anteriores sem vínculo continuam legíveis. Salvar usuários, pacientes ou doutores sem alterações não cria evento. O responsável “Você” identifica o operador local da demonstração; autenticação, aplicação de autorização, segurança da auditoria e regras administrativas de servidor não estão implementadas.

O odontograma usa 32 dentes permanentes e 20 infantis, com numeração FDI de dois dígitos e quadrantes pela perspectiva do paciente. A correspondência de numeração foi conferida na [tabela oficial de designação dentária mantida no HL7](https://build.fhir.org/ig/HL7/UTG/branches/master/en/CodeSystem-ADAUniversalToothDesignationSystem.html), que relaciona os códigos às identificações ISO. As silhuetas são ilustrativas, sem diagnóstico. Selecionar um dente cria um item para escolher o procedimento; o item conserva dente, região/superfície livre e observação. É possível combinar ambas as dentições no mesmo orçamento. A marca no desenho indica somente procedimento planejado no orçamento. Não há prontuário, condição clínica ou procedimento executado presumido.

### Painel

A tela foi acrescentada por solicitação explícita do usuário em 03/10/2026 e passou a ser a entrada do protótipo e o destino da marca na navegação. A especificação anterior não previa um Dashboard como destino alternativo após login; esta mudança da demonstração não define autenticação, permissões efetivas ou redirecionamentos do produto integrado.

Na revisão visual solicitada posteriormente, a tela recebeu o nome **Painel**, no título, navegação e mensagens. A entrada usa `#/painel`; endereços antigos `#/dashboard` redirecionam para o Painel conservando a data selecionada. Os blocos passaram a acompanhar o conteúdo em duas colunas independentes, sem reservar uma linha inteira pela altura do Estoque: o Caixa começa logo abaixo de Consultas mesmo no dia vazio. Estoque e orçamentos têm linhas mais compactas, sem reduzir os alvos de toque. Em 375 px os blocos seguem a ordem Consultas, Caixa, Estoque e Orçamentos. Links e botões usam o verde mais escuro `#145453`, com contraste calculado de 8,67:1 contra branco; o texto da opção selecionada na navegação passou a branco. As três propostas de identidade visual são estudos isolados para aprovação, sem substituir o tema geral da aplicação.

O dia de referência começa na data de São Paulo e pode ser alterado ou retomado pelo botão Hoje. A seleção fica no endereço e acompanha o recarregamento. As consultas usam exatamente o dia escolhido, incluindo canceladas e faltas com a situação visível. A lista apresenta até seis consultas em ordem de horário e oferece acesso à Agenda para consultar todas. Pacientes e orçamentos cadastrados são totais de todos os registros; materiais abaixo do mínimo usam a comparação entre saldo atual e mínimo cadastrado. A lista de atenção apresenta até quatro materiais: primeiro os sem saldo, depois por nome, sem ordenar quantidades de unidades diferentes como se fossem equivalentes. Ela abre o filtro de estoque correspondente. Orçamentos recentes apresenta até cinco registros, ordenados por data de criação e código, com valores dos itens e vínculo para o orçamento.

O Caixa usa as movimentações manuais com data dentro do mês completo do dia de referência. Entradas e saídas são somadas em centavos; o saldo é entradas menos saídas desse período. O gráfico compara os seis meses até o mês de referência, com a mesma escala para as duas séries e uma tabela acessível com os valores exatos. Sem movimentações, a tela oferece registrar uma entrada. O resumo não pressupõe saldo inicial, receita, lucro, pagamento de orçamento ou conciliação bancária.

Quando existem registros na semana do dia de referência, o Painel também mostra **Consultas registradas por dia**. Ele responde à pergunta operacional “em quais dias desta semana há mais registros para conferir?”; cada coluna abre a Agenda no dia correspondente. A contagem inclui todos os registros, inclusive cancelados e faltas, e não representa ocupação, disponibilidade ou produtividade. Os sete valores e as datas são texto e links, portanto a comparação não depende somente da cor ou do gráfico. Sem registros semanais, esse gráfico não aparece: o estado vazio de Consultas explica o cenário e oferece a ação de agendar.

O Painel lê as coleções existentes sem alterar identificadores, dados iniciais, chave de armazenamento ou snapshots salvos. Cadastros e movimentações efetivamente gravados pelos módulos aparecem no resumo ao retornar ou recarregar. Os estados vazio, carregamento e erro de leitura têm ações funcionais; durante carregamento ou erro, os indicadores ficam ocultos para não apresentar números como se a leitura tivesse sido concluída.

## Interface para a rotina da clínica

A interface prioriza pessoas com pouca familiaridade com sistemas: ações com nomes diretos, textos secundários escuros, rótulos de campo com 16 px, textos auxiliares de pelo menos 14 px, foco visível e controles com pelo menos 44 px. O texto secundário usa `#35484E`, com contraste de pelo menos 7:1 nas superfícies branca e de trabalho; os testes verificam esse par além da análise com axe.

Os avisos de demonstração, cabeçalho redundante de desktop, rodapé repetitivo, notas técnicas e blocos sobre funcionalidades futuras foram removidos das telas de uso a pedido do usuário. Limitações e proveniência ficam neste README e na revisão técnica. Isso não altera a natureza fictícia dos dados ou a ausência de backend.

No celular, a lista de pacientes de Orçamentos vira um seletor compacto para alcançar os registros sem percorrer todos os pacientes. Nos formulários de estoque, campos complementares ficam em “Informações adicionais (opcional)”. Se um desses campos tiver erro, a seção abre e o foco vai para a correção.

### Revisão de uso em todas as telas — 03/10/2026

A revisão conserva a marca, a IBM Plex Sans, as cores atuais, os componentes e CSS Modules. Não adiciona bibliotecas, backend ou regras de negócio. As alterações anteriores do Painel foram preservadas. A tabela distingue defeitos de comportamento verificados de hipóteses de dificuldade de uso que ainda precisam de avaliação com pessoas.

| Tela ou fluxo | Evidência e natureza do problema | Impacto | Prioridade | Correção implementada |
| --- | --- | --- | --- | --- |
| Caixa | Bug: período invertido apresentava entradas, saídas e saldo zerados, apesar de não constituir uma consulta válida. | Zero poderia ser entendido como resultado financeiro do período. | Alta | Erro associado à data final; totais e lista aguardam a correção, conservando os filtros. |
| Estoque: cadastro, entrada e saída | Bug de foco: após falha de gravação, o aviso aparecia sem receber foco, ao contrário dos outros formulários. | Quem usa teclado pode não localizar a recuperação. | Alta | Foco no aviso e preservação dos dados; repetição do envio e recarregamento verificados. |
| Cadastro de material | Inconsistência reproduzida: não participava dos cenários de carregamento e falha de leitura. | Revisão e recuperação tinham comportamento diferente dos demais cadastros. | Média | Usa o mesmo ciclo de leitura, com tentativa de recuperação e preenchimento conservado. |
| Orçamentos | Bug: busca de pacientes existia somente na memória da tela e sumia ao retornar ou recarregar. | A pessoa precisava localizar o paciente novamente. | Média | Busca no endereço, conservada no detalhe, criação e retorno; disponível também no celular. |
| Orçamentos sem pacientes | Estado vazio oferecia criar orçamento sem o cadastro necessário para concluir. | A pessoa chegava a um formulário que não podia terminar. | Alta | Orientação e acesso ao cadastro de paciente; após salvar, Criar orçamento usa esse paciente. |
| Agenda no celular | Hipótese de uso: a grade de sete dias exigia rolagem lateral para encontrar um atendimento. | A data desejada e a próxima ação podiam ficar fora da primeira visão. | Média | Seleção de dia e lista de consultas; grade completa acessível por Ver grade de horários da semana. |
| Pacientes, Doutores e Administração | Hipótese de compreensão: ações nominais e ausência de atalhos de recuperação acrescentavam passos. | Uma pessoa iniciante precisava deduzir a ação seguinte. | Média | Cadastrar paciente/doutor/usuário; criar orçamento no paciente; limpar busca/filtros com resultados. |
| Painel | Comparação por saldo bruto entre unidades distintas e falta de acesso ao mês pela tabela do gráfico. | Ordem podia sugerir prioridade de compra indevida; conferência mensal exigia refazer o filtro. | Média | Materiais sem saldo primeiro e restante por nome; meses da tabela abrem o Caixa no intervalo exato. |
| Componentes compartilhados | Foco de títulos/conteúdo sem indicador visual e campos sem atributo name; risco de textos longos em layouts flexíveis. | Orientação por teclado e resistência do layout variavam entre páginas. | Média | Foco visível, nomes de controles, descrições preservadas, autofill cadastral e quebra de textos longos. |

O gráfico semanal já existente responde “em quais dias há consultas registradas nesta semana?” e abre a Agenda no dia escolhido. O gráfico de Caixa responde “como as entradas e saídas registradas variam nos seis meses até a referência?”; a tabela conserva os valores exatos em centavos e agora abre as movimentações de cada mês. Não foi acrescentado um terceiro gráfico: a comparação de materiais continua em texto, com saldo, mínimo e unidade por produto. Barras de dias com zero consultas não ganham altura artificial.

Contrastes calculados na paleta utilizada: ação primária/branco **8,67:1**; texto secundário/branco **9,60:1** e sobre a superfície de trabalho **8,98:1**; erro/fundo de erro **6,16:1**; sucesso/fundo de sucesso **6,38:1**; alerta/fundo de alerta **5,64:1**; borda de controle/branco **4,58:1**. O indicador de gravação respeita redução de movimento. Os alvos de 44 px são uma escolha de usabilidade; não substituem as condições e exceções de alvo mínimo da WCAG 2.2.

A revisão usa [UI/UX Design Review](https://github.com/rknall/claude-skills/blob/main/ui-design-review/SKILL.md), [UX Writing & Content Design](https://github.com/hueyexe/frontend-agent-skills/blob/main/ux-writing-content-design/SKILL.md), [Accessibility Compliance](https://github.com/wshobson/agents/blob/main/plugins/ui-design/skills/accessibility-compliance/SKILL.md), [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) e suas [diretrizes atuais](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md), [KPI Dashboard Design](https://github.com/wshobson/agents/blob/main/plugins/business-analytics/skills/kpi-dashboard-design/SKILL.md) e [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). As decisões confirmadas para o Dental Flow têm prioridade sobre sugestões genéricas.

`test/e2e/usability.spec.ts` acrescenta regressões para os defeitos acima e percorre **31 telas e variantes de consulta, cadastro, edição e revisão**, em desktop e 375 px, com axe, nomes longos sem espaços, ausência de erros de JavaScript e conservação do snapshot. Verifica também 320 px e área de layout de 720 px, correspondente à metade de um desktop de 1440 px para avaliar reflow equivalente a 200%. O teste de capturas gera os pares desktop/celular das 31 telas.

A execução final completa de `npm run test:e2e` terminou com **197 verificações aprovadas e uma dispensada**, em sete minutos, no servidor local de desenvolvimento com Microsoft Edge/Playwright. A dispensa é intencional: o fluxo da agenda móvel roda somente no projeto de 375 px. Não ficaram falhas pendentes. A varredura das 31 telas nos dois projetos não encontrou violações no axe, erros de JavaScript ou overflow da página nas larguras verificadas; também confirmou que a consulta das telas não altera o snapshot local.

Passaram `npm run typecheck`, `npm run build`, `npm run build:pages` e `git diff --check`. Na prévia do build para Pages, em `http://127.0.0.1:4178/frontend/`, a execução adicional do teste de capturas passou nos dois projetos: **31 telas por largura e 62 imagens reais**, com registros fictícios em contextos isolados. Essa rodada do build verifica navegação e captura das telas; a suíte completa acima foi executada no servidor de desenvolvimento. Os artefatos de revisão não comprovam publicação. As alterações permanecem locais, sem commit ou push.

Uma verificação adicional percorreu as mesmas **31 telas no build para Pages com zoom nativo de 200% no Edge**, em um perfil exclusivo de teste. A preferência de zoom do navegador foi configurada nesse perfil: a medição passou de 1440 × 960 e `devicePixelRatio: 1` para 720 × 480 e `devicePixelRatio: 2`, mantendo `visualViewport.scale: 1`. Isso distingue o zoom do navegador de um simples redimensionamento ou gesto de ampliação. Não houve overflow da página, violações no axe, erros de JavaScript ou alteração do snapshot. O script e as medições estão na galeria local entregue com esta revisão. O método segue a [preferência de zoom do Chromium](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc) e a [conversão oficial entre nível e fator](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/common/page/page_zoom.cc); não representa uma navegação manual em todas as telas ampliadas.

Para uma validação posterior com pessoas, proponha tarefas curtas sem explicar os controles: cadastrar um paciente e criar seu orçamento; agendar e encontrar uma consulta; registrar uma saída e explicar o saldo do período; tentar retirar material acima do saldo e corrigir a quantidade; localizar um usuário e explicar suas permissões. Observe conclusão, necessidade de ajuda e compreensão dos erros. Testes automáticos e inspeção visual não comprovam facilidade de uso com pessoas reais, leitor de tela ou dispositivo físico.

## Dados locais e cenários

O cenário inicial tem quatro pacientes, dois doutores, quatro procedimentos, três orçamentos, cinco materiais e oito movimentações de estoque. Consultas, caixa, usuários e auditoria começam vazios. Os cadastros foram criados para esta demonstração; nenhum dado veio de pacientes reais.

Os registros salvos ficam na chave `dental_flow_demo_v1` do armazenamento local do navegador. Cada navegador/origem tem seus próprios dados. Não há compartilhamento entre visitantes, sincronização entre abas ou auditoria de servidor. O cenário escolhido nas opções é temporário e volta ao funcionamento normal após recarregar.

Os controles de teste estão em `#/revisao`, sem link na navegação principal. Para conferir uma falha enquanto um formulário está preenchido, use **Ctrl + Alt + R**: o painel de revisão abre sem sair da página nem perder os campos. Ele permite escolher:

- **Funcionamento normal:** permite consultar e salvar.
- **Carregamento lento:** permite conferir o indicador de carregamento e a prevenção de envio repetido.
- **Falha ao carregar:** apresenta erro de leitura e ação para tentar novamente.
- **Falha ao salvar:** mantém os dados preenchidos e mostra erro; volte ao funcionamento normal para repetir o envio.

**Restaurar dados de teste** substitui somente os registros fictícios deste aplicativo pelos dados iniciais. A confirmação informa o descarte de registros e formulários não salvos. O aviso ao sair de um formulário permite permanecer e conservar o preenchimento. Escape fecha o painel e devolve o foco ao controle anterior.

Durante uma gravação, a navegação de saída, a troca de cenário e a restauração aguardam a conclusão. As operações locais são executadas uma de cada vez para evitar que uma gravação pendente reponha dados depois de uma restauração.

Ao carregar snapshots da primeira entrega, apenas os textos fixos dos exemplos iniciais são atualizados para remover notas antigas de demonstração. Os saldos e os registros criados pelo visitante são preservados. Não há migração para banco de dados ou integração externa.

A ampliação de Pacientes mantém a chave `dental_flow_demo_v1` e `version: 1`. Ao ler um snapshot anterior, acrescenta somente os campos cadastrais ausentes como textos vazios e o histórico ausente como lista vazia, sem gravar automaticamente nem trocar identificadores/códigos. A próxima gravação efetiva persiste o formato ampliado. Campos existentes, pacientes/orçamentos criados pelo visitante e saldos/movimentações de estoque são preservados.

A continuação acrescenta coleções ausentes de consultas, caixa, usuários e auditoria como listas vazias; não cria registros automaticamente nem salva na leitura. Dente e superfície ausentes continuam opcionais. Se o snapshot não puder ser aberto, a interface exibe os dados iniciais e bloqueia novas gravações para conservar o conteúdo original. A recuperação exige confirmação explícita antes de substituí-lo. Auditoria e alteração de dados são salvas juntas na mesma operação; uma falha conserva o estado anterior.

## Validação no navegador

Os testes em `test/e2e/demo.spec.ts` exercitam seleção de paciente, criação/edição e persistência de orçamento, validações/foco, remoção de item, preservação após falha, guarda de saída, filtros de estoque, entrada/histórico/saldo, saída com motivo, bloqueio de saldo negativo, retirada total, material sem saldo, cadastro, campos complementares com erro, restauração, recuperação de dados locais ilegíveis, navegação móvel e recarregamento de rotas. `test/e2e/patient.spec.ts` amplia a cobertura com cadastro mínimo/completo, edição, identidade/histórico e relação com orçamento novo, compatibilidade dos snapshots antigos, busca/retorno, falhas, campos preservados, proteção de saída e gravação pendente, teclado, foco, axe e ausência de overflow nas novas telas.

As suítes `agenda.spec.ts`, `cash.spec.ts`, `doctor_admin.spec.ts` e `odontogram.spec.ts` cobrem os novos módulos. Conferem calendários e navegação por data/doutor, conflitos e meia-noite, cancelamento e retorno de situação com histórico, cadastros mínimos/completos e compatibilidade antiga, permissões sem herança automática, bloqueio/reativação com confirmação, auditoria e acesso ao registro afetado, filtros e centavos do caixa, seleção dentária/superfícies, campos preservados após falha, proteção durante gravação, recarregamento, teclado, axe e overflow. Um cenário ilegível verifica que gravar é bloqueado, cancelar a recuperação conserva o snapshot e confirmar permite voltar a salvar.

Também verificam ausência de overflow nas telas principais, erros de JavaScript e regras automatizadas de acessibilidade WCAG A/AA com axe. Os projetos usam desktop de 1440 px e celular de **375 px**. A conferência automática é complementada por inspeção visual; não representa certificação de acessibilidade.

A etapa anterior registrou 46 testes: 23 em desktop e 23 em 375 px, executados na versão compilada para Pages. A varredura anterior cobre nove telas da clínica em cada largura, incluindo ausência de avisos de demonstração, overflow horizontal e erros de JavaScript. A página de revisão também tem verificação automatizada de acessibilidade.

A etapa de Pacientes foi validada em 02/10/2026 no build para Pages com Microsoft Edge/Playwright. A primeira execução completa passou com 74 testes, incluindo os 46 anteriores. Depois de reforçar os cenários de compatibilidade, descarte de edição e busca sem pontuação, a execução final de `patient.spec.ts` passou com 32 testes (16 em desktop e 16 em 375 px). A cobertura validada totaliza **78 testes distintos**, 39 por largura: 46 dos fluxos anteriores e 32 de Pacientes. As capturas do formulário, lista e detalhe foram inspecionadas visualmente em ambas as larguras. As verificações de axe, foco, overflow e JavaScript passaram; não constituem certificação nem teste em dispositivo físico.

Também passaram `npm run typecheck`, `npm run build`, `npm run build:pages` e `git diff --check`. A prévia foi servida por `npm run preview:pages`; o recorte permanece somente em alterações locais, sem commit, push ou publicação.

A ampliação de Agenda, Doutores, Caixa, Administração e odontograma foi validada em 02/10/2026 no build para Pages com Microsoft Edge/Playwright. A rodada completa terminou com 158 verificações aprovadas e duas falhas de seletor no teste de busca de usuários: a lista e a auditoria agora têm links com o mesmo nome. Após restringir esse teste à região da lista, a suíte final `doctor_admin.spec.ts` passou com 30 verificações (15 por largura). Somadas às 130 verificações dos demais módulos aprovadas na rodada completa, a cobertura final validada totaliza **160 combinações de cenário e largura: 80 cenários em desktop e os mesmos 80 em 375 px**, sem falhas pendentes. Capturas das visões semanal/mensal da Agenda, Caixa, Doutores, configuração de usuários e odontograma foram inspecionadas visualmente em desktop e celular. Axe, foco, preservação após falha, recarregamento e ausência de overflow passaram nas telas cobertas; a agenda semanal tem rolagem horizontal dentro de sua própria região em celular.

A etapa do Dashboard foi validada em 03/10/2026 no build para Pages com Microsoft Edge/Playwright. A execução final conjunta de `dashboard.spec.ts` e `demo.spec.ts` passou com **62 verificações**: oito cenários do Dashboard e 23 dos fluxos existentes, executados em desktop e em 375 px. O Dashboard verifica a entrada inicial, data de São Paulo/Hoje, totais e ordenação, soma mensal e comparação de seis meses, filtros nos atalhos, recarregamento após consulta e entrada de caixa, independência entre módulos, ausência de gravação na leitura, estado vazio, carregamento, erro e recuperação, teclado, foco, axe, navegação móvel e ausência de overflow/erros de JavaScript. Um defeito de navegação encontrado na primeira rodada foi corrigido: selecionar o módulo atual no menu móvel agora fecha a navegação e devolve o foco ao título. As capturas gerais e do Caixa foram inspecionadas visualmente nas duas larguras. As demais suítes mantêm a evidência da etapa anterior; não foram executadas novamente nesta rodada. Typecheck, builds normal/Pages e `git diff --check` passaram. O Dashboard permanece em alterações locais, sem commit, push ou publicação.

A revisão de nome, espaços e legibilidade do Painel foi validada no mesmo dia. A primeira rodada conjunta teve 61 verificações aprovadas e uma falha no teste do link ativo em celular, que precisava abrir o menu antes de localizar o link. Após corrigir esse seletor, a execução final de `dashboard.spec.ts` passou com 16 verificações (oito cenários por largura), incluindo o retorno compatível de `#/dashboard?date=…`, foco/navegação e uma verificação da distância visível entre Consultas e Caixa no dia vazio. As 46 verificações de `demo.spec.ts` passaram na rodada conjunta. Isso valida 62 combinações de cenário/largura, em rodadas separadas, sem falhas pendentes. As propostas foram renderizadas em contextos de navegador isolados, com dados fictícios, sem gravar no navegador do usuário; as imagens do Painel, cadastro de Pacientes e um exemplo móvel foram inspecionadas. Os cálculos de contraste das propostas são evidência de paleta, e não uma certificação das telas futuras.

Na continuação, a suíte do Painel ganhou a verificação do gráfico semanal, de seus valores acessíveis e de cada link para a Agenda, além de reflow em 320 px. A validação atual deve ser lida junto da próxima execução registrada; ela não substitui teste com pessoas usuárias, leitor de tela ou dispositivo físico.

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
- `src/feature/dashboard`: resumo do dia, caixa mensal com comparação de seis meses, atenção ao estoque e orçamentos recentes.
- `src/feature/budget`: lista e editor de orçamentos.
- `src/feature/inventory`: lista, detalhe, cadastro, entrada e saída de estoque.
- `src/feature/patient`: busca, cadastro, detalhe, edição e histórico cadastral de pacientes.
- `src/feature/agenda`: calendários semanal/mensal, cadastro, edição, detalhe e cancelamento de consultas.
- `src/feature/doctor`: lista, cadastro, edição e contexto de doutores.
- `src/feature/cash`: entradas/saídas, filtros, saldo de movimentações e detalhe.
- `src/feature/admin`: usuários, permissões configuráveis, bloqueio/reativação e auditoria local.
- `src/feature/review`: controles de teste, fora da navegação da clínica.
- `src/component`: controles, feedback, carregamento e comportamento de formulários.
- `src/demo`: modelos de apresentação, cenário inicial e armazenamento local. Não são contratos de API.
- `src/asset/brand`: logotipo original, incorporado sem redesenho.
- `src/style`: fontes locais IBM Plex Sans, normalização e tokens compartilhados.

Componentes e páginas usam CSS Modules. Não há Tailwind, Bootstrap ou biblioteca visual. O foco, as ações, as tabelas/listas e os formulários são próprios da aplicação. IBM Plex Sans é distribuída pelo pacote `@fontsource/ibm-plex-sans` sob a licença SIL Open Font License.

## Decisões necessárias antes da integração

Ainda precisam ser definidas:

- Matriz de perfis/permissões, operador de estoque, autenticação, recuperação de acesso e destino após login.
- Catálogos e transições de produção para consulta/orçamento, aprovação parcial, edição após aprovação, validade e expiração. As situações de consulta do protótipo foram confirmadas nesta continuação.
- Moeda, descontos por item/global, cumulatividade, limites e arredondamento.
- Modelo clínico do odontograma e catálogo/representação de superfícies. A seleção permanente/infantil e identificação FDI estão implementadas no protótipo; superfície permanece livre.
- Obrigatoriedade final dos cadastros integrados, regras de CPF/CRO/contatos, necessidade de sexo, inativação e reativação. No protótipo de Pacientes, somente o nome completo é obrigatório por decisão do usuário.
- Unidade/precisão, lotes, validade, ajustes e método de custeio do estoque. Saldo negativo foi rejeitado pelo usuário e está bloqueado.
- Gatilhos e relações entre orçamento, tratamento, consulta, cobrança, pagamento e compra; prevenção de duplicidade.
- Anexos, limites, retenção, dados da clínica e formato de impressão/exportação.
- Contratos reais de integração e tratamento de concorrência/erros do backend.

Painel, Agenda, manutenção de Doutores, Caixa, usuários/permissões locais e orçamento com seleção dentária estão implementados neste recorte. Prontuário, procedimentos realizados, pagamentos integrados, anexos, relatórios financeiros e Acesso real continuam pendentes. A demonstração entra pelo Painel por solicitação do usuário; o destino Agenda após login descrito pela especificação depende do Acesso integrado e de sua definição de permissões.

## Fontes e autoridade

O planejamento aprovado parte dos artefatos do repositório independente `documentos`: `1_SPC/c_design/dental_flow_ap_clinic_SPC_design.md` e `0_Context/b_brief/dental_flow_ap_clinic_SPC_frontend_brief.xlsx`.

A planilha atual tem registros consolidados e derivados; trechos do Markdown ainda descrevem o modelo anterior vazio. Essa divergência não foi corrigida neste recorte. Na revisão de Pacientes, foram comparados o design (linhas 478–530, 1027–1030) e as células atuais `Requisitos Funcionais!C13:G18`, `Conteúdo das Páginas!E32/E34` e `Tom de Voz!B9/D9`. `Identificação do Projeto!B18/B30` confirma a versão preenchida e preserva a falta de aprovação clínica; as stories continuam derivadas e sujeitas à validação. Nesta continuação o usuário confirmou os campos mínimos, as duas dentições, as situações de consulta e os quatro perfis apenas como convenções do protótipo. O Dashboard foi solicitado posteriormente pelo usuário; seu resumo deriva dos dados já existentes, sem acrescentar regras comerciais. Horários de expediente, pagamentos e matriz de permissões não foram promovidos a regras aprovadas. Os requisitos registrados na documentação não equivalem a cobertura integral por esta demonstração.
