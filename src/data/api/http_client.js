import axios from 'axios';

// Em desenvolvimento o Vite repassa /dentalflow-api para o backend (o backend não tem CORS).
export const apiBaseUrl = import.meta.env?.VITE_API_URL ?? '/dentalflow-api/v1';

export class ApiError extends Error {
    constructor({ code = 'GEN001', status = 0, message, detail = null }) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.detail = detail;
    }
}

const defaultMessages = {
    0: 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
    401: 'Usuário ou senha incorretos, ou a sessão terminou. Entre novamente.',
    403: 'Seu perfil não tem acesso a esta área.',
    404: 'Não encontramos este registro.',
    500: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
};

// Normaliza qualquer falha no formato { code, status, message } do guia de integração.
// 401 e 403 usam textos próprios: a API responde sem corpo ou com acentuação quebrada nesses casos.
export function toApiError(error) {
    if (error instanceof ApiError)
        return error;
    const response = error?.response;
    if (!response)
        return new ApiError({ code: 'NETWORK', status: 0, message: defaultMessages[0] });
    const status = response.status;
    const body = response.data && typeof response.data === 'object' ? response.data : {};
    const code = body.code ?? (status === 401 ? 'AUTH001' : status === 403 ? 'AUTH002' : status === 404 ? 'NFD001' : 'GEN001');
    const message = status === 401 || status === 403 ? defaultMessages[status]
        : status >= 500 ? defaultMessages[500]
        : body.message || defaultMessages[status] || 'Não foi possível concluir a operação.';
    return new ApiError({ code, status, message, detail: body.cause ?? null });
}

export function createHttpClient({ getCredentials, onUnauthorized, baseURL = apiBaseUrl, adapter } = {}) {
    // X-Requested-With faz o Spring responder 401 sem WWW-Authenticate, evitando a janela de login do navegador.
    const http = axios.create({ baseURL, adapter, timeout: 20000, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
    http.interceptors.request.use(config => {
        const credentials = getCredentials?.();
        if (!config.auth && credentials)
            config.auth = { username: credentials.login, password: credentials.password };
        return config;
    });
    http.interceptors.response.use(response => response.data?.data, error => {
        const apiError = toApiError(error);
        if (apiError.status === 401 && !error?.config?.signingIn)
            onUnauthorized?.(apiError);
        return Promise.reject(apiError);
    });
    return http;
}
