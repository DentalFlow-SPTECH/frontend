import { PagedList } from '../../../component/paged_list.jsx';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import styles from './admin.module.css';
import { modules, operations, profiles, fieldKeys, labels } from '../model/admin_model.js';
import { money } from '../../../demo/format.js';
import { useAdminViewModel, useUserDetailViewModel, useUserFormViewModel, useClinicFormViewModel, useClinicLinkViewModel } from '../view_model/use_admin_view_model.js';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingUser() { return <><PageHeader title="Usuário não encontrado"/><EmptyState title="Este cadastro não está disponível" detail="Volte à administração para consultar os usuários." action={<ActionLink to="/administracao">Voltar à administração</ActionLink>}/></>; }
function timestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(date);
}
function AuditList({ entries }) {
    return entries.length ? <PagedList records={[...entries].reverse()} label="Auditoria">{rows => <ul className={styles.auditList}>{rows.map(entry => <li key={entry.id}><dl><div><dt>Usuário</dt><dd>{entry.actor}</dd></div><div><dt>Data/hora</dt><dd><time dateTime={entry.date}>{timestamp(entry.date)}</time></dd></div><div><dt>Ação realizada</dt><dd>{entry.action}</dd></div><div><dt>Registro afetado</dt><dd>{entry.recordPath ? <Link to={entry.recordPath}>{entry.record}</Link> : entry.record}</dd></div></dl></li>)}</ul>}</PagedList> : <p className={uiStyles.muted}>Nenhuma ação registrada até o momento.</p>;
}
function PermissionSummary({ permissions }) {
    return permissions.length ? <dl className={styles.permissionSummary}>{modules.map(module => {
            const enabled = operations.filter(operation => permissions.includes(`${module.key}:${operation.key}`));
            return enabled.length > 0 && <div key={module.key}><dt>{module.label}</dt><dd>{enabled.map(operation => operation.label).join(', ')}</dd></div>;
        })}</dl> : <p className={uiStyles.muted}>Nenhuma permissão configurada.</p>;
}
export function AdminPage() {
    const { data, clearFilters, query, status, search, resource, filtered, filter, clinics, pending, tab, tabs } = useAdminViewModel();
    return <>
    <PageHeader title="Administração" description="Consulte usuários, configure permissões e acompanhe as ações registradas." action={<ActionLink to={`/administracao/novo${search}`}>Cadastrar usuário</ActionLink>}/>
    <nav className={uiStyles.tabs} aria-label="Seções da administração">{tabs.map(value => <Link key={value.key} to={value.to} aria-current={value.current ? 'page' : undefined}>{value.label}</Link>)}</nav>
    {tab === 'usuarios' && <section className={styles.section} aria-labelledby="admin_users"><h2 id="admin_users" className={uiStyles.srOnly}>Usuários</h2>
      <div className={styles.filters}><Field id="user_search" label="Buscar usuário"><input type="search" value={query} onChange={event => filter('q', event.target.value)} placeholder="Nome, login, e-mail ou perfil"/></Field><Field id="user_status_filter" label="Status do usuário"><select value={status} onChange={event => filter('status', event.target.value)}><option value="">Todos</option><option value="active">Ativos</option><option value="blocked">Bloqueados</option></select></Field></div>
      {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : filtered.length ? <><div className={styles.countBar}><p className={styles.count} role="status">{filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}</p>{(query || status) && <Button variant="quiet" onClick={() => clearFilters()}>Limpar filtros</Button>}</div><PagedList records={filtered} label="Usuários" pageKey="pagina">{rows => <div className={`${uiStyles.records} ${styles.userColumns}`}><div className={uiStyles.recordHead} aria-hidden="true"><span>Usuário</span><span>Perfil de acesso</span><span>E-mail</span><span>Status</span></div><ul className={uiStyles.recordList}>{rows.map(user => <li key={user.id}><div><h3><Link to={`/administracao/${user.id}${search}`}>{user.name}</Link></h3><small>{user.login || 'Login não informado'}</small></div><dl><div><dt>Perfil de acesso</dt><dd>{user.profile || <span className={uiStyles.recordMuted}>Não informado</span>}</dd></div><div><dt>E-mail</dt><dd>{user.email || <span className={uiStyles.recordMuted}>Não informado</span>}</dd></div></dl><div><StatusLabel tone={user.blocked ? 'warning' : 'success'}>{user.blocked ? 'Bloqueado' : 'Ativo'}</StatusLabel></div></li>)}</ul></div>}</PagedList></> : <EmptyState title={query || status ? 'Nenhum usuário encontrado' : 'Ainda não há usuários'} detail={query || status ? 'Altere os filtros para consultar outros registros.' : 'Cadastre os usuários da clínica e configure suas permissões.'} action={query || status ? <Button variant="secondary" onClick={() => clearFilters()}>Limpar filtros</Button> : <ActionLink to="/administracao/novo">Cadastrar primeiro usuário</ActionLink>}/>}
    </section>}
    {tab === 'clinicas' && (resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : <section className={styles.section} aria-labelledby="admin_clinics"><div className={styles.sectionHeading}><h2 id="admin_clinics">Clínicas</h2><ActionLink variant="secondary" to="/administracao/clinicas/nova">Cadastrar clínica</ActionLink></div>
      {clinics.length > 0 && pending.appointments + pending.cash > 0 && <p className={styles.pendingLinks}><span className={uiStyles.pending}>{[pending.appointments > 0 && plural(pending.appointments, 'consulta', 'consultas'), pending.cash > 0 && plural(pending.cash, 'movimentação de caixa', 'movimentações de caixa')].filter(Boolean).join(' e ')} sem clínica.</span> <Link to="/administracao/vinculos">Vincular registros</Link></p>}
      {clinics.length ? <PagedList records={clinics} label="Clínicas">{rows => <ul className={styles.clinics}>{rows.map(clinic => <li key={clinic.id}><strong>{clinic.name}</strong><span>{plural(clinic.appointments, 'consulta vinculada', 'consultas vinculadas')}</span><Link to={`/administracao/clinicas/${clinic.id}/editar`} aria-label={`Editar clínica ${clinic.name}`}>Editar</Link></li>)}</ul>}</PagedList> : <p className={uiStyles.muted}>Nenhuma clínica cadastrada. Enquanto não houver clínicas, as consultas ficam sem unidade e os filtros por clínica não aparecem.</p>}
    </section>)}
    {tab === 'auditoria' && (resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : <section className={styles.section} aria-labelledby="admin_audit"><h2 id="admin_audit">Auditoria de ações</h2><AuditList entries={data.audit}/></section>)}
  </>;
}
export function UserDetailPage() {
    const { id } = useParams();
    return <UserDetail key={id} id={id}/>;
}
function UserDetail({ id }) {
    const { search, resource, user, saving, saveError, success, toggleBlocked } = useUserDetailViewModel({ id });
    function handleToggleBlocked() { const confirmed = window.confirm(`${user.blocked ? 'Reativar' : 'Bloquear'} o usuário ${user.name}?`); return toggleBlocked(confirmed); }
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError || success)
            feedback.current?.focus();
    }, [saveError, success]);
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (!user)
        return <MissingUser />;
    return <>
    <Link className={uiStyles.back} to={`/administracao${search}`}>← Voltar à administração</Link>
    <PageHeader title={user.name} action={<ActionLink to={`/administracao/${user.id}/editar${search}`}>Editar usuário</ActionLink>}/>
    {(saveError || success) && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone={saveError ? 'error' : 'success'} title={saveError ? 'Não foi possível atualizar' : undefined}>{saveError || success}</Feedback></div>}
    <section className={styles.section} aria-labelledby="user_information"><div className={styles.sectionHeading}><h2 id="user_information">Dados do usuário</h2><StatusLabel tone={user.blocked ? 'warning' : 'success'}>{user.blocked ? 'Bloqueado' : 'Ativo'}</StatusLabel></div><dl className={uiStyles.definition}>{fieldKeys.filter(key => key !== 'name').map(key => <div key={key}><dt>{labels[key]}</dt><dd>{user[key] || 'Não informado'}</dd></div>)}</dl><div className={styles.statusActions}><Button variant="secondary" busy={saving} onClick={handleToggleBlocked}>{saving ? 'Atualizando status…' : user.blocked ? 'Reativar usuário' : 'Bloquear usuário'}</Button></div></section>
    <section className={styles.section} aria-labelledby="user_permissions"><h2 id="user_permissions">Permissões configuradas</h2><PermissionSummary permissions={user.permissions}/></section>
    <section className={styles.section} aria-labelledby="user_history"><h2 id="user_history">Histórico do usuário</h2><HistoryList entries={user.history}/></section>
  </>;
}
export function UserFormPage() { const { id } = useParams(); return <UserForm key={id ?? 'new'} id={id}/>; }
function UserForm({ id }) {
    const { search, resource, source, values, nameError, change, saveError, saving, saved, togglePermission, submit, returnTo } = useUserFormViewModel({ id });
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError)
            feedback.current?.focus();
    }, [saveError]);
    if (saved)
        return <><PageHeader title={id ? 'Usuário atualizado' : 'Usuário cadastrado'}/><Feedback tone="success">O cadastro de {saved.name} foi salvo.</Feedback><div className={uiStyles.formActions}><ActionLink to={`/administracao/${saved.id}${search}`}>Ver usuário</ActionLink><ActionLink variant="secondary" to={`/administracao${search}`}>Voltar à administração</ActionLink></div></>;
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (id && !source)
        return <MissingUser />;
    return <>
    <Link className={uiStyles.back} to={returnTo}>← {id ? 'Voltar ao usuário' : 'Voltar à administração'}</Link>
    <PageHeader title={id ? 'Editar usuário' : 'Novo usuário'}/>
    <p className={styles.hint}>Preencha o nome completo. Os demais campos são opcionais.</p>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Dados do usuário</legend><div className={uiStyles.formGrid}>{fieldKeys.map(key => <div key={key} className={key === 'name' ? uiStyles.full : undefined}><Field id={`user_${key}`} label={`${labels[key]} (${key === 'name' ? 'obrigatório' : 'opcional'})`} error={key === 'name' ? nameError : undefined}>{key === 'profile' ? <select value={values.profile} onChange={event => change('profile', event.target.value)}><option value="">Não informado</option>{profiles.map(profile => <option key={profile}>{profile}</option>)}{values.profile && !profiles.includes(values.profile) && <option>{values.profile}</option>}</select> : <input type={key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'text'} autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'off'} spellCheck={key === 'login' ? false : undefined} required={key === 'name'} value={values[key]} onChange={event => change(key, event.target.value)}/>}</Field></div>)}</div></fieldset>
      <fieldset className={styles.formSection} disabled={saving} aria-describedby="permissions_hint"><legend>Configuração de permissões</legend><p id="permissions_hint" className={styles.permissionHint}>Selecione as operações de cada módulo. Escolher um perfil não altera as permissões.</p><div className={styles.permissionHeading} aria-hidden="true"><span>Módulo</span>{operations.map(operation => <span key={operation.key}>{operation.label}</span>)}</div>{modules.map(module => <div key={module.key} className={styles.permissionRow}><strong>{module.label}</strong>{operations.map(operation => {
                const permission = `${module.key}:${operation.key}`;
                return <label key={permission}><input type="checkbox" checked={values.permissions.includes(permission)} onChange={() => togglePermission(permission)} aria-label={`${module.label}: ${operation.label}`}/><span>{operation.label}</span></label>;
            })}</div>)}</fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando usuário…' : 'Salvar usuário'}</Button><ActionLink variant="secondary" to={returnTo}>Cancelar</ActionLink></div>
    </form>
  </>;
}
export function ClinicFormPage() { const { id } = useParams(); return <ClinicForm key={id ?? 'new'} id={id}/>; }
function ClinicForm({ id }) {
    const { resource, source, name, nameError, saveError, saving, saved, change, submit } = useClinicFormViewModel({ id });
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError)
            feedback.current?.focus();
    }, [saveError]);
    if (saved)
        return <><PageHeader title={id ? 'Clínica atualizada' : 'Clínica cadastrada'}/><Feedback tone="success">{saved.name} está disponível nos agendamentos, relatórios e filtros.</Feedback><div className={uiStyles.formActions}><ActionLink to="/administracao?aba=clinicas">Voltar à administração</ActionLink><ActionLink variant="secondary" to="/administracao/vinculos">Vincular registros sem clínica</ActionLink></div></>;
    if (resource.busy)
        return <LoadingState />;
    if (resource.error)
        return <ReadError message={resource.error} retry={resource.retry}/>;
    if (id && !source)
        return <><PageHeader title="Clínica não encontrada"/><EmptyState title="Este cadastro não está disponível" detail="Volte à administração para consultar as clínicas." action={<ActionLink to="/administracao">Voltar à administração</ActionLink>}/></>;
    return <>
    <Link className={uiStyles.back} to="/administracao?aba=clinicas">← Voltar à administração</Link>
    <PageHeader title={id ? 'Editar clínica' : 'Nova clínica'}/>
    <p className={styles.hint}>Informe o nome da unidade. Pacientes e doutores continuam compartilhados entre as clínicas.</p>
    <form onSubmit={handleSubmit} noValidate>
      {saveError && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone="error" title="Não foi possível salvar">{saveError}</Feedback></div>}
      <fieldset className={styles.formSection} disabled={saving}><legend>Dados da clínica</legend><Field id="clinic_name" label="Nome da clínica (obrigatório)" error={nameError}><input required autoComplete="off" value={name} onChange={event => change(event.target.value)}/></Field></fieldset>
      <div className={uiStyles.formActions}><Button type="submit" busy={saving}>{saving ? 'Salvando clínica…' : 'Salvar clínica'}</Button><ActionLink variant="secondary" to="/administracao?aba=clinicas">Cancelar</ActionLink></div>
    </form>
    {source && <section className={styles.section} aria-labelledby="clinic_history"><h2 id="clinic_history">Histórico da clínica</h2><HistoryList entries={source.history}/></section>}
  </>;
}
export function ClinicLinkPage() {
    const { clinics, resource, kind, records, counts, clinicId, clinicError, chosen, saveError, success, saving, toggle, changeKind, changeClinic, submit } = useClinicLinkViewModel();
    const feedback = useRef(null);
    useEffect(() => {
        if (saveError || success)
            feedback.current?.focus();
    }, [saveError, success]);
    async function handleSubmit(event) { event.preventDefault(); const target = await submit(); if (typeof target === 'string')
        requestAnimationFrame(() => document.getElementById(target)?.focus()); }
    return <>
    <Link className={uiStyles.back} to="/administracao?aba=clinicas">← Voltar à administração</Link>
    <PageHeader title="Vincular registros sem clínica" description="Escolha a clínica e os registros anteriores a vincular. Nada é vinculado automaticamente."/>
    {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : !clinics.length ? <EmptyState title="Cadastre uma clínica para vincular" detail="A vinculação depende de ao menos uma clínica cadastrada." action={<ActionLink to="/administracao/clinicas/nova">Cadastrar clínica</ActionLink>}/> : <form onSubmit={handleSubmit} noValidate>
      {(saveError || success) && <div ref={feedback} tabIndex={-1} className={styles.feedback}><Feedback tone={saveError ? 'error' : 'success'} title={saveError ? 'Não foi possível vincular' : undefined}>{saveError || success}</Feedback></div>}
      <div className={styles.linkBar}>
        <div className={styles.kindSwitch} role="group" aria-label="Tipo de registro"><Button variant={kind === 'consultas' ? 'primary' : 'secondary'} aria-pressed={kind === 'consultas'} disabled={saving} onClick={() => changeKind('consultas')}>Consultas ({counts.consultas})</Button><Button variant={kind === 'caixa' ? 'primary' : 'secondary'} aria-pressed={kind === 'caixa'} disabled={saving} onClick={() => changeKind('caixa')}>Caixa ({counts.caixa})</Button></div>
        <Field id="link_clinic" label="Vincular à clínica" error={clinicError}><select value={clinicId} disabled={saving} onChange={event => changeClinic(event.target.value)}><option value="">Selecione a clínica</option>{clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></Field>
        <Button type="submit" busy={saving} disabled={!records.length}>{saving ? 'Vinculando…' : `Vincular ${plural(chosen.length, 'selecionado', 'selecionados')}`}</Button>
      </div>
      {records.length ? <PagedList records={records} label="Registros sem clínica" pageSize={8} pageKey="pagina">{rows => <div className={`${uiStyles.records} ${styles.linkColumns}`}>
        <div className={uiStyles.recordHead}><label className={styles.check}><input type="checkbox" disabled={saving} checked={rows.every(value => chosen.includes(value.id))} onChange={event => toggle(rows.map(value => value.id), event.target.checked)}/><span>Selecionar esta página</span></label><span aria-hidden="true">Data</span><span aria-hidden="true">Detalhes</span><span aria-hidden="true">{kind === 'caixa' ? 'Valor' : 'Situação'}</span></div>
        <ul className={uiStyles.recordList}>{rows.map(value => <li key={value.id}>
          <label className={styles.check}><input type="checkbox" disabled={saving} checked={chosen.includes(value.id)} onChange={event => toggle([value.id], event.target.checked)}/><span>{value.title}</span></label>
          <dl><div><dt>Data</dt><dd>{value.date}</dd></div><div><dt>Detalhes</dt><dd>{value.detail}</dd></div><div><dt>{kind === 'caixa' ? 'Valor' : 'Situação'}</dt><dd>{kind === 'caixa' ? `${value.note} · ${money(value.amountCents)}` : value.note}</dd></div></dl>
        </li>)}</ul></div>}</PagedList> : <EmptyState title="Nenhum registro sem clínica" detail={kind === 'caixa' ? 'Todas as movimentações de caixa estão vinculadas.' : 'Todas as consultas estão vinculadas.'} action={<ActionLink variant="secondary" to="/administracao">Voltar à administração</ActionLink>}/>}
    </form>}
  </>;
}
