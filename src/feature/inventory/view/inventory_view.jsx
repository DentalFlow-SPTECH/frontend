import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Cog, Package, PackagePlus, Pencil, Plus, Scale, Search } from 'lucide-react';
import { Alert, Badge, Button, ButtonLink, Card, Checkbox, Chips, EmptyState, ErrorState, Field, FormGrid, Input, PageHeader, Panel, Segmented, Select, Skeleton, Stat, Textarea } from '../../../component/ui/index.js';
import { brl, numberLabel } from '../../../component/format.js';
import { stockLevel, units, usagePercent } from '../model/inventory_model.js';
import { useEquipmentFormViewModel, useInventoryViewModel, useProductDetailViewModel, useProductFormViewModel } from '../view_model/use_inventory_view_models.js';
import styles from './inventory.module.css';

const levelBadge = { empty: ['danger', 'Em falta'], low: ['warning', 'Abaixo do mínimo'], ok: ['success', 'Em dia'] };

export function InventoryPage() {
    const vm = useInventoryViewModel();
    const materials = vm.tab === 'materiais';
    return <>
        <PageHeader title="Estoque" subtitle="Materiais e equipamentos da clínica"
            actions={<ButtonLink to={materials ? '/estoque/materiais/novo' : '/estoque/equipamentos/novo'} icon={Plus}>{materials ? 'Novo material' : 'Novo equipamento'}</ButtonLink>}/>
        <div className={styles.toolbar}>
            <Segmented label="Tipo" options={[{ value: 'materiais', label: 'Materiais' }, { value: 'equipamentos', label: 'Equipamentos' }]} value={vm.tab} onChange={vm.setTab}/>
            <Chips label="Situação" options={[{ value: '1', label: 'Ativos' }, { value: '', label: 'Todos' }]} value={vm.onlyActive ? '1' : ''} onChange={value => vm.setOnlyActive(Boolean(value))}/>
            {vm.total > 6 && <div className={styles.search}><Input icon={Search} value={vm.term} onChange={event => vm.setTerm(event.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome"/></div>}
        </div>
        {vm.lowCount > 0 && <div className={styles.notice}><Alert tone="warning" title={vm.lowCount === 1 ? '1 material precisa de reposição' : `${vm.lowCount} materiais precisam de reposição`}>Estão em falta ou abaixo do estoque mínimo.</Alert></div>}
        {vm.error && !vm.total ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.loading ? <Skeleton rows={5}/>
            : !vm.items.length ? <EmptyState icon={materials ? Package : Cog} title={vm.total ? 'Nada encontrado' : materials ? 'Nenhum material cadastrado' : 'Nenhum equipamento cadastrado'}
                action={!vm.total && <ButtonLink to={materials ? '/estoque/materiais/novo' : '/estoque/equipamentos/novo'} icon={Plus}>{materials ? 'Cadastrar material' : 'Cadastrar equipamento'}</ButtonLink>}/>
            : materials ? <ul className={styles.items}>
                {vm.items.map(item => {
                    const [tone, label] = levelBadge[stockLevel(item)];
                    return <li key={item.id}><Link to={`/estoque/materiais/${item.id}`} className={styles.item}>
                        <span className={styles.icon}><Package aria-hidden="true"/></span>
                        <span className={styles.text}><b>{item.name}</b><small>{brl(item.unitCost)} por {item.unit.toLowerCase()}{!item.active && ' · inativo'}</small></span>
                        <span className={styles.stock}><b>{numberLabel(item.currentStock)}</b><small>{item.unit.toLowerCase()} · mín. {numberLabel(item.minimumStock)}</small></span>
                        <Badge tone={tone}>{label}</Badge>
                        <ChevronRight aria-hidden="true" className={styles.chevron}/>
                    </Link></li>;
                })}
            </ul>
            : <ul className={styles.items}>
                {vm.items.map(item => <li key={item.id}><Link to={`/estoque/equipamentos/${item.id}/editar`} className={styles.item}>
                    <span className={styles.icon}><Cog aria-hidden="true"/></span>
                    <span className={styles.text}><b>{item.name}</b><small>{item.description || 'Sem descrição'}{!item.active && ' · inativo'}</small></span>
                    <span className={styles.usage}><span className={styles.usageBar}><i style={{ width: `${usagePercent(item)}%` }}/></span><small>{numberLabel(item.completedUses)} de {numberLabel(item.usefulLifeUses)} usos</small></span>
                    <span className={styles.stock}><b>{brl(item.costPerUse)}</b><small>por uso</small></span>
                    <Pencil aria-hidden="true" className={styles.chevron}/>
                </Link></li>)}
            </ul>}
    </>;
}

const movementIcons = { ENTRADA: ArrowDownToLine, SAIDA: ArrowUpFromLine, AJUSTE: Scale };

export function ProductDetailPage() {
    const vm = useProductDetailViewModel();
    if (vm.error && !vm.product)
        return <><PageHeader title="Material" back={{ to: '/estoque', label: 'Estoque' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.product)
        return <><PageHeader title="Material" back={{ to: '/estoque', label: 'Estoque' }}/><Skeleton rows={3} height={110}/></>;
    const { product } = vm;
    const [tone, label] = levelBadge[stockLevel(product)];
    const unit = product.unit.toLowerCase();
    return <>
        <PageHeader title={product.name} back={{ to: '/estoque', label: 'Estoque' }} actions={<ButtonLink to={`/estoque/materiais/${product.id}/editar`} variant="secondary" icon={Pencil}>Editar</ButtonLink>}/>
        {!product.active && <div className={styles.notice}><Alert tone="info">Material inativo: não aceita movimentações até ser reativado.</Alert></div>}
        <div className={styles.stats}>
            <Stat icon={Package} tone={tone === 'success' ? 'success' : tone} label="Em estoque" value={`${numberLabel(product.currentStock)} ${unit}`} hint={label}/>
            <Stat icon={Scale} tone="info" label="Estoque mínimo" value={`${numberLabel(product.minimumStock)} ${unit}`}/>
            <Stat icon={PackagePlus} tone="primary" label="Custo unitário" value={brl(product.unitCost)} hint={`Total em estoque: ${brl(Number(product.unitCost) * Number(product.currentStock))}`}/>
        </div>
        {product.active && <div className={styles.moveActions}>
            <Button icon={ArrowDownToLine} onClick={() => vm.open('ENTRADA')}>Registrar entrada</Button>
            <Button variant="secondary" icon={ArrowUpFromLine} onClick={() => vm.open('SAIDA')}>Registrar saída</Button>
            <Button variant="ghost" icon={Scale} onClick={() => vm.open('AJUSTE')}>Ajustar contagem</Button>
        </div>}
        <Card title="Movimentações">
            {!vm.movements.length ? <p className={styles.muted}>Nenhuma movimentação ainda.</p>
                : <ul className={styles.history}>
                    {vm.movements.map(item => {
                        const Icon = movementIcons[item.type] ?? Scale;
                        return <li key={item.id}>
                            <span className={styles.moveIcon} data-type={item.type}><Icon aria-hidden="true"/></span>
                            <span className={styles.text}><b>{vm.movementTypes[item.type]?.label ?? item.type} de {numberLabel(item.quantity)} {unit}</b><small>{item.reason || 'Sem motivo informado'}</small></span>
                            <span className={styles.when}>{new Date(item.occurredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}<small>{brl(item.unitCostAtTime)} / {unit}</small></span>
                        </li>;
                    })}
                </ul>}
        </Card>
        <Panel open={Boolean(vm.movement)} onOpenChange={open => { if (!open) vm.close(); }} title={vm.movement ? vm.movementTypes[vm.movement.type].label : ''}
            footer={vm.movement && <Button size="lg" block busy={vm.busy} onClick={vm.submit}>Registrar {vm.movementTypes[vm.movement.type].label.toLowerCase()}</Button>}>
            {vm.movement && <div className={styles.moveForm}>
                <p className={styles.muted}>{vm.movementTypes[vm.movement.type].hint} Hoje há {numberLabel(product.currentStock)} {unit}.</p>
                {vm.failure && <Alert tone="danger">{vm.failure}</Alert>}
                <Segmented full label="Tipo de movimentação" value={vm.movement.type} onChange={value => vm.change('type', value)} options={Object.entries(vm.movementTypes).map(([value, item]) => ({ value, label: item.label }))}/>
                <Field label={vm.movement.type === 'AJUSTE' ? `Quantidade contada (${unit})` : `Quantidade (${unit})`} error={vm.errors.quantity}>
                    <Input inputMode="decimal" value={vm.movement.quantity} onChange={event => vm.change('quantity', event.target.value)} autoFocus/>
                </Field>
                <Field label="Motivo" optional error={vm.errors.reason}><Textarea value={vm.movement.reason} maxLength={255} onChange={event => vm.change('reason', event.target.value)} placeholder="Ex.: compra do fornecedor, uso nos atendimentos"/></Field>
            </div>}
        </Panel>
    </>;
}

function InventoryFormShell({ title, back, vm, submitLabel, children }) {
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

export function ProductFormPage() {
    const vm = useProductFormViewModel();
    const input = (field, props = {}) => <Input value={vm.form[field]} onChange={event => vm.change(field, event.target.value)} {...props}/>;
    return <InventoryFormShell title={vm.editing ? 'Editar material' : 'Novo material'} back={{ to: '/estoque', label: 'Estoque' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar material'}>
        {vm.form && <FormGrid>
            <Field label="Nome do material" error={vm.errors.name} className="full">{input('name', { maxLength: 100, placeholder: 'Luva de procedimento' })}</Field>
            <Field label="Unidade" error={vm.errors.unit}>
                <Select value={vm.form.unit} onChange={event => vm.change('unit', event.target.value)}>
                    {[...new Set([...units, vm.form.unit])].map(unit => <option key={unit} value={unit}>{unit.charAt(0) + unit.slice(1).toLowerCase()}</option>)}
                </Select>
            </Field>
            <Field label="Custo por unidade" optional error={vm.errors.unitCost}>{input('unitCost', { inputMode: 'decimal', placeholder: '25,90' })}</Field>
            {!vm.editing && <Field label="Quantidade em estoque agora" optional error={vm.errors.initialStock} hint="Vira a primeira movimentação (ajuste).">{input('initialStock', { inputMode: 'decimal', placeholder: '0' })}</Field>}
            <Field label="Estoque mínimo" optional error={vm.errors.minimumStock} hint="Abaixo disso, o material aparece como reposição.">{input('minimumStock', { inputMode: 'decimal', placeholder: '0' })}</Field>
            <div className="full"><Checkbox label="Material ativo" checked={vm.form.active} onChange={event => vm.change('active', event.target.checked)}/></div>
        </FormGrid>}
        {vm.editing && <p className={styles.muted}>A quantidade em estoque muda só por entrada, saída ou ajuste, na tela do material.</p>}
    </InventoryFormShell>;
}

export function EquipmentFormPage() {
    const vm = useEquipmentFormViewModel();
    const input = (field, props = {}) => <Input value={vm.form[field]} onChange={event => vm.change(field, event.target.value)} {...props}/>;
    return <InventoryFormShell title={vm.editing ? 'Editar equipamento' : 'Novo equipamento'} back={{ to: '/estoque?aba=equipamentos', label: 'Equipamentos' }} vm={vm} submitLabel={vm.editing ? 'Salvar alterações' : 'Cadastrar equipamento'}>
        {vm.form && <FormGrid>
            <Field label="Nome do equipamento" error={vm.errors.name} className="full">{input('name', { maxLength: 100, placeholder: 'Autoclave 21 L' })}</Field>
            <Field label="Descrição" optional className="full">{input('description', { placeholder: 'Sala, marca ou observação' })}</Field>
            <Field label="Valor pago" error={vm.errors.acquisitionValue}>{input('acquisitionValue', { inputMode: 'decimal', placeholder: '8.500,00' })}</Field>
            <Field label="Vida útil (usos)" error={vm.errors.usefulLifeUses} hint="O custo por uso é calculado pela API.">{input('usefulLifeUses', { inputMode: 'numeric', type: 'number', min: 1 })}</Field>
            <Field label="Usos já feitos" optional error={vm.errors.completedUses}>{input('completedUses', { inputMode: 'numeric', type: 'number', min: 0 })}</Field>
            <div className="full"><Checkbox label="Equipamento ativo" checked={vm.form.active} onChange={event => vm.change('active', event.target.checked)}/></div>
        </FormGrid>}
    </InventoryFormShell>;
}
