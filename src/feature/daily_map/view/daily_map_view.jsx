import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Lock, Pencil, Plus, Receipt, Trash2, Users, Wallet } from 'lucide-react';
import { Alert, Badge, Button, ButtonLink, Card, Checkbox, Combobox, ConfirmDialog, EmptyState, ErrorState, Field, FormGrid, IconButton, Input, Page, PageHeader, Select, Skeleton, Stat, Textarea } from '../../../component/ui/index.js';
import { brl, dateLong, dayOfMonth, weekdayShort } from '../../../component/format.js';
import { counters, discounts, paymentCodes, paymentLabels, visitTypes } from '../model/daily_map_model.js';
import { useDailyMapDetailViewModel, useDailyMapFormViewModel, useDailyMapListViewModel } from '../view_model/use_daily_map_view_models.js';
import styles from './daily_map.module.css';

const statusBadge = status => (status === 'FECHADO' ? <Badge tone="success" icon={Lock}>Fechado</Badge> : <Badge tone="warning">Aberto</Badge>);

export function DailyMapListPage() {
    const vm = useDailyMapListViewModel();
    return <>
        <PageHeader title="Mapa do dia" subtitle="Atendimentos, valores e fechamento de cada dia"
            actions={<>
                <div className={styles.month}>
                    <IconButton label="Mês anterior" icon={ChevronLeft} variant="secondary" onClick={vm.previous}/>
                    <span>{vm.periodLabel}</span>
                    <IconButton label="Próximo mês" icon={ChevronRight} variant="secondary" onClick={vm.next} disabled={!vm.canGoNext}/>
                </div>
                <ButtonLink to={vm.todayLink} icon={vm.todayDone ? ClipboardList : Plus}>{vm.todayDone ? 'Abrir mapa de hoje' : 'Lançar mapa de hoje'}</ButtonLink>
            </>}/>
        {vm.error && !vm.maps.length ? <ErrorState error={vm.error} onRetry={vm.reload}/>
            : vm.loading ? <Skeleton rows={4}/>
            : <>
                <div className={styles.stats}>
                    <Stat icon={ArrowDownLeft} tone="success" label="Entradas" value={brl(vm.totals.gross)}/>
                    <Stat icon={ArrowUpRight} tone="danger" label="Descontos e despesas" value={brl(vm.totals.outflows)}/>
                    <Stat icon={Wallet} highlight label="Saldo" value={brl(vm.totals.balance)}/>
                    <Stat icon={Users} tone="info" label="Pacientes" value={vm.totals.patients}/>
                </div>
                {!vm.maps.length ? <EmptyState icon={ClipboardList} title="Nenhum mapa lançado neste mês" action={<ButtonLink to={vm.todayLink} icon={Plus}>Lançar mapa de hoje</ButtonLink>}>Cada mapa reúne os atendimentos, os valores recebidos, os vales e as despesas do dia.</EmptyState>
                    : <ul className={styles.maps}>
                        {vm.maps.map(map => <li key={map.id}><Link to={`/mapa/${map.id}`} className={styles.mapRow}>
                            <span className={styles.dateBox}><small>{weekdayShort(map.date)}</small><b>{dayOfMonth(map.date)}</b></span>
                            <span className={styles.mapText}><b>{map.patientCount} {map.patientCount === 1 ? 'paciente' : 'pacientes'}</b><small>Entradas {brl(map.generalGross)}</small></span>
                            <span className={styles.mapValue}><b>{brl(map.finalBalance)}</b><small>saldo</small></span>
                            {statusBadge(map.status)}
                        </Link></li>)}
                    </ul>}
            </>}
    </>;
}

