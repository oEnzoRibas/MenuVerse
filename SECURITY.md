# Política de segurança

## Como comunicar uma vulnerabilidade

Use o [formulário privado de segurança do MenuVerse](https://github.com/oEnzoRibas/MenuVerse/security/advisories/new). O relato chega aos mantenedores pelo GitHub.

Informe a versão ou o commit, a rota afetada, o perfil de acesso utilizado e o impacto observado. Se o problema envolver um pedido, use dados fictícios e o ambiente de demonstração. Antes de anexar capturas ou logs, remova cookies, tokens, endereços e credenciais.

A equipe registra a triagem e combina os próximos passos no próprio relato privado. Correções publicadas podem ser consultadas nos [avisos de segurança](https://github.com/oEnzoRibas/MenuVerse/security/advisories) e nas [releases](https://github.com/oEnzoRibas/MenuVerse/releases).

## Operação e dependências

Mantenha as chaves secretas do Supabase no ambiente de execução do servidor. As variáveis necessárias e a separação entre os projetos de demonstração e operação estão no [guia de deploy](docs/deploy.md). Os alertas do Dependabot ajudam a acompanhar dependências afetadas por avisos conhecidos.
