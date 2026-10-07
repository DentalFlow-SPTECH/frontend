import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActionLink, Button, EmptyState, Feedback, Field, HistoryList, LoadingState, PageHeader, StatusLabel, uiStyles } from '../../../component/ui.jsx';
import styles from './admin.module.css';
import { modules, operations, profiles, fieldKeys, labels } from '../model/admin_model.js';
import { useAdminViewModel, useUserDetailViewModel, useUserFormViewModel } from '../view_model/use_admin_view_model.js';
function ReadError({ message, retry }) { return <Feedback tone="error" title="Não foi possível carregar"><p>{message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></Feedback>; }
function MissingUser() { return <><PageHeader title="Usuário não encontrado"/><EmptyState title="Este cadastro não está disponível" detail="Volte à administração para consultar os usuários." action={<ActionLink to="/administracao">Voltar à administração</ActionLink>}/></>; }
function timestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(date);
}
function AuditList({ entries }) {
    return entries.length ? <ul className={styles.auditList}>{[...entries].reverse().map(entry => <li key={entry.id}><dl><div><dt>Usuário</dt><dd>{entry.actor}</dd></div><div><dt>Data/hora</dt><dd><time dateTime={entry.date}>{timestamp(entry.date)}</time></dd></div><div><dt>Ação realizada</dt><dd>{entry.action}</dd></div><div><dt>Registro afetado</dt><dd>{entry.recordPath ? <Link to={entry.recordPath}>{entry.record}</Link> : entry.record}</dd></div></dl></li>)}</ul> : <p className={uiStyles.muted}>Nenhuma ação registrada até o momento.</p>;
}
function PermissionSummary({ permissions }) {
    return permissions.length ? <dl className={styles.permissionSummary}>{modules.map(module => {
            const enabled = operations.filter(operation => permissions.includes(`${module.key}:${operation.key}`));
            return enabled.length > 0 && <div key={module.key}><dt>{module.label}</dt><dd>{enabled.map(operation => operation.label).join(', ')}</dd></div>;
        })}</dl> : <p className={uiStyles.muted}>Nenhuma permissão configurada.</p>;
}
export function AdminPage() {
    const { data, clearFilters, query, status, search, resource, filtered, filter } = useAdminViewModel();
    return <>
    <PageHeader title="Administração" description="Consulte usuários, configure permissões e acompanhe as ações registradas." action={<ActionLink to={`/administracao/novo${search}`}>Cadastrar usuário</ActionLink>}/>
    <section className={styles.section} aria-labelledby="admin_users"><div className={styles.sectionHeading}><h2 id="admin_users">Usuários</h2>{(query || status) && filtered.length > 0 && <Button variant="quiet" onClick={() => clearFilters()}>Limpar filtros</Button>}</div>
      <div className={styles.filters}><Field id="user_search" label="Buscar usuário"><input type="search" value={query} onChange={event => filter('q', event.target.value)} placeholder="Nome, login, e-mail ou perfil"/></Field><Field id="user_status_filter" label="Status do usuário"><select value={status} onChange={event => filter('status', event.target.value)}><option value="">Todos</option><option value="active">Ativos</option><option value="blocked">Bloqueados</option></select></Field></div>
      {resource.busy ? <LoadingState /> : resource.error ? <ReadError message={resource.error} retry={resource.retry}/> : filtered.length ? <><p className={styles.count} role="status">{filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}</p><ul className={styles.users}>{filtered.map(user => <li key={user.id}><div><h3><Link to={`/administracao/${user.id}${search}`}>{user.name}</Link></h3><p>{user.login || 'Login não informado'}</p></div><dl><div><dt>Perfil de acesso</dt><dd>{user.profile || 'Não informado'}</dd></div>{user.email && <div><dt>E-mail</dt><dd>{user.email}</dd></div>}</dl><StatusLabel tone={user.blocked ? 'warning' : 'success'}>{user.blocked ? 'Bloqueado' : 'Ativo'}</StatusLabel></li>)}</ul></> : <EmptyState title={query || status ? 'Nenhum usuário encontrado' : 'Ainda não há usuários'} detail={query || status ? 'Altere os filtros para consultar outros registros.' : 'Cadastre os usuários da clínica e configure suas permissões.'} action={query || status ? <Button variant="secondary" onClick={() => clearFilters()}>Limpar filtros</Button> : <ActionLink to="/administracao/novo">Cadastrar primeiro usuário</ActionLink>}/>}
    </section>
    {!resource.busy && !resource.error && <section className={styles.section} aria-labelledby="admin_audit"><h2 id="admin_audit">Auditoria de ações</h2><AuditList entries={data.audit}/></section>}
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
