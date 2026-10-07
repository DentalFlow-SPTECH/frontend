const uid = () => crypto.randomUUID();
export function saveUserModel(current, input, id) {
    const existing = id ? current.users.find(value => value.id === id) : undefined;
    if (id && !existing)
        throw new Error('Este usuário não está disponível. Seu preenchimento foi mantido.');
    if (!input.name.trim())
        throw new Error('Informe o nome do usuário.');
    const allowedModules = ['agenda', 'pacientes', 'orcamentos', 'estoque', 'doutores', 'caixa', 'administracao'];
    const allowedOperations = ['visualizar', 'criar', 'alterar', 'excluir'];
    if (input.permissions.some(permission => { const [module, operation] = permission.split(':'); return !allowedModules.includes(module) || !allowedOperations.includes(operation); }))
        throw new Error('Revise as permissões selecionadas.');
    const permissions = [...new Set(input.permissions)];
    if (existing && ['name', 'email', 'phone', 'login', 'profile'].every(key => (key === 'name' ? input.name.trim() : input[key]) === existing[key]) && [...existing.permissions].sort().join(',') === [...permissions].sort().join(','))
        return { value: existing };
    const user = { ...input, name: input.name.trim(), permissions, id: existing?.id ?? uid(), blocked: existing?.blocked ?? false, history: [...(existing?.history ?? []), { id: uid(), date: new Date().toISOString(), actor: 'Você', description: existing ? 'Cadastro e permissões do usuário atualizados.' : 'Usuário cadastrado.' }] };
    const change = { data: { ...current, users: existing ? current.users.map(value => value.id === user.id ? user : value) : [...current.users, user] }, action: existing ? 'Usuário atualizado' : 'Usuário cadastrado', record: user.name, recordPath: `/administracao/${user.id}` };
    return { ...change, value: user };
}
export function setUserBlockedModel(current, id, blocked) {
    const existing = current.users.find(value => value.id === id);
    if (!existing)
        throw new Error('Este usuário não está disponível.');
    if (existing.blocked === blocked)
        return { value: existing };
    const action = blocked ? 'Usuário bloqueado' : 'Usuário reativado';
    const user = { ...existing, blocked, history: [...existing.history, { id: uid(), date: new Date().toISOString(), actor: 'Você', description: `${action}.` }] };
    const change = { data: { ...current, users: current.users.map(value => value.id === id ? user : value) }, action: action, record: user.name, recordPath: `/administracao/${user.id}` };
    return { ...change, value: user };
}
export const modules = [{ key: 'agenda', label: 'Agenda' }, { key: 'pacientes', label: 'Pacientes' }, { key: 'orcamentos', label: 'Orçamentos' }, { key: 'estoque', label: 'Estoque' }, { key: 'doutores', label: 'Doutores' }, { key: 'caixa', label: 'Caixa' }, { key: 'administracao', label: 'Administração' }];
export const operations = [{ key: 'visualizar', label: 'Visualizar' }, { key: 'criar', label: 'Criar' }, { key: 'alterar', label: 'Alterar' }, { key: 'excluir', label: 'Excluir' }];
export const profiles = ['Administrador', 'Recepção', 'Financeiro', 'Doutor'];
export const emptyUser = { name: '', email: '', phone: '', login: '', profile: '', permissions: [] };
export const fieldKeys = ['name', 'email', 'phone', 'login', 'profile'];
export const labels = { name: 'Nome completo', email: 'E-mail', phone: 'Telefone', login: 'Usuário/login', profile: 'Perfil de acesso' };
