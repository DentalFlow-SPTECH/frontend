import { useEffect } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Ellipsis, LogOut, Search, ShieldAlert, MapPinOff } from 'lucide-react';
import { useAuth } from './app_provider.jsx';
import { useAppShellViewModel } from './use_app_shell_view_model.js';
import { Avatar, ButtonLink, DropdownMenu, EmptyState, IconLink, Panel } from '../component/ui/index.js';
import { BrandMark } from '../component/brand.jsx';
import styles from './app_shell.module.css';

function Brand() {
    return <Link to="/hoje" className={styles.brand} aria-label="Dental Flow — Hoje"><BrandMark size={38}/><span>Dental<b>Flow</b></span></Link>;
}

function UserMenu({ vm, compact = false }) {
    return <DropdownMenu
        trigger={<button type="button" className={styles.me} aria-label={`Conta de ${vm.user.name}`}>
            <Avatar name={vm.user.name} size="sm"/>
            {!compact && <span className={styles.meText}><b>{vm.user.name}</b><small>{vm.role}</small></span>}
            {!compact && <ChevronDown aria-hidden="true"/>}
        </button>}
        items={[
            { key: 'who', header: `${vm.user.name} · ${vm.role}` },
            { key: 'sep', separator: true },
            { key: 'out', label: 'Sair', icon: LogOut, danger: true, onSelect: vm.signOut },
        ]}/>;
}

export function AppShell() {
    const vm = useAppShellViewModel();
    const location = useLocation();
    const { setMoreOpen } = vm;
    useEffect(() => { setMoreOpen(false); }, [location.pathname, setMoreOpen]);
    const moreActive = vm.more.some(item => location.pathname.startsWith(item.to));
    return <div className={styles.shell}>
        <a className={styles.skip} href="#conteudo" onClick={event => { event.preventDefault(); document.getElementById('conteudo')?.focus(); }}>Ir para o conteúdo</a>
        <header className={styles.topbar}>
            <Brand/>
            <nav className={styles.tabs} aria-label="Navegação principal">
                {vm.items.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? styles.active : undefined}><item.icon aria-hidden="true"/>{item.label}</NavLink>)}
            </nav>
            <IconLink to="/pacientes" label="Ir para pacientes" icon={Search} variant="secondary" className={styles.search}/>
            <UserMenu vm={vm}/>
        </header>
        <header className={styles.mobileTop}>
            <Brand/>
            <UserMenu vm={vm} compact/>
        </header>
        <main id="conteudo" tabIndex={-1} className={styles.main}><Outlet/></main>
        <nav className={styles.tabbar} aria-label="Navegação principal">
            {vm.tabs.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? styles.active : undefined}><span className={styles.tabIcon}><item.icon aria-hidden="true"/></span>{item.label}</NavLink>)}
            <button type="button" className={moreActive ? styles.active : undefined} onClick={() => vm.setMoreOpen(true)} aria-haspopup="dialog"><span className={styles.tabIcon}><Ellipsis aria-hidden="true"/></span>Mais</button>
        </nav>
        <Panel open={vm.moreOpen} onOpenChange={vm.setMoreOpen} title="Mais opções">
            <ul className={styles.moreList}>
                {vm.more.map(item => <li key={item.to}><Link to={item.to}><span className={styles.moreIcon}><item.icon aria-hidden="true"/></span><span><b>{item.label}</b><small>{item.hint}</small></span><ChevronRight aria-hidden="true"/></Link></li>)}
            </ul>
            <button type="button" className={styles.signOut} onClick={vm.signOut}><LogOut aria-hidden="true"/>Sair da conta</button>
        </Panel>
    </div>;
}

export function RequireAuth({ children }) {
    const { user, reason } = useAuth();
    const location = useLocation();
    if (!user)
        return <Navigate to={reason === 'signed_out' ? '/entrar' : `/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`} replace/>;
    return children;
}

export function RequireDentist({ children }) {
    const { user } = useAuth();
    return user?.accessLevel === 'DENTISTA' ? children : <ForbiddenPage/>;
}

export function ForbiddenPage() {
    return <div className={styles.page}><h1 className="sr-only">Sem acesso</h1>
        <EmptyState icon={ShieldAlert} title="Esta área é do dentista responsável" action={<ButtonLink to="/hoje">Voltar para Hoje</ButtonLink>}>Seu perfil não tem acesso a esta tela. Se precisar dela, fale com o responsável da clínica.</EmptyState>
    </div>;
}

export function NotFoundPage() {
    return <div className={styles.page}><h1 className="sr-only">Página não encontrada</h1>
        <EmptyState icon={MapPinOff} title="Não encontramos esta página" action={<ButtonLink to="/hoje">Voltar para Hoje</ButtonLink>}>O endereço pode ter mudado. Use o menu para chegar à tela que você procura.</EmptyState>
    </div>;
}

export function RouteErrorPage() {
    return <main className={styles.errorPage}><h1>Não foi possível abrir esta página</h1><p>Recarregue a página para tentar de novo.</p><a href={import.meta.env.BASE_URL}>Reabrir o Dental Flow</a></main>;
}
