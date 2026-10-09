import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useClinicRepository } from '../../../app/app_provider.jsx';
import { useResource } from '../../../component/use_resource.js';
import { useUnsaved } from '../../../component/use_unsaved.js';
import { createPatientInput, patientSections } from '../model/patient_model.js';
export function usePatientFormViewModel(id) {
    const repository = useClinicRepository('patient');
    const { search } = useLocation();
    const resource = useResource(`patient-form:${id ?? 'new'}`);
    const source = repository.find(id);
    const [initial] = useState(() => createPatientInput(source));
    const [fields, setFields] = useState(initial);
    const [nameError, setNameError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [section, setSection] = useState(0);
    const submissionLock = useRef(false);
    const dirty = !saved && Object.keys(initial).some(key => fields[key] !== initial[key]);
    useUnsaved(dirty, saving);
    function change(key, value) {
        setFields(previous => ({ ...previous, [key]: value }));
        if (key === 'name')
            setNameError('');
    }
    async function submit() {
        if (submissionLock.current || saved)
            return;
        setSaveError('');
        if (!fields.name.trim()) {
            // O erro abre a seção do campo; as demais seções conservam o que foi preenchido.
            setNameError('Informe o nome completo do paciente.');
            setSection(0);
            return 'patient_name';
        }
        submissionLock.current = true;
        setSaving(true);
        try {
            setSaved(await repository.savePatient({ ...fields, name: fields.name.trim() }, id));
        }
        catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu preenchimento foi mantido. Tente novamente.');
        }
        finally {
            submissionLock.current = false;
            setSaving(false);
        }
    }
    const sections = patientSections.map((value, index) => {
        const filled = value.keys.filter(key => fields[key].trim()).length;
        const error = index === 0 && Boolean(nameError);
        return { ...value, index, filled, total: value.keys.length, error, summary: error ? '1 campo para revisar' : filled ? `${filled} de ${value.keys.length} preenchidos` : 'Nenhum campo preenchido' };
    });
    function goToSection(index) { setSection(Math.max(0, Math.min(patientSections.length - 1, index))); }
    return {
        search, resource, source, fields, nameError, saveError, saving, saved, dirty, section, sections, goToSection, change, submit,
        returnTo: id ? `/pacientes/${id}${search}` : `/pacientes${search}`,
    };
}