export function DailyMapDetailPage() {
    const vm = useDailyMapDetailViewModel();
    const back = { to: '/mapa', label: 'Mapa do dia' };
    if (vm.error && !vm.map)
        return <><PageHeader title="Mapa do dia" back={back}/><ErrorState error={vm.error} onRetry={vm.reload}/></>;
    if (vm.loading || !vm.map)
        return <><PageHeader title="Mapa do dia" back={back}/><Skeleton rows={3} height={120}/></>;
    const { map } = vm;
    return <>
        <PageHeader title={vm.title} back={back} subtitle={map.status === 'FECHADO' ? `Conferido${map.closedAt ? ` em ${new Date(map.closedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}` : 'Ainda aberto para ajustes'}
            actions={vm.open && <>
                <ButtonLink to={`/mapa/${map.id}/editar`} variant="secondary" icon={Pencil}>Editar</ButtonLink>
                <Button icon={Lock} onClick={() => vm.setConfirming(true)} disabled={!vm.ready}>Fechar mapa</Button>
            </>}/>
        {vm.open && !vm.ready && <div className={styles.notice}><Alert tone="info" title="Para fechar, confira todos os atendimentos e vales">Use “Editar” e marque cada linha como conferida.</Alert></div>}
        <div className={styles.stats}>
            <Stat icon={ArrowDownLeft} tone="success" label="Entradas" value={brl(map.generalGross)} hint={`Clínico ${brl(map.clinicalTotal)} · Prótese ${brl(map.prosthesisTotal)}`}/>
            <Stat icon={Receipt} tone="warning" label="Descontos e vales" value={brl(map.totalDiscounts)}/>
            <Stat icon={ArrowUpRight} tone="danger" label="Despesas" value={brl(map.totalExpenses)}/>
            <Stat icon={Wallet} highlight label="Saldo do dia" value={brl(map.finalBalance)} hint={`${map.patientCount} ${map.patientCount === 1 ? 'paciente' : 'pacientes'}`}/>
        </div>
        <div className={styles.sections}>
            <Card title={`Atendimentos · ${map.visits.length}`} action={statusBadge(map.status)}>
                {!map.visits.length ? <p className={styles.muted}>Nenhum atendimento lançado.</p>
                    : <ul className={styles.lines}>{map.visits.map(visit => <li key={visit.lineNumber}>
                        <span className={styles.lineNo}>{visit.lineNumber}</span>
                        <span className={styles.mapText}><b>{visit.patientName}</b><small>{[visit.scheduledTime?.slice(0, 5), visitTypes[visit.type], paymentLabels[visit.paymentCode] ?? visit.paymentCode].filter(Boolean).join(' · ')}</small></span>
                        <span className={styles.mapValue}><b>{brl(visit.value)}</b>{visit.checked ? <small className={styles.checked}><CheckCheck aria-hidden="true"/>Conferido</small> : <small>A conferir</small>}</span>
                    </li>)}</ul>}
            </Card>
            {(map.vouchers.length > 0 || map.expenses.length > 0) && <div className={styles.twoCols}>
                <Card title="Vales">{!map.vouchers.length ? <p className={styles.muted}>Sem vales.</p> : <ul className={styles.lines}>{map.vouchers.map((item, index) => <li key={index}><span className={styles.mapText}><b>{item.responsibleName || 'Sem responsável'}</b><small>{item.description}</small></span><span className={styles.mapValue}><b>{brl(item.value)}</b></span></li>)}</ul>}</Card>
                <Card title="Despesas">{!map.expenses.length ? <p className={styles.muted}>Sem despesas.</p> : <ul className={styles.lines}>{map.expenses.map((item, index) => <li key={index}><span className={styles.mapText}><b>{item.description}</b></span><span className={styles.mapValue}><b>{brl(item.value)}</b></span></li>)}</ul>}</Card>
            </div>}
            <Card title="Produção">
                <ul className={styles.counts}>{counters.map(([field, label]) => <li key={field}><b>{map[field]}</b>{label}</li>)}</ul>
                {map.notes && <p className={styles.notes}>{map.notes}</p>}
            </Card>
        </div>
        <ConfirmDialog open={vm.confirming} onOpenChange={vm.setConfirming} tone="primary" title="Fechar o mapa deste dia?" busy={vm.busy} onConfirm={vm.close} confirmLabel="Fechar mapa"
            description="Depois de fechado, o mapa não pode ser editado nem reaberto. Os valores passam a valer no painel do mês."/>
    </>;
}

export function DailyMapFormPage() {
    const vm = useDailyMapFormViewModel();
    const title = vm.editing ? 'Editar mapa do dia' : 'Lançar mapa do dia';
    if (vm.error && !vm.form)
        return <Page width="wide"><PageHeader title={title} back={{ to: vm.backLink, label: 'Voltar' }}/><ErrorState error={vm.error} onRetry={vm.reload}/></Page>;
    if (vm.loading || !vm.form)
        return <Page width="wide"><PageHeader title={title} back={{ to: vm.backLink, label: 'Voltar' }}/><Skeleton rows={3} height={140}/></Page>;
    if (vm.existing)
        return <Page width="wide"><PageHeader title={title} back={{ to: '/mapa', label: 'Mapa do dia' }}/>
            <EmptyState icon={ClipboardList} title={`Já existe um mapa em ${dateLong(vm.date)}`} action={<ButtonLink to={`/mapa/${vm.existing.id}`}>Abrir o mapa</ButtonLink>}>Cada dentista tem um mapa por dia.</EmptyState></Page>;
    const { form, errors } = vm;
    const err = (list, index, field) => errors[`${list}.${index}.${field}`];
    return <Page width="wide">
        <PageHeader title={title} subtitle={dateLong(vm.date)} back={{ to: vm.backLink, label: 'Voltar' }}/>
        <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            {vm.failure && <Alert tone="danger">{vm.failure}</Alert>}
            {!vm.editing && vm.suggested > 0 && <Alert tone="info">Trouxemos {vm.suggested} {vm.suggested === 1 ? 'consulta' : 'consultas'} da sua agenda neste dia, com o valor do procedimento. Ajuste o que for preciso.</Alert>}
            <Card title={`Atendimentos · ${form.visits.length}`} action={form.visits.length > 0 && <Button variant="ghost" size="sm" icon={CheckCheck} onClick={vm.checkAll}>Marcar todos como conferidos</Button>}>
                <p className={styles.help}>Só paciente e valor são obrigatórios. Para fechar o mapa, todas as linhas precisam estar conferidas.</p>
                <div className={styles.rows}>
                    {form.visits.map((visit, index) => <fieldset key={visit.key} className={styles.row}>
                        <legend className="sr-only">Atendimento {index + 1}</legend>
                        <span className={styles.lineNo}>{index + 1}</span>
                        <div className={styles.rowFields}>
                            <Field label="Paciente" error={err('visits', index, 'patientName')}><Input value={visit.patientName} onChange={event => vm.changeRow('visits', index, 'patientName', event.target.value)}/></Field>
                            <Field label="Procedimento" optional>
                                <Combobox options={vm.procedureOptions} value={visit.procedureId} onChange={value => vm.changeRow('visits', index, 'procedureId', value)} placeholder="Buscar procedimento"/>
                            </Field>
                            <Field label="Valor" error={err('visits', index, 'value')}><Input inputMode="decimal" value={visit.value} onChange={event => vm.changeRow('visits', index, 'value', event.target.value)} placeholder="0,00"/></Field>
                            <Field label="Pagamento">
                                <Select value={visit.paymentCode} onChange={event => vm.changeRow('visits', index, 'paymentCode', event.target.value)}>
                                    <option value="">Não informado</option>
                                    {paymentCodes.map(code => <option key={code} value={code}>{paymentLabels[code]}</option>)}
                                </Select>
                            </Field>
                            <Field label="Tipo">
                                <Select value={visit.type} onChange={event => vm.changeRow('visits', index, 'type', event.target.value)}>
                                    {Object.entries(visitTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </Select>
                            </Field>
                            <Field label="Chegada"><Input type="time" value={visit.entryTime} onChange={event => vm.changeRow('visits', index, 'entryTime', event.target.value)}/></Field>
                            <Field label="Saída"><Input type="time" value={visit.exitTime} onChange={event => vm.changeRow('visits', index, 'exitTime', event.target.value)}/></Field>
                            <Field label="Ficha"><Input value={visit.recordNumber} onChange={event => vm.changeRow('visits', index, 'recordNumber', event.target.value)}/></Field>
                        </div>
                        <div className={styles.rowEnd}>
                            <Checkbox label="Conferido" checked={visit.checked} onChange={event => vm.changeRow('visits', index, 'checked', event.target.checked)}/>
                            <IconButton label={`Remover atendimento ${index + 1}`} icon={Trash2} onClick={() => vm.removeRow('visits', index)}/>
                        </div>
                    </fieldset>)}
                </div>
                <Button variant="soft" icon={Plus} onClick={() => vm.addRow('visits')}>Adicionar atendimento</Button>
            </Card>
            <div className={styles.twoCols}>
                <Card title="Vales">
                    <div className={styles.rows}>{form.vouchers.map((item, index) => <fieldset key={item.key} className={styles.smallRow}>
                        <legend className="sr-only">Vale {index + 1}</legend>
                        <Field label="Responsável" optional><Input value={item.responsibleName} onChange={event => vm.changeRow('vouchers', index, 'responsibleName', event.target.value)}/></Field>
                        <Field label="Valor" error={err('vouchers', index, 'value')}><Input inputMode="decimal" value={item.value} onChange={event => vm.changeRow('vouchers', index, 'value', event.target.value)}/></Field>
                        <Field label="Descrição" optional className={styles.wide}><Input value={item.description} onChange={event => vm.changeRow('vouchers', index, 'description', event.target.value)}/></Field>
                        <div className={styles.rowEnd}><Checkbox label="Conferido" checked={item.checked} onChange={event => vm.changeRow('vouchers', index, 'checked', event.target.checked)}/><IconButton label={`Remover vale ${index + 1}`} icon={Trash2} onClick={() => vm.removeRow('vouchers', index)}/></div>
                    </fieldset>)}</div>
                    <Button variant="soft" icon={Plus} onClick={() => vm.addRow('vouchers')}>Adicionar vale</Button>
                </Card>
                <Card title="Despesas">
                    <div className={styles.rows}>{form.expenses.map((item, index) => <fieldset key={item.key} className={styles.smallRow}>
                        <legend className="sr-only">Despesa {index + 1}</legend>
                        <Field label="Descrição" error={err('expenses', index, 'description')} className={styles.wide}><Input value={item.description} onChange={event => vm.changeRow('expenses', index, 'description', event.target.value)}/></Field>
                        <Field label="Valor" error={err('expenses', index, 'value')}><Input inputMode="decimal" value={item.value} onChange={event => vm.changeRow('expenses', index, 'value', event.target.value)}/></Field>
                        <div className={styles.rowEnd}><IconButton label={`Remover despesa ${index + 1}`} icon={Trash2} onClick={() => vm.removeRow('expenses', index)}/></div>
                    </fieldset>)}</div>
                    <Button variant="soft" icon={Plus} onClick={() => vm.addRow('expenses')}>Adicionar despesa</Button>
                </Card>
            </div>
            <div className={styles.twoCols}>
                <Card title="Descontos">
                    <FormGrid>{discounts.map(([field, label]) => <Field key={field} label={label} optional error={errors[field]}><Input inputMode="decimal" value={form[field]} onChange={event => vm.change(field, event.target.value)} placeholder="0,00"/></Field>)}</FormGrid>
                </Card>
                <Card title="Produção">
                    <FormGrid columns={3}>{counters.map(([field, label]) => <Field key={field} label={label} error={errors[field]}><Input type="number" inputMode="numeric" min="0" value={form[field]} onChange={event => vm.change(field, event.target.value)}/></Field>)}</FormGrid>
                </Card>
            </div>
            <Card title="Observações"><Field label="Observações" optional error={errors.notes}><Textarea value={form.notes} maxLength={4000} onChange={event => vm.change('notes', event.target.value)} placeholder="Algo importante sobre o dia"/></Field></Card>
            <div className={styles.footer}>
                <div className={styles.estimate} aria-live="polite">
                    <span>Entradas <b>{brl(vm.totals.gross)}</b></span>
                    <span>Descontos e despesas <b>{brl(vm.totals.discounts + vm.totals.expenses)}</b></span>
                    <span>Saldo estimado <b>{brl(vm.totals.balance)}</b></span>
                </div>
                <div className={styles.footerActions}>
                    <ButtonLink to={vm.backLink} variant="secondary">Cancelar</ButtonLink>
                    <Button type="submit" size="lg" busy={vm.busy}>Salvar mapa</Button>
                </div>
            </div>
        </form>
    </Page>;
}
