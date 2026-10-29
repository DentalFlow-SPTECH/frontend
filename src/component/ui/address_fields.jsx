import { useEffect, useRef } from 'react';
import { Spinner } from './display.jsx';
import { Field, FormGrid, Input } from './field.jsx';

// Campos de endereço com o CEP primeiro: o ViaCEP (via `cep`, de useCepLookup) preenche rua e bairro e o foco
// vai para o número, ou para a rua em cidade de CEP único. `withCity` mostra Cidade e UF (a clínica guarda tudo num texto).
export function AddressFields({ form, errors, cep, onChange, withCity = false, required = true }) {
    const street = useRef(null);
    const number = useRef(null);
    const { version, next } = cep;
    useEffect(() => {
        if (version)
            (next === 'street' ? street : number).current?.focus();
    }, [version, next]);
    const input = (field, props = {}) => <Input value={form[field]} onChange={event => onChange(field, event.target.value)} {...props}/>;
    const optional = !required;
    return <FormGrid>
        {/* `trailing` sempre presente: trocar a estrutura do campo no meio da digitação tiraria o foco do CEP. */}
        <Field label="CEP" optional={optional} error={errors.zipCode} hint={cep.hint}>
            {input('zipCode', { inputMode: 'numeric', autoComplete: 'postal-code', placeholder: '00000-000', trailing: <>{cep.status === 'loading' && <Spinner label="Buscando o endereço"/>}</> })}
        </Field>
        <Field label="Bairro" optional={optional} error={errors.neighborhood}>{input('neighborhood', { maxLength: 80 })}</Field>
        <Field label="Rua" optional={optional} error={errors.street} className="full">{input('street', { ref: street, maxLength: 150, autoComplete: 'address-line1' })}</Field>
        <Field label="Número" optional={optional} error={errors.number}>{input('number', { ref: number, maxLength: 10, placeholder: 'Ex.: 120 ou s/n' })}</Field>
        <Field label="Complemento" optional error={errors.complement}>{input('complement', { maxLength: 40, autoComplete: 'address-line2', placeholder: 'Apto, bloco, sala' })}</Field>
        {withCity && <>
            <Field label="Cidade" optional={optional} error={errors.city}>{input('city', { maxLength: 60, autoComplete: 'address-level2' })}</Field>
            <Field label="UF" optional={optional} error={errors.state}>{input('state', { maxLength: 2, autoComplete: 'address-level1', placeholder: 'SP' })}</Field>
        </>}
    </FormGrid>;
}
