// Cadastros usados para mostrar nomes na agenda e nos formulários. A consulta retorna só IDs,
// então dentistas, procedimentos e pacientes são carregados uma vez por clínica e reaproveitados.
export function createLookups(api, session) {
    const cache = new Map();
    function load(kind) {
        const clinicId = session.user()?.clinicId;
        const key = `${kind}:${clinicId}`;
        if (!cache.has(key)) {
            const request = api[kind].list({ clinicId }).catch(error => {
                cache.delete(key);
                throw error;
            });
            cache.set(key, request);
        }
        return cache.get(key);
    }
    return {
        dentists: () => load('dentist'),
        procedures: () => load('procedure'),
        patients: () => load('patient'),
        invalidate(kind) {
            for (const key of [...cache.keys()])
                if (!kind || key.startsWith(`${kind}:`))
                    cache.delete(key);
        },
    };
}
