// Rotas da API (guia de integração de 28/10/2026). Cada chamada devolve somente `data` da resposta.
function resource(http, path) {
    return {
        list: params => http.get(path, { params }),
        get: id => http.get(`${path}/${id}`),
        create: body => http.post(path, body),
        update: (id, body) => http.put(`${path}/${id}`, body),
    };
}

export function createApi(http) {
    return {
        me: ({ login, password }) => http.get('/auth/me', { auth: { username: login, password }, signingIn: true }),
        clinic: { get: id => http.get(`/clinic/${id}`), update: (id, body) => http.put(`/clinic/${id}`, body) },
        user: { create: body => http.post('/user', body) },
        dentist: resource(http, '/dentist'),
        procedure: resource(http, '/procedure'),
        patient: resource(http, '/patient'),
        appointment: { ...resource(http, '/appointment'), setStatus: (id, status) => http.patch(`/appointment/${id}/status`, null, { params: { status } }) },
        dashboard: { month: params => http.get('/dashboard', { params }) },
        product: {
            ...resource(http, '/inventory/products'),
            movements: id => http.get(`/inventory/products/${id}/movements`),
            move: (id, body) => http.post(`/inventory/products/${id}/movements`, body),
        },
        equipment: resource(http, '/inventory/equipment'),
        dailyMap: { ...resource(http, '/daily-map'), close: id => http.patch(`/daily-map/${id}/close`) },
    };
}
