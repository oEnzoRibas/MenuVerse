# Instalação com Supabase e Vercel

## Criar os ambientes

1. Crie dois projetos Supabase independentes, um para demonstração e outro para operação.
2. Aplique as migrações em cada projeto. Com o CLI autenticado, execute `supabase link --project-ref <referência>` e `supabase db push` para cada referência. Confirme o projeto de destino antes de aplicar.
3. Copie `.env.example` para `.env.local` para testar com seus projetos. Na Vercel, configure as mesmas variáveis nos ambientes autorizados. Use a chave publicável para Auth e mantenha as chaves secretas no servidor.
4. Na Vercel, importe o repositório como Next.js com Node.js 24.x. A implantação da demo requer `SUPABASE_DEMO_URL` e `SUPABASE_DEMO_SECRET_KEY`. O SQLite é destinado ao desenvolvimento local em disco persistente.

O projeto demonstrativo usa somente a tabela `demo_sessions`. Agende a remoção periódica dos registros expirados no próprio banco de demonstração com `delete from public.demo_sessions where expires_at <= now()`. A aplicação bloqueia imediatamente a leitura de sessões expiradas.

## Criar o primeiro restaurante

No Supabase Auth do projeto de operação, desabilite o cadastro público e crie uma conta para cada membro. Execute no SQL Editor desse projeto:

```sql
with novo as (
  insert into public.restaurants(slug, name)
  values ('meu-restaurante', 'Meu Restaurante')
  returning id
)
insert into public.restaurant_members(restaurant_id, user_id, role)
select id, '<uuid-do-usuario-admin>'::uuid, 'admin' from novo;
```

Para a cozinha, inclua outra linha em `restaurant_members` com a função `kitchen`. Os membros entram em `/equipe`. Configure a categoria, o catálogo e os horários pelo painel antes de publicar. A publicação é uma operação de provisionamento no SQL Editor:

```sql
update public.restaurants
set published = true
where slug = 'meu-restaurante';
```

O cardápio ficará disponível em `/restaurante/meu-restaurante` quando `SUPABASE_ORDER_SECRET_KEY` e `MENUVERSE_TRACKING_SECRET` estiverem configuradas. Use um valor aleatório estável para o segredo de acompanhamento, com pelo menos 32 caracteres.

## Teste de integração local

Com Docker e Supabase CLI disponíveis, execute `supabase start`. Configure as variáveis da operação descritas em `.env.example` com as chaves da instância local. O formato `supabase status -o json` disponibiliza `API_URL`, `PUBLISHABLE_KEY` e `SECRET_KEY`. Mantenha as chaves no ambiente local.

Execute Playwright com `MENUVERSE_E2E_SUPABASE=1` e as mesmas variáveis de Auth e banco no processo de teste. O cenário cria um restaurante e dois usuários temporários, percorre o pedido em desktop e mobile e apaga esses registros ao terminar. Para testar um servidor já iniciado, indique também `MENUVERSE_E2E_URL`, por exemplo `http://127.0.0.1:3000`.

## Validação pós-implantação

- Percorra o fluxo demonstrativo completo e confirme que outra sessão não abre o mesmo pedido.
- Entre nas contas admin e cozinha. Confirme que apenas admin consegue editar o catálogo.
- Confirme um pedido no cardápio de operação e avance pelo painel autenticado. Verifique o acompanhamento na aba do cliente.
- Valide monitoramento, retenção de dados e limites de tráfego no ambiente usado antes de abrir um restaurante ao público.

Referências oficiais: [migrations do Supabase](https://supabase.com/docs/guides/local-development/database-migrations), [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
