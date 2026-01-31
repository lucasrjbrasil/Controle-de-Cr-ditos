# Configuração de Headers de Segurança HTTP

Este documento descreve os headers de segurança recomendados para a aplicação IRKO Créditos.

## Headers Recomendados

Configure estes headers no seu servidor de hospedagem (Vercel, Netlify, etc.) ou proxy reverso (nginx).

### Configuração para Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.bcb.gov.br https://brasilapi.com.br https://olinda.bcb.gov.br wss://*.supabase.co;"
        },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

### Configuração para Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

---

## Descrição dos Headers

| Header | Propósito |
|--------|-----------|
| `X-Content-Type-Options: nosniff` | Previne MIME-type sniffing |
| `X-Frame-Options: DENY` | Bloqueia exibição em iframes (anti-clickjacking) |
| `X-XSS-Protection` | Ativa filtro XSS do navegador |
| `Referrer-Policy` | Controla informações enviadas no header Referer |
| `Permissions-Policy` | Desabilita APIs desnecessárias (câmera, microfone) |
| `Strict-Transport-Security` | Força conexões HTTPS |
| `Content-Security-Policy` | Define origens confiáveis para scripts/estilos |
