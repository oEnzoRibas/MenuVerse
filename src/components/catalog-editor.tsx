"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "./ui";
import {
  images,
  money,
  type Category,
  type Catalog,
  type Product,
  type Settings,
} from "@/lib/domain";

type Editor =
  | { action: "product"; value: Product }
  | { action: "category"; value: Category }
  | { action: "settings"; value: Settings };
type Props = {
  section: "products" | "categories" | "settings";
  state: Catalog;
  save: (action: Editor["action"], data: Editor["value"]) => Promise<void>;
};
const imageNames = [
  "Hambúrguer clássico",
  "Smash",
  "Bacon",
  "Fritas",
  "Frango",
  "Refrigerante",
  "Brownie",
];

const cents = (value: string) =>
  Math.round(Number(value.replace(",", ".")) * 100);
type Group = Product["groups"][number];

function GroupEditor({
  group,
  update,
  remove,
}: {
  group: Group;
  update: (group: Group) => void;
  remove: () => void;
}) {
  return (
    <div className="option-box">
      <div className="edit-row">
        <label className="field">
          Nome do grupo
          <input
            value={group.name}
            maxLength={60}
            required
            onChange={(event) => update({ ...group, name: event.target.value })}
          />
        </label>
        <label className="field">
          Seleção
          <select
            value={group.mode}
            onChange={(event) =>
              update({ ...group, mode: event.target.value as Group["mode"] })
            }
          >
            <option value="single">Uma opção</option>
            <option value="multiple">Várias opções</option>
          </select>
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="Remover grupo"
          onClick={remove}
        >
          <X size={18} />
        </button>
      </div>
      <label className="choice">
        <input
          type="checkbox"
          checked={group.required}
          onChange={(event) =>
            update({ ...group, required: event.target.checked })
          }
        />{" "}
        Grupo obrigatório
      </label>
      {group.values.map((value) => (
        <div className="edit-row" key={value.id}>
          <label className="field">
            Opção
            <input
              value={value.name}
              required
              maxLength={60}
              onChange={(event) =>
                update({
                  ...group,
                  values: group.values.map((item) =>
                    item.id === value.id
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                })
              }
            />
          </label>
          <label className="field">
            Adicional (R$)
            <input
              type="number"
              min="0"
              max="1000"
              step=".01"
              defaultValue={value.price / 100}
              required
              onChange={(event) =>
                update({
                  ...group,
                  values: group.values.map((item) =>
                    item.id === value.id
                      ? { ...item, price: cents(event.target.value) }
                      : item,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className="icon-button"
            disabled={group.values.length <= 1}
            aria-label="Remover opção"
            onClick={() =>
              update({
                ...group,
                values: group.values.filter((item) => item.id !== value.id),
              })
            }
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={group.values.length >= 20}
        onClick={() =>
          update({
            ...group,
            values: [
              ...group.values,
              { id: crypto.randomUUID(), name: "", price: 0 },
            ],
          })
        }
      >
        <Plus size={16} /> Adicionar opção
      </Button>
    </div>
  );
}

export function CatalogEditor({ section, state, save }: Props) {
  const [draft, setDraft] = useState<Editor | null>(() =>
    section === "settings"
      ? { action: "settings", value: state.settings }
      : null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function edit(value: Editor | null) {
    setDraft(value);
    setMessage("");
    setError("");
  }
  const id = draft?.action === "settings" ? "settings" : draft?.value.id;
  return (
    <div
      className={
        "catalog-editor " +
        (section !== "settings" ? "catalog-editor-split" : "")
      }
    >
      {section === "products" && (
        <section className="admin-box">
          <div className="edit-toolbar">
            <h2>Catálogo</h2>
            <Button
              disabled={!state.categories.length}
              onClick={() =>
                edit({
                  action: "product",
                  value: {
                    id: crypto.randomUUID(),
                    categoryId: state.categories[0].id,
                    name: "",
                    description: "",
                    price: 0,
                    image: "smash",
                    available: true,
                    featured: false,
                    groups: [],
                    ingredients: [],
                  },
                })
              }
            >
              <Plus size={17} /> Novo produto
            </Button>
          </div>
          <ul className="editor-list">
            {state.products.map((product) => (
              <li key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {money(product.price)} ·{" "}
                    {product.available ? "Disponível" : "Indisponível"}
                  </small>
                </div>
                <Button
                  variant="secondary"
                  aria-label={"Editar " + product.name}
                  onClick={() => edit({ action: "product", value: product })}
                >
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {section === "categories" && (
        <section className="admin-box">
          <div className="edit-toolbar">
            <h2>Categorias</h2>
            <Button
              onClick={() =>
                edit({
                  action: "category",
                  value: {
                    id: crypto.randomUUID(),
                    name: "",
                    active: true,
                    position: Math.min(
                      999,
                      Math.max(
                        -1,
                        ...state.categories.map(
                          (category) => category.position,
                        ),
                      ) + 1,
                    ),
                  },
                })
              }
            >
              <Plus size={17} /> Nova categoria
            </Button>
          </div>
          <ul className="editor-list">
            {state.categories
              .toSorted((a, b) => a.position - b.position)
              .map((category) => (
                <li key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <small>
                      Ordem {category.position} ·{" "}
                      {category.active ? "Visível" : "Oculta"}
                    </small>
                  </div>
                  <Button
                    variant="secondary"
                    aria-label={"Editar " + category.name}
                    onClick={() =>
                      edit({ action: "category", value: category })
                    }
                  >
                    Editar
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      )}
      <section className="admin-box">
        {!draft && (
          <p className="empty">
            {message || "Selecione um registro para editar ou crie um novo."}
          </p>
        )}
        {draft && (
          <>
            <div className="edit-toolbar">
              <h2>
                {draft.action === "product"
                  ? "Dados do produto"
                  : draft.action === "category"
                    ? "Dados da categoria"
                    : "Atendimento do restaurante"}
              </h2>
              {draft.action !== "settings" && (
                <button
                  className="icon-button"
                  aria-label="Fechar editor"
                  onClick={() => edit(null)}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <form
              key={id}
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                setMessage("");
                const fields = new FormData(event.currentTarget);
                let value = draft.value;
                if (draft.action === "product")
                  value = {
                    ...draft.value,
                    price: cents(String(fields.get("price"))),
                    ingredients: [
                      ...new Set(
                        String(fields.get("ingredients"))
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      ),
                    ],
                  };
                if (draft.action === "settings")
                  value = {
                    ...draft.value,
                    fee: cents(String(fields.get("fee"))),
                  };
                try {
                  await save(draft.action, value);
                  setMessage("Alterações salvas.");
                  if (draft.action !== "settings") setDraft(null);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message.split("\n")[0]
                      : "Falha ao salvar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <fieldset disabled={busy}>
                {draft.action === "product" &&
                  (() => {
                    const value = draft.value;
                    const change = (patch: Partial<Product>) =>
                      setDraft({
                        action: "product",
                        value: { ...value, ...patch },
                      });
                    return (
                      <>
                        <label className="field">
                          Nome
                          <input
                            required
                            minLength={2}
                            maxLength={80}
                            value={value.name}
                            onChange={(event) =>
                              change({ name: event.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          Descrição
                          <textarea
                            required
                            minLength={2}
                            maxLength={280}
                            value={value.description}
                            onChange={(event) =>
                              change({ description: event.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          Preço (R$)
                          <input
                            name="price"
                            required
                            type="number"
                            min=".01"
                            max="10000"
                            step=".01"
                            defaultValue={value.price / 100}
                          />
                        </label>
                        <label className="field">
                          Categoria
                          <select
                            value={value.categoryId}
                            onChange={(event) =>
                              change({ categoryId: event.target.value })
                            }
                          >
                            {state.categories.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Foto
                          <select
                            value={value.image}
                            onChange={(event) =>
                              change({
                                image: event.target.value as Product["image"],
                              })
                            }
                          >
                            {images.map((image, index) => (
                              <option key={image} value={image}>
                                {imageNames[index]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Ingredientes removíveis, separados por vírgula
                          <input
                            name="ingredients"
                            defaultValue={value.ingredients.join(", ")}
                          />
                        </label>
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={value.available}
                            onChange={(event) =>
                              change({ available: event.target.checked })
                            }
                          />{" "}
                          Disponível
                        </label>
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={value.featured}
                            onChange={(event) =>
                              change({ featured: event.target.checked })
                            }
                          />{" "}
                          Destacar no cardápio
                        </label>
                        <h3 className="editor-subheading">Personalização</h3>
                        {value.groups.map((group) => (
                          <GroupEditor
                            key={group.id}
                            group={group}
                            update={(updated) =>
                              change({
                                groups: value.groups.map((item) =>
                                  item.id === group.id ? updated : item,
                                ),
                              })
                            }
                            remove={() =>
                              change({
                                groups: value.groups.filter(
                                  (item) => item.id !== group.id,
                                ),
                              })
                            }
                          />
                        ))}
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={value.groups.length >= 12}
                          onClick={() =>
                            change({
                              groups: [
                                ...value.groups,
                                {
                                  id: crypto.randomUUID(),
                                  name: "",
                                  mode: "multiple",
                                  required: false,
                                  values: [
                                    {
                                      id: crypto.randomUUID(),
                                      name: "",
                                      price: 0,
                                    },
                                  ],
                                },
                              ],
                            })
                          }
                        >
                          <Plus size={17} /> Adicionar grupo
                        </Button>
                      </>
                    );
                  })()}
                {draft.action === "category" &&
                  (() => {
                    const value = draft.value;
                    const change = (patch: Partial<Category>) =>
                      setDraft({
                        action: "category",
                        value: { ...value, ...patch },
                      });
                    return (
                      <>
                        <label className="field">
                          Nome
                          <input
                            required
                            minLength={2}
                            maxLength={60}
                            value={value.name}
                            onChange={(event) =>
                              change({ name: event.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          Posição
                          <input
                            type="number"
                            required
                            min="0"
                            max="999"
                            value={value.position}
                            onChange={(event) =>
                              change({ position: Number(event.target.value) })
                            }
                          />
                        </label>
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={value.active}
                            onChange={(event) =>
                              change({ active: event.target.checked })
                            }
                          />{" "}
                          Visível no cardápio
                        </label>
                      </>
                    );
                  })()}
                {draft.action === "settings" &&
                  (() => {
                    const value = draft.value;
                    const change = (patch: Partial<Settings>) =>
                      setDraft({
                        action: "settings",
                        value: { ...value, ...patch },
                      });
                    return (
                      <>
                        <label className="field">
                          Nome do restaurante
                          <input
                            required
                            minLength={2}
                            maxLength={80}
                            value={value.name}
                            onChange={(event) =>
                              change({ name: event.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          Horários
                          <input
                            required
                            minLength={2}
                            maxLength={120}
                            value={value.hours}
                            onChange={(event) =>
                              change({ hours: event.target.value })
                            }
                          />
                        </label>
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={value.pickup}
                            onChange={(event) =>
                              change({ pickup: event.target.checked })
                            }
                          />{" "}
                          Permitir retirada
                        </label>
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={value.delivery}
                            onChange={(event) =>
                              change({ delivery: event.target.checked })
                            }
                          />{" "}
                          Permitir entrega
                        </label>
                        <label className="field">
                          Taxa de entrega (R$)
                          <input
                            name="fee"
                            type="number"
                            required
                            min="0"
                            max="1000"
                            step=".01"
                            defaultValue={value.fee / 100}
                          />
                        </label>
                      </>
                    );
                  })()}
                <div className="editor-actions">
                  <Button>Salvar alterações</Button>
                </div>
              </fieldset>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {message && <p role="status">{message}</p>}
            </form>
          </>
        )}
      </section>
    </div>
  );
}
