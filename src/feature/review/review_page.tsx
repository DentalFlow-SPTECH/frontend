import { useId, useState } from 'react';
import { ActionLink, Button, Feedback, Field, PageHeader } from '../../component/ui';
import { useDemo } from '../../demo/store';
import styles from './review.module.css';

export function ReviewControls({ onClose }: { onClose?: () => void }) {
  const { scenario, setScenario, reset, writePending } = useDemo();
  const id = useId();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function restore() {
    if (!window.confirm('Restaurar os dados iniciais? Os registros criados e os formulários não salvos serão descartados.')) return;
    setNotice(''); setError('');
    try { await reset(); setNotice('Dados iniciais restaurados.'); }
    catch (reason) { setError((reason as Error).message); }
  }
  return <div className={styles.controls}>
    <Field id={`${id}_scenario`} label="Cenário de revisão"><select disabled={writePending} value={scenario} onChange={event => setScenario(event.target.value as typeof scenario)}>
      <option value="normal">Funcionamento normal</option><option value="slow">Carregamento lento</option><option value="read-error">Falha ao carregar</option><option value="write-error">Falha ao salvar</option>
    </select></Field>
    <p>Controles para conferir a interface com dados de teste. O cenário volta ao normal ao recarregar.</p>
    <Button variant="secondary" disabled={writePending} onClick={restore}>Restaurar dados de teste</Button>
    {writePending && <p role="status">Aguarde a conclusão da gravação.</p>}
    {notice && <Feedback tone="success">{notice}</Feedback>}
    {error && <Feedback tone="error">{error}</Feedback>}
    {onClose && <Button variant="quiet" onClick={onClose}>Fechar revisão</Button>}
  </div>;
}
export function ReviewPage() {
  return <div className={styles.page}><PageHeader title="Revisão da interface" /><ReviewControls /><div className={styles.back}><ActionLink variant="secondary" to="/orcamentos">Voltar aos orçamentos</ActionLink></div></div>;
}
