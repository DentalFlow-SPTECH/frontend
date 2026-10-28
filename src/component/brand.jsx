import logo from '../asset/brand/dental_flow_logo.png';

// O símbolo do dente do logotipo original vira um ícone de aplicativo (fundo escuro arredondado).
export function BrandMark({ size = 38 }) {
    return <span aria-hidden="true" style={{
        width: size, height: size, borderRadius: Math.round(size * .29), flex: 'none', display: 'inline-block',
        background: `#01101F url(${logo}) no-repeat 50% 14% / 190%`,
    }}/>;
}
