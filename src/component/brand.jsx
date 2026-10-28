import symbol from '../asset/brand/dental_flow_symbol.png';

// Símbolo do dente na cor da marca, sem quadrado e com fundo transparente (versão 1 da prancha do logotipo).
// O arquivo vem de scripts/brand/make_marks.py e tem 180 × 192 px.
const ratio = 180 / 192;

export function BrandMark({ size = 34 }) {
    return <img src={symbol} alt="" aria-hidden="true" width={Math.round(size * ratio)} height={size} style={{ flex: 'none', display: 'block' }}/>;
}
