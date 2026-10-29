import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Clock, Eye, EyeOff, IdCard, MapPin, Pencil, Phone, Plus, Search, Sparkles, Stethoscope, UserCog, UserPlus } from 'lucide-react';
import { AddressFields, Alert, Avatar, Badge, ButtonLink, Card, Combobox, DefinitionList, EmptyState, ErrorState, Field, FormGrid, FormPage, Input, ListHeader, PageHeader, Paginated, Skeleton } from '../../../component/ui/index.js';
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
        columns={['Dentista', 'Celular']} noun="dentistas"
        renderItem={item => <>
            <Avatar name={item.name}/>
            <span className={styles.itemText}><b>{item.name}</b><small>{[item.specialty, item.cro].filter(Boolean).join(' · ')}</small></span>
            <span className={styles.itemMeta}>{item.phone && <><span className="sr-only">Celular: </span>{maskPhone(item.phone)}</>}</span>
        </>}
        editTo={item => `/clinica/dentistas/${item.id}/editar`}/>;
}

export function ProcedureListPage() {
    const vm = useCatalogViewModel('procedures');
    return <CatalogPage vm={vm} title="Procedimentos" back="/clinica" newTo="/clinica/procedimentos/novo" newLabel="Novo procedimento" searchLabel="Buscar procedimento" emptyIcon={Sparkles}
        columns={['Procedimento', { label: 'Preço', end: true }]} noun="procedimentos"
        renderItem={item => <>
            <span className={styles.itemIcon}><Sparkles aria-hidden="true"/></span>
            <span className={styles.itemText}><b>{item.name}</b><small>{item.durationMinutes ? `${item.durationMinutes} min` : 'Duração não informada'}</small></span>
            <span className={styles.itemPrice}>{item.price !== null && item.price !== undefined ? brl(item.price) : <Badge>Sem preço</Badge>}</span>
        </>}
        editTo={item => `/clinica/procedimentos/${item.id}/editar`}/>;
}

function CatalogPage({ vm, title, back, newTo, newLabel, searchLabel, emptyIcon, columns, noun, renderItem, editTo }) {
    return <>
        <PageHeader title={title} subtitle={vm.loading ? 'Carregando…' : `${vm.total} ${vm.total === 1 ? 'cadastrado' : 'cadastrados'}`} back={{ to: back, label: 'Clínica' }}
            actions={vm.canEdit && <ButtonLink to={newTo} icon={Plus}>{newLabel}</ButtonLink>}/>
        {!vm.canEdit && <div className={styles.readOnly}><Alert tone="info">Somente o dentista responsável pode cadastrar ou alterar. Aqui você consulta os dados.</Alert></div>}
        {vm.total > 6 && <div className={styles.search}><Input icon={Search} value={vm.term} onChange={event => vm.setTerm(event.target.value)} placeholder={searchLabel} aria-label={searchLabel}/></div>}
        {vm.error && !vm.total ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.loading ? <Skeleton rows={5}/>
            : !vm.items.length ? <EmptyState icon={emptyIcon} title={vm.total ? 'Nada encontrado' : `Nenhum cadastro em ${title.toLowerCase()}`} action={vm.canEdit && !vm.total && <ButtonLink to={newTo} icon={Plus}>{newLabel}</ButtonLink>}/>
            : <Paginated pager={vm.pager} noun={noun}><div className={styles.items}>
                <ListHeader className={vm.canEdit ? styles.itemHead : styles.itemHeadRead} columns={['', ...columns, ...(vm.canEdit ? [''] : [])]}/>
                <ul className={styles.itemList}>
                    {vm.items.map(item => <li key={item.id}>
                        {vm.canEdit
                            ? <Link to={editTo(item)} className={styles.item} aria-label={`Editar ${item.name}`}>{renderItem(item)}<Pencil aria-hidden="true" className={styles.itemAction}/></Link>
                            : <div className={styles.item}>{renderItem(item)}</div>}
                    </li>)}
                </ul>
            </div></Paginated>}
    </>;
}

// Formulário de um cartão só: os campos ficam no Card, centralizados pela coluna do FormPage.
function FormShell({ children, ...props }) {
    return <FormPage {...props}><Card>{children}</Card></FormPage>;
}

const bind = (vm, field, props = {}) => <Input value={vm.form[field]} onChange={event => vm.change(field, event.target.value)} {...props}/>;

