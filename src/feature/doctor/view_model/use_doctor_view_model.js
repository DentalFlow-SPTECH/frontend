import { useState, useRef } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { normalize } from '../../../demo/format.js';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { useClinicData, useClinicRepository } from '../../../app/app_provider.jsx';
import { fields } from '../model/doctor_model.js';
export function useDoctorListViewModel() {
    const { data } = useClinicData();
    const [params, setParams] = useSearchParams();
    const query = params.get('q') ?? '';
    const search = params.size ? `?${params}` : '';
    const resource = useResource('doctors');
    const filtered = data.doctors.filter(doctor => {
        const values = [doctor.name, doctor.specialty, doctor.cpf, doctor.cro, doctor.phone, doctor.email, doctor.status];
        const digits = query.replace(/\D/g, '');
        return normalize(values.filter(Boolean).join(' ')).includes(normalize(query)) || (/^[\d\s().+\-]+$/.test(query) && digits.length > 0 && [doctor.cpf, doctor.phone].some(value => value?.replace(/\D/g, '').includes(digits)));
    });
    function changeQuery(value) { setParams(value ? { q: value } : {}, { replace: true }); }
    function clearQuery() { setParams({}); }
    return { query, search, resource, filtered, changeQuery, clearQuery };
}
export function useDoctorDetailViewModel() {
    const { id } = useParams();
    const { search } = useLocation();
    const { data } = useClinicData();
    const resource = useResource(`doctor:${id}`);
    const doctor = data.doctors.find(value => value.id === id);
    if (resource.busy)
        return { search, data, resource, doctor };
    if (resource.error)
        return { search, data, resource, doctor };
    if (!doctor)
        return { search, data, resource, doctor };
    const budgets = data.budgets.filter(value => value.doctorId === doctor.id).sort((a, b) => b.createdOn.localeCompare(a.createdOn));
    const appointments = data.appointments.filter(value => value.doctorId === doctor.id).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    return { search, data, resource, doctor, budgets, appointments };
}
export function useDoctorFormViewModel({ id }) {
    const submissionLock = useRef(false);
    const { data } = useClinicData();
    const { saveDoctor } = useClinicRepository('doctor');
    const { search } = useLocation();
    const resource = useResource(`doctor-form:${id ?? 'new'}`);
    const source = data.doctors.find(value => value.id === id);
    const [initial] = useState(() => Object.fromEntries(fields.map(key => [key, source?.[key] ?? ''])));
    const [values, setValues] = useState(initial);
    const [nameError, setNameError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    useUnsaved(!saved && fields.some(key => values[key] !== initial[key]), saving);
    async function submit() {
        if (submissionLock.current || saving || saved)
            return;
        setSaveError('');
        if (!values.name.trim()) {
            setNameError('Informe o nome completo do doutor.');
            return 'doctor_name';
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await saveDoctor({ ...values, name: values.name.trim() }, id));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    if (saved)
        return { search, resource, source, values, nameError, saveError, saving, saved, submit };
    if (resource.busy)
        return { search, resource, source, values, nameError, saveError, saving, saved, submit };
    if (resource.error)
        return { search, resource, source, values, nameError, saveError, saving, saved, submit };
    if (id && !source)
        return { search, resource, source, values, nameError, saveError, saving, saved, submit };
    const returnTo = id ? `/doutores/${id}${search}` : `/doutores${search}`;
    function change(key, value) { setValues(previous => ({ ...previous, [key]: value })); if (key === 'name')
        setNameError(''); }
    return { search, resource, source, values, nameError, saveError, saving, saved, submit, returnTo, change };
}
