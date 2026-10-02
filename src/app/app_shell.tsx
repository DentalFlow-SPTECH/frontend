import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDemo } from '../demo/store';
import { ActionLink, EmptyState, Feedback } from '../component/ui';
import { ReviewControls } from '../feature/review/review_page';
import logo from '../asset/brand/dental_flow_logo.png';
import styles from './app_shell.module.css';
function NavIcon({ kind }: { kind: 'budget' | 'inventory' | 'patient' }) {
  const paths: Record<typeof kind, ReactNode> = {
    budget: <path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h2" />,
    inventory: <path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7.5 5l9 4" />,
    patient: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-3a8 8 0 0 1 16 0v3" /></>,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paths[kind]}</svg>;
}
export function AppShell() {
  const location = useLocation();
  const { storageNotice, generation } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setMenuOpen(false);
    const timer = setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      heading?.focus();
      if (heading) document.title = `${heading.textContent} — Dental Flow`;
    }, 40);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    navRef.current?.querySelector<HTMLElement>('a')?.focus();
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    }
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);
  useEffect(() => {
    function openReview(event: KeyboardEvent) {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'r' && location.pathname !== '/revisao') {
        event.preventDefault(); setReviewOpen(value => !value);
      }
    }
    document.addEventListener('keydown', openReview);
    return () => document.removeEventListener('keydown', openReview);
  }, [location.pathname]);
  useEffect(() => {
    const dialog = reviewDialog.current;
    if (!dialog) return;
    if (reviewOpen && !dialog.open) { previousFocus.current = document.activeElement as HTMLElement; dialog.showModal(); }
    if (!reviewOpen && dialog.open) { dialog.close(); previousFocus.current?.focus(); }
  }, [reviewOpen]);
  return <div className={styles.shell}>
    <a className={styles.skip} href="#main_content" onClick={event => { event.preventDefault(); document.getElementById('main_content')?.focus(); }}>Ir para o conteúdo</a>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
      <Link to="/orcamentos" className={styles.brand} aria-label="Dental Flow — Orçamentos"><img src={logo} alt="Dental Flow" width="402" height="362" /></Link>
      <nav id="clinic_navigation" ref={navRef} className={styles.navigation} aria-label="Navegação principal">
        <NavLink to="/orcamentos" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="budget" />Orçamentos</NavLink>
        <NavLink to="/estoque" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="inventory" />Estoque</NavLink>
        <NavLink to="/pacientes" className={({ isActive }) => isActive ? styles.selected : ''}><NavIcon kind="patient" />Pacientes</NavLink>
      </nav>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button ref={menuButton} type="button" className={styles.menuButton} onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="clinic_navigation" aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'}><span /><span /><span /></button>
        <span className={styles.mobileBrand}>Dental Flow</span>
      </header>
      <main id="main_content" tabIndex={-1} className={styles.main}>
        {storageNotice && <div className={styles.globalMessage}><Feedback tone="warning">{storageNotice} <Link to="/revisao">Abrir recuperação dos dados</Link></Feedback></div>}
        <Outlet key={location.pathname === '/revisao' ? 'review' : generation} />
      </main>
    </div>
    <dialog ref={reviewDialog} aria-labelledby="review_dialog_title" className={styles.reviewDialog} onCancel={() => setReviewOpen(false)} onClose={() => { setReviewOpen(false); previousFocus.current?.focus(); }}>
      {reviewOpen && <><h2 id="review_dialog_title">Revisão da interface</h2><ReviewControls onClose={() => setReviewOpen(false)} /></>}
    </dialog>
  </div>;
}
export function NotFoundPage() { return <><h1 className={styles.notFoundHeading} tabIndex={-1}>Página não encontrada</h1><EmptyState title="Este endereço não está disponível" detail="Volte para os orçamentos ou use a navegação." action={<ActionLink to="/orcamentos">Ir para orçamentos</ActionLink>} /></>; }
export function RouteErrorPage() { return <main className={styles.errorPage}><h1>Não foi possível abrir esta página</h1><p>Recarregue a página para tentar novamente. Os registros já salvos serão mantidos.</p><a href={import.meta.env.BASE_URL}>Reabrir Dental Flow</a></main>; }
