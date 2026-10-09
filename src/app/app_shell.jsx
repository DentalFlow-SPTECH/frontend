import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppShellViewModel } from './use_app_shell_view_model.js';
import { ActionLink, EmptyState, Feedback } from '../component/ui.jsx';
import { ReviewControls } from '../feature/review/view/review_view.jsx';
import logo from '../asset/brand/dental_flow_logo.png';
import styles from './app_shell.module.css';
function NavIcon({ kind }) {
    const paths = {
        dashboard: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,
        budget: <path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h2"/>,
        inventory: <path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7.5 5l9 4"/>,
        patient: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/></>,
        agenda: <><path d="M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 18h2"/></>,
        doctor: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3M12 15v6M9 18h6"/></>,
        cash: <><path d="M3 6h18v14H3zM3 10h18"/><circle cx="12" cy="15" r="2"/></>,
        report: <path d="M5 3h10l4 4v14H5zM15 3v4h4M9 17v-4M12 17v-7M15 17v-2"/>,
        admin: <><circle cx="8" cy="7" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 5 5v1"/></>,
    };
    return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paths[kind]}</svg>;
}
export function AppShell() {
    const location = useLocation();
    const { storageNotice, generation } = useAppShellViewModel();
    const [menuOpen, setMenuOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const menuButton = useRef(null);
    const navRef = useRef(null);
    const reviewDialog = useRef(null);
    const previousFocus = useRef(null);
    const closeMenuOnNavigation = useEffectEvent(() => {
        if (menuOpen) {
            setMenuOpen(false);
            document.querySelector('main h1')?.focus();
        }
    });
    useEffect(() => { closeMenuOnNavigation(); }, [location.key]);
    useEffect(() => {
        setMenuOpen(false);
        const timer = setTimeout(() => {
            const heading = document.querySelector('main h1');
            heading?.focus();
            if (heading)
                document.title = `${heading.textContent} — Dental Flow`;
        }, 40);
        return () => clearTimeout(timer);
    }, [location.pathname]);
    useEffect(() => {
        if (!menuOpen)
            return;
        navRef.current?.querySelector('a')?.focus();
        function close(event) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                menuButton.current?.focus();
            }
        }
        document.addEventListener('keydown', close);
        return () => document.removeEventListener('keydown', close);
    }, [menuOpen]);
    useEffect(() => {
        function openReview(event) {
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'r' && location.pathname !== '/revisao') {
                event.preventDefault();
                setReviewOpen(value => !value);
            }
        }
        document.addEventListener('keydown', openReview);
        return () => document.removeEventListener('keydown', openReview);
    }, [location.pathname]);
    useEffect(() => {
        const dialog = reviewDialog.current;
        if (!dialog)
            return;
        if (reviewOpen && !dialog.open) {
            previousFocus.current = document.activeElement;
            dialog.showModal();
        }
        if (!reviewOpen && dialog.open) {
            dialog.close();
            previousFocus.current?.focus();
        }
    }, [reviewOpen]);
    return <div className={styles.shell}>
    <a className={styles.skip} href="#main_content" onClick={event => { event.preventDefault(); document.getElementById('main_content')?.focus(); }}>Ir para o conteúdo</a>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
      <Link to="/painel" className={styles.brand} aria-label="Dental Flow — Painel"><img src={logo} alt="Dental Flow" width="402" height="362"/></Link>
      <nav id="clinic_navigation" ref={navRef} className={styles.navigation} aria-label="Navegação principal">
        <NavLink to="/painel" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="dashboard"/>Painel</NavLink>
        <NavLink to="/agenda" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="agenda"/>Agenda</NavLink>
        <NavLink to="/orcamentos" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="budget"/>Orçamentos</NavLink>
        <NavLink to="/estoque" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="inventory"/>Estoque</NavLink>
        <NavLink to="/pacientes" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="patient"/>Pacientes</NavLink>
        <NavLink to="/doutores" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="doctor"/>Doutores</NavLink>
        <NavLink to="/caixa" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="cash"/>Caixa</NavLink>
        <NavLink to="/relatorios" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="report"/>Relatórios</NavLink>
        <NavLink to="/administracao" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="admin"/>Administração</NavLink>
      </nav>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button ref={menuButton} type="button" className={styles.menuButton} onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="clinic_navigation" aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'}><span /><span /><span /></button>
        <span className={styles.mobileBrand}>Dental Flow</span>
      </header>
      <main id="main_content" tabIndex={-1} className={styles.main}>
        {storageNotice && <div className={styles.globalMessage}><Feedback tone="warning">{storageNotice} <Link to="/revisao">Abrir recuperação dos dados</Link></Feedback></div>}
        <Outlet key={location.pathname === '/revisao' ? 'review' : generation}/>
      </main>
    </div>
    <dialog ref={reviewDialog} aria-labelledby="review_dialog_title" className={styles.reviewDialog} onCancel={() => setReviewOpen(false)} onClose={() => { setReviewOpen(false); previousFocus.current?.focus(); }}>
      {reviewOpen && <><h2 id="review_dialog_title">Revisão da interface</h2><ReviewControls onClose={() => setReviewOpen(false)}/></>}
    </dialog>
  </div>;
}
export function NotFoundPage() { return <><h1 className={styles.notFoundHeading} tabIndex={-1}>Página não encontrada</h1><EmptyState title="Este endereço não está disponível" detail="Volte ao Painel para encontrar a tarefa desejada ou use a navegação." action={<ActionLink to="/painel">Voltar ao Painel</ActionLink>}/></>; }
export function RouteErrorPage() { return <main className={styles.errorPage}><h1>Não foi possível abrir esta página</h1><p>Recarregue a página para tentar novamente. Os registros já salvos serão mantidos.</p><a href={import.meta.env.BASE_URL}>Reabrir Dental Flow</a></main>; }
