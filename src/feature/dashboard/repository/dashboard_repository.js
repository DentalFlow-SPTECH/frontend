// Painel mensal (somente DENTISTA). A clínica vem da autenticação; `dentistId` filtra um dentista.
export function createDashboardRepository({ api, lookups }) {
    return {
        month: ({ year, month, dentistId }) => api.dashboard.month({ year, month, dentistId: dentistId || undefined }),
        dentists: () => lookups.dentists(),
    };
}
