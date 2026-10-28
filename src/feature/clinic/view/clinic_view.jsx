import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Clock, Eye, EyeOff, IdCard, MapPin, Pencil, Phone, Plus, Search, Sparkles, Stethoscope, UserCog, UserPlus } from 'lucide-react';
import { Alert, Avatar, Badge, Button, ButtonLink, Card, DefinitionList, EmptyState, ErrorState, Field, FormGrid, Input, PageHeader, Select, Skeleton } from '../../../component/ui/index.js';
import { brl, maskCnpj, maskPhone } from '../../../component/format.js';
import { useCatalogViewModel, useClinicFormViewModel, useClinicHubViewModel, useDentistFormViewModel, useProcedureFormViewModel, useUserFormViewModel } from '../view_model/use_clinic_view_models.js';
import styles from './clinic.module.css';

export function ClinicPage() {
    const vm = useClinicHubViewModel();
    if (vm.error && !vm.data)
        return <><PageHeader title="Clínica"/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.data)
        return <><PageHeader title="Clínica"/><Skeleton rows={3} height={120}/></>;
    const { clinic, dentists, procedures } = vm.data;
    return <>
        <PageHeader title="Clínica" subtitle={clinic.name} actions={vm.canEdit && <ButtonLink to="/clinica/editar" variant="secondary" icon={Pencil}>Editar dados</ButtonLink>}/>
        <div className={styles.hub}>
            <Card title="Dados da clínica" className={styles.clinicCard}>
                <DefinitionList items={[
                    { icon: Building2, label: 'Nome', value: clinic.name },
                    { icon: IdCard, label: 'CNPJ', value: clinic.cnpj && maskCnpj(clinic.cnpj) },
                    { icon: MapPin, label: 'Endereço', value: clinic.address },
                    { icon: Phone, label: 'Telefone', value: clinic.phone && maskPhone(clinic.phone) },
                ]}/>
            </Card>
            <nav className={styles.links} aria-label="Cadastros da clínica">
                <HubLink to="/clinica/dentistas" icon={Stethoscope} title="Dentistas" detail={`${dentists.length} ${dentists.length === 1 ? 'cadastrado' : 'cadastrados'}`}/>
                <HubLink to="/clinica/procedimentos" icon={Sparkles} title="Procedimentos" detail={`${procedures.length} com preço e duração`}/>
                {vm.canEdit && <HubLink to="/clinica/usuarios/novo" icon={UserCog} title="Criar acesso" detail="Usuário e senha para recepção ou dentista"/>}
            </nav>
        </div>
    </>;
}

function HubLink({ to, icon: Icon, title, detail }) {
    return <Link to={to} className={styles.hubLink}><span className={styles.hubIcon}><Icon aria-hidden="true"/></span><span><b>{title}</b><small>{detail}</small></span><ChevronRight aria-hidden="true"/></Link>;
}

export function DentistListPage() {
    const vm = useCatalogViewModel('dentists');
    return <CatalogPage vm={vm} title="Dentistas" back="/clinica" newTo="/clinica/dentistas/novo" newLabel="Novo dentista" searchLabel="Buscar por nome, CRO ou especialidade" emptyIcon={Stethoscope}
        renderItem={item => <>
            <Avatar name={item.name}/>
            <span className={styles.itemText}><b>{item.name}</b><small>{[item.specialty, item.cro].filter(Boolean).join(' · ')}</small></span>
            <span className={styles.itemMeta}>{item.phone ? maskPhone(item.phone) : ''}</span>
        </>}
        editTo={item => `/clinica/dentistas/${item.id}/editar`}/>;
}

export function ProcedureListPage() {
    const vm = useCatalogViewModel('procedures');
    return <CatalogPage vm={vm} title="Procedimentos" back="/clinica" newTo="/clinica/procedimentos/novo" newLabel="Novo procedimento" searchLabel="Buscar procedimento" emptyIcon={Sparkles}
        renderItem={item => <>
            <span className={styles.itemIcon}><Sparkles aria-hidden="true"/></span>
            <span className={styles.itemText}><b>{item.name}</b><small>{item.durationMinutes ? `${item.durationMinutes} min` : 'Duração não informada'}</small></span>
            <span className={styles.itemPrice}>{item.price !== null && item.price !== undefined ? brl(item.price) : <Badge>Sem preço</Badge>}</span>
        </>}
        editTo={item => `/clinica/procedimentos/${item.id}/editar`}/>;
}

