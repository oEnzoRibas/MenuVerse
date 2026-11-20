# API

Os endpoints usam JSON e as operações de escrita exigem a origem do próprio aplicativo. A sessão de demonstração é iniciada por `GET /demo`, que define o cookie e redireciona para o cardápio. O parâmetro `para` aceita `painel` e `cozinha`.

| Método e rota                           | Acesso                                    | Resposta                                                    |
| --------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| GET /api/demo                           | Cookie demo                               | Catálogo, configurações e pedidos da sessão                 |
| GET /api/demo?pedido={id}               | Cookie demo                               | Andamento sem nome ou endereço                              |
| POST /api/demo                          | Cookie demo                               | Resultado de checkout, avanço ou edição no ambiente de demo |
| GET /api/equipe/{tenant}                | Supabase Auth e vínculo com o restaurante | Dados operacionais conforme a função                        |
| POST /api/equipe/{tenant}               | Supabase Auth e vínculo com o restaurante | Avanço de status ou edição admin                            |
| POST /api/restaurante/{slug}            | Restaurante publicado                     | Código do pedido e cookie próprio de acompanhamento         |
| GET /api/restaurante/{slug}?pedido={id} | Cookie de acompanhamento                  | Andamento sem nome ou endereço                              |

**Checkout.** Envie `action: "checkout"` e `data` com `requestId` UUID, `customer`, `mode` (`pickup` ou `delivery`), `address`, `notes`, `expectedTotal` opcional em centavos e `items`. Cada item contém `productId`, `quantity`, `selections` (mapa de grupos para listas de IDs), `removed` (lista de nomes) e `notes`. A resposta contém `id`. Reuse a mesma identificação de tentativa quando reenviar uma confirmação.

**Status.** Envie `{ "action": "advance", "id": "MV-1001", "from": "received" }`. A sequência é `received → preparing → ready → finished`. O exemplo usa um código dos dados sintéticos.

**Catálogo.** Envie `action` como `product`, `category` ou `settings` e `data` conforme os esquemas de `src/lib/domain.ts`. A resposta de uma edição ou transição é `{ "ok": true }`.

Erros incluem `error` com a mensagem. Códigos mais comuns são 400 para dados inválidos, 401 para sessão expirada, 403 para origem ou permissão, 404 para recurso indisponível e 409 para conflito ou mudança de preço.
