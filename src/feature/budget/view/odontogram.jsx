import { permanentTeeth, primaryTeeth } from '../model/teeth.js';
import { useState } from 'react';
import styles from './odontogram.module.css';
const quadrants = ['Superior direito', 'Superior esquerdo', 'Inferior direito', 'Inferior esquerdo'];
function ToothShape({ tooth }) {
    const position = Number(tooth[1]);
    return <svg width="32" height="34" viewBox="0 0 32 38" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    {position <= 3 ? <path d="M10 3Q16 1 22 3L23 14Q22 20 19 24L17 34Q16 38 15 34L13 24Q10 20 9 14Z"/> : <><path d="M6 5Q9 1 13 4Q16 6 19 4Q23 1 26 5Q29 12 25 20L23 34Q22 38 20 33L16 25L12 33Q10 38 9 34L7 20Q3 12 6 5Z"/><path d="M9 10Q16 14 23 10M16 12V19"/></>}
  </svg>;
}
export function Odontogram({ items, readonly, disabled, onAdd }) {
    const [dentition, setDentition] = useState(() => /^[5-8]/.test(items.find(item => item.tooth)?.tooth ?? '') ? 'primary' : 'permanent');
    const teeth = dentition === 'permanent' ? permanentTeeth : primaryTeeth;
    const size = dentition === 'permanent' ? 8 : 5;
    const linked = new Set(items.filter(item => item.tooth).map(item => item.tooth));
    return <div className={styles.chart}>
    <div className={styles.dentition} role="group" aria-label="Dentição"><button type="button" disabled={disabled} aria-pressed={dentition === 'permanent'} onClick={() => setDentition('permanent')}>Permanente</button><button type="button" disabled={disabled} aria-pressed={dentition === 'primary'} onClick={() => setDentition('primary')}>Infantil</button></div>
    {!readonly && <p className={styles.hint}>Selecione um dente para incluir um procedimento. A região ou superfície pode ser informada no item.</p>}
    <div className={styles.quadrants}>{quadrants.map((label, index) => <section key={label} aria-label={label}><h3>{label}</h3><div className={styles.teeth}>{teeth.slice(index * size, (index + 1) * size).map(tooth => {
                const assigned = linked.has(tooth);
                const content = <><ToothShape tooth={tooth}/><span>{tooth}</span>{assigned && <span className={styles.marker} aria-hidden="true"/>}</>;
                return readonly ? <span key={tooth} role="img" className={`${styles.tooth} ${assigned ? styles.assigned : ''}`} aria-label={`Dente ${tooth}${assigned ? ', com procedimento no orçamento' : ''}`}>{content}</span> : <button key={tooth} type="button" disabled={disabled} className={`${styles.tooth} ${assigned ? styles.assigned : ''}`} aria-label={`Adicionar procedimento no dente ${tooth}${assigned ? ', já possui procedimento' : ''}`} onClick={() => onAdd(tooth)}>{content}</button>;
            })}</div></section>)}</div>
    <p className={styles.legend}><span aria-hidden="true"/> Dente com procedimento no orçamento</p>
  </div>;
}