function CatalogPage({ vm, title, back, newTo, newLabel, searchLabel, emptyIcon, renderItem, editTo }) {
    return <>
        <PageHeader title={title} subtitle={vm.loading ? 'Carregando…' : `${vm.total} ${vm.total === 1 ? 'cadastrado' : 'cadastrados'}`} back={{ to: back, label: 'Clínica' }}
            actions={vm.canEdit && <ButtonLink to={newTo} icon={Plus}>{newLabel}</ButtonLink>}/>
        {!vm.canEdit && <div className={styles.readOnly}><Alert tone="info">Somente o dentista responsável pode cadastrar ou alterar. Aqui você consulta os dados.</Alert></div>}
        {vm.total > 6 && <div className={styles.search}><Input icon={Search} value={vm.term} onChange={event => vm.setTerm(event.target.value)} placeholder={searchLabel} aria-label={searchLabel}/></div>}
        {vm.error && !vm.total ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.loading ? <Skeleton rows={5}/>
            : !vm.items.length ? <EmptyState icon={emptyIcon} title={vm.total ? 'Nada encontrado' : `Nenhum cadastro em ${title.toLowerCase()}`} action={vm.canEdit && !vm.total && <ButtonLink to={newTo} icon={Plus}>{newLabel}</ButtonLink>}/>
            : <ul className={styles.items}>
                {vm.items.map(item => <li key={item.id}>
                    {vm.canEdit
                        ? <Link to={editTo(item)} className={styles.item} aria-label={`Editar ${item.name}`}>{renderItem(item)}<Pencil aria-hidden="true" className={styles.itemAction}/></Link>
                        : <div className={styles.item}>{renderItem(item)}</div>}
                </li>)}
            </ul>}
    </>;
}

function FormShell({ title, back, vm, children, submitLabel }) {
    if (vm.error && !vm.form)
        return <><PageHeader title={title} back={back}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.form)
        return <><PageHeader title={title} back={back}/><Skeleton rows={2} height={150}/></>;
    return <>
        <PageHeader title={title} back={back}/>
        <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            {vm.failure && <Alert tone="danger" title="Não foi possível salvar">{vm.failure}</Alert>}
            <Card>{children}</Card>
            <div className={styles.footer}>
                <ButtonLink to={back.to} variant="secondary">Cancelar</ButtonLink>
                <Button type="submit" size="lg" busy={vm.busy}>{submitLabel}</Button>
            </div>
        </form>
    </>;
}

const bind = (vm, field, props = {}) => <Input value={vm.form[field]} onChange={event => vm.change(field, event.target.value)} {...props}/>;

export function ClinicFormPage() {
    const vm = useClinicFormViewModel();
    return <FormShell title="Dados da clínica" back={{ to: '/clinica', label: 'Clínica' }} vm={vm} submitLabel="Salvar dados">
        {vm.form && <FormGrid>
            <Field label="Nome da clínica" error={vm.errors.name} className="full">{bind(vm, 'name', { maxLength: 100 })}</Field>
            <Field label="CNPJ" optional error={vm.errors.cnpj}>{bind(vm, 'cnpj', { inputMode: 'numeric', placeholder: '00.000.000/0000-00' })}</Field>
            <Field label="Telefone" optional error={vm.errors.phone}>{bind(vm, 'phone', { inputMode: 'tel', placeholder: '(11) 3333-4444' })}</Field>
            <Field label="Endereço" optional error={vm.errors.address} className="full">{bind(vm, 'address', { maxLength: 150 })}</Field>
        </FormGrid>}
    </FormShell>;
}

