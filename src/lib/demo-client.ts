export async function sendCommand(input: object, endpoint = "/api/demo") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "A operação falhou.");
  return data;
}