export function ClinicFormPage() {
    const vm = useClinicFormViewModel();
    return <FormPage title="Dados da clínica" back={{ to: '/clinica', label: 'Clínica' }} vm={vm} submitLabel="Salvar dados">
        {vm.form && <>
            <Card title={<span className={styles.sectionTitle}><Building2 aria-hidden="true"/>Clínica</span>}>
                <FormGrid>
                    <Field label="Nome da clínica" error={vm.errors.name} className="full">{bind(vm, 'name', { maxLength: 100 })}</Field>
                    <Field label="CNPJ" optional error={vm.errors.cnpj}>{bind(vm, 'cnpj', { inputMode: 'numeric', placeholder: '00.000.000/0000-00' })}</Field>
                    <Field label="Telefone" optional error={vm.errors.phone}>{bind(vm, 'phone', { inputMode: 'tel', placeholder: '(00) 0000-0000' })}</Field>
                </FormGrid>
            </Card>
            <Card title={<span className={styles.sectionTitle}><MapPin aria-hidden="true"/>Endereço</span>}>
                <AddressFields form={vm.form} errors={vm.errors} cep={vm.cep} onChange={vm.change} withCity required={false}/>
            </Card>
        </>}
    </FormPage>;
}

export function DentistFormPage() {
    const vm = useDentistFormViewModel();
    return <FormShell title={vm.editing ? 'Editar dentista' : 'Novo dentista'} back={{ to: '/clinica/dentistas', label: 'Dentistas' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar dentista'}>
        {vm.form && <FormGrid>
            <Field label="Nome" error={vm.errors.name} className="full" hint="Do jeito que deve aparecer na agenda.">{bind(vm, 'name', { maxLength: 100 })}</Field>
            <Field label="CRO" error={vm.errors.cro}>{bind(vm, 'cro', { maxLength: 20, placeholder: 'CRO-UF-00000' })}</Field>
            <Field label="Especialidade" optional error={vm.errors.specialty}>{bind(vm, 'specialty', { maxLength: 50 })}</Field>
            <Field label="Celular" optional error={vm.errors.phone}>{bind(vm, 'phone', { inputMode: 'tel' })}</Field>
        </FormGrid>}
    </FormShell>;
}

export function ProcedureFormPage() {
    const vm = useProcedureFormViewModel();
    return <FormShell title={vm.editing ? 'Editar procedimento' : 'Novo procedimento'} back={{ to: '/clinica/procedimentos', label: 'Procedimentos' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar procedimento'}>
        {vm.form && <FormGrid>
            <Field label="Nome" error={vm.errors.name} className="full">{bind(vm, 'name', { maxLength: 100 })}</Field>
            <Field label="Preço" optional error={vm.errors.price} hint="Usado como valor sugerido no mapa do dia.">{bind(vm, 'price', { inputMode: 'decimal', placeholder: '0,00' })}</Field>
            <Field label="Duração em minutos" optional error={vm.errors.durationMinutes} hint="Define o tamanho do cartão na agenda.">{bind(vm, 'durationMinutes', { inputMode: 'numeric', type: 'number', min: 5, step: 5 })}</Field>
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
                <Combobox options={vm.dentistOptions} value={vm.form.dentistId} onChange={value => vm.change('dentistId', value)} placeholder="Digite o nome do dentista"/>
            </Field>}
            <Field label="Usuário para entrar" error={vm.errors.login} hint="Sem espaços. A pessoa usa este nome para entrar.">{bind(vm, 'login', { maxLength: 50, autoComplete: 'off', autoCapitalize: 'none', spellCheck: false })}</Field>
            <Field label="Senha inicial" error={vm.errors.password} hint="Pelo menos 6 caracteres.">
                <Input type={vm.showPassword ? 'text' : 'password'} value={vm.form.password} onChange={event => vm.change('password', event.target.value)} autoComplete="new-password"
                    trailing={<button type="button" onClick={vm.togglePassword} aria-label={vm.showPassword ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={vm.showPassword}>{vm.showPassword ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}</button>}/>
            </Field>
        </FormGrid>}
        <p className={styles.note}><UserPlus aria-hidden="true"/>Ainda não é possível listar, editar ou desativar acessos: a API só permite criar.</p>
    </FormShell>;
}