export function DentistFormPage() {
    const vm = useDentistFormViewModel();
    return <FormShell title={vm.editing ? 'Editar dentista' : 'Novo dentista'} back={{ to: '/clinica/dentistas', label: 'Dentistas' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar dentista'}>
        {vm.form && <FormGrid>
            <Field label="Nome" error={vm.errors.name} className="full" hint="Como aparece na agenda, por exemplo: Dra. Ana Lima.">{bind(vm, 'name', { maxLength: 100 })}</Field>
            <Field label="CRO" error={vm.errors.cro}>{bind(vm, 'cro', { maxLength: 20, placeholder: 'CRO-SP-12345' })}</Field>
            <Field label="Especialidade" optional error={vm.errors.specialty}>{bind(vm, 'specialty', { maxLength: 50, placeholder: 'Ortodontia' })}</Field>
            <Field label="Celular" optional error={vm.errors.phone}>{bind(vm, 'phone', { inputMode: 'tel' })}</Field>
        </FormGrid>}
    </FormShell>;
}

export function ProcedureFormPage() {
    const vm = useProcedureFormViewModel();
    return <FormShell title={vm.editing ? 'Editar procedimento' : 'Novo procedimento'} back={{ to: '/clinica/procedimentos', label: 'Procedimentos' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar procedimento'}>
        {vm.form && <FormGrid>
            <Field label="Nome" error={vm.errors.name} className="full">{bind(vm, 'name', { maxLength: 100, placeholder: 'Limpeza' })}</Field>
            <Field label="Preço" optional error={vm.errors.price} hint="Usado como valor sugerido no mapa do dia.">{bind(vm, 'price', { inputMode: 'decimal', placeholder: '180,00' })}</Field>
            <Field label="Duração em minutos" optional error={vm.errors.durationMinutes} hint="Define o tamanho do cartão na agenda.">{bind(vm, 'durationMinutes', { inputMode: 'numeric', type: 'number', min: 5, step: 5, placeholder: '60' })}</Field>
        </FormGrid>}
        <p className={styles.note}><Clock aria-hidden="true"/>Sem duração, a agenda considera 30 minutos.</p>
    </FormShell>;
}

export function UserFormPage() {
    const vm = useUserFormViewModel();
    return <FormShell title="Criar acesso" back={{ to: '/clinica', label: 'Clínica' }} vm={vm} submitLabel="Criar acesso">
        {vm.form && <FormGrid>
            <Field label="Nome da pessoa" error={vm.errors.name} className="full">{bind(vm, 'name', { maxLength: 100, autoComplete: 'off' })}</Field>
            <div className={`full ${styles.roles}`} role="radiogroup" aria-label="Perfil de acesso">
                {[['RECEPCIONISTA', 'Recepção', 'Agenda, pacientes e consultas'], ['DENTISTA', 'Dentista', 'Tudo da recepção, mais painel, mapa do dia, estoque e cadastros']].map(([value, label, detail]) =>
                    <button key={value} type="button" role="radio" aria-checked={vm.form.accessLevel === value} className={styles.role} onClick={() => vm.change('accessLevel', value)}>
                        <b>{label}</b><small>{detail}</small>
                    </button>)}
            </div>
            {vm.form.accessLevel === 'DENTISTA' && <Field label="Dentista" error={vm.errors.dentistId} className="full" hint="Cada dentista pode ter um único acesso.">
                <Select value={vm.form.dentistId} onChange={event => vm.change('dentistId', event.target.value)}>
                    <option value="">Escolha o dentista</option>
                    {vm.dentists.map(dentist => <option key={dentist.id} value={dentist.id}>{dentist.name}</option>)}
                </Select>
            </Field>}
            <Field label="Usuário para entrar" error={vm.errors.login} hint="Sem espaços. Ex.: carla">{bind(vm, 'login', { maxLength: 50, autoComplete: 'off', autoCapitalize: 'none', spellCheck: false })}</Field>
            <Field label="Senha inicial" error={vm.errors.password} hint="Pelo menos 6 caracteres.">
                <Input type={vm.showPassword ? 'text' : 'password'} value={vm.form.password} onChange={event => vm.change('password', event.target.value)} autoComplete="new-password"
                    trailing={<button type="button" onClick={vm.togglePassword} aria-label={vm.showPassword ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={vm.showPassword}>{vm.showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}</button>}/>
            </Field>
        </FormGrid>}
        <p className={styles.note}><UserPlus aria-hidden="true"/>Ainda não é possível listar, editar ou desativar acessos: a API só permite criar.</p>
    </FormShell>;
}
