import { Button, ButtonLink } from './button.jsx';
import { Alert, ErrorState, Page, PageHeader, Skeleton } from './display.jsx';
import styles from './form_page.module.css';

// Tela de cadastro: cabeçalho e formulário na mesma coluna centralizada, com Cancelar/Salvar fixos no rodapé.
// `vm` segue o formato dos ViewModels de formulário: form, loading, error, reload, failure, busy e submit.
export function FormPage({ title, subtitle, back, vm, submitLabel, width = 'form', notice, skeleton = { rows: 2, height: 150 }, children }) {
    if (vm.error && !vm.form)
        return <Page width={width}><PageHeader title={title} back={back}/><ErrorState error={vm.error} onRetry={vm.reload}/></Page>;
    if (vm.loading || !vm.form)
        return <Page width={width}><PageHeader title={title} back={back}/><Skeleton {...skeleton}/></Page>;
    return <Page width={width}>
        <PageHeader title={title} subtitle={subtitle} back={back}/>
        <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); vm.submit(); }}>
            {vm.failure && <Alert tone="danger" title="Não foi possível salvar">{vm.failure}</Alert>}
            {notice}
            {children}
            <div className={styles.footer}>
                <ButtonLink to={back.to} variant="secondary">Cancelar</ButtonLink>
                <Button type="submit" size="lg" busy={vm.busy}>{submitLabel}</Button>
            </div>
        </form>
    </Page>;
}
