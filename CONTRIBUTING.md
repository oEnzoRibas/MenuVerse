# Contribuir com o MenuVerse

Para relatar uma falha funcional ou sugerir uma melhoria, [abra uma issue](https://github.com/oEnzoRibas/MenuVerse/issues/new/choose). Para comunicar uma vulnerabilidade, use o [canal privado de segurança](SECURITY.md).

## Desenvolver localmente

1. Faça um fork e clone o repositório. Se já tiver acesso de escrita, pode usar uma branch no próprio projeto.
2. Com Node.js 24 e npm instalados, execute `npm ci` e `npm run dev` na raiz. A demo local usa SQLite.
3. Abra o endereço informado pelo Next.js e entre em **Experimentar demonstração**. Use dados fictícios.
4. Crie uma branch a partir de `main` para sua alteração. Para mudanças no banco, adicione uma migração em `supabase/migrations/` e revise as permissões de administrador e cozinha.

## Verificar a alteração

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

Use `npm run format` para aplicar a formatação. A suíte Playwright padrão compila o projeto e testa a demonstração em desktop e celular. Para testar login e permissões com Supabase local, consulte o [guia de integração](docs/deploy.md#teste-de-integração-local).

## Abrir o pull request

Escolha `main` como destino. Explique o comportamento alterado e como verificá-lo. Vincule a issue quando houver e inclua uma captura ou gravação para mudanças visuais. Se o fluxo público, o contrato de uma rota ou a configuração mudar, atualize a documentação correspondente.

As interações no repositório seguem o [código de conduta](CODE_OF_CONDUCT.md).
