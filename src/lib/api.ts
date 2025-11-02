// API client centralizado

let RAW_BASE = (import.meta as any).env?.ENDPOINT_BACKEND
  ?? (import.meta as any).env?.VITE_ENDPOINT_BACKEND
  ?? "https://backend23-c6a8.onrender.com";
// Normaliza para http em localhost caso variável venha com https sem certificado válido
if (typeof RAW_BASE === "string" && RAW_BASE.startsWith("https://localhost")) {
  RAW_BASE = RAW_BASE.replace("https://", "http://");
}
export const BASE_URL = RAW_BASE;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  // @ts-ignore
  return (await res.text()) as T;
}

export async function apiCreateProcess(zoneId?: number, context?: unknown): Promise<{ processId: number }> {
  const body = new FormData();
  if (typeof zoneId === "number" && Number.isFinite(zoneId)) {
    body.append("zone_id", String(zoneId));
  }
  if (typeof context !== "undefined") body.append("context", JSON.stringify(context));
  return http("/processos/prevencao", { method: "POST", body });
}

export async function apiUploadPhotos(processId: number, files: File[]): Promise<{ photos: { id: number; filePath: string; description: string }[] }> {
  const body = new FormData();
  for (const f of files) body.append("files", f);
  return http(`/processos/prevencao/${processId}/fotos`, { method: "POST", body });
}

export async function apiSubmitForm(processId: number, data: { responsavel: string; data_vistoria: string; observacoes?: string; acao_imediata?: string }): Promise<{ formId: number }> {
  const body = new FormData();
  body.append("responsavel", data.responsavel);
  body.append("data_vistoria", data.data_vistoria);
  body.append("observacoes", data.observacoes || "");
  body.append("acao_imediata", data.acao_imediata || "");
  return http(`/processos/prevencao/${processId}/formulario`, { method: "POST", body });
}

export async function apiListFunds(): Promise<{ funds: { code: string; name: string; required_documents: string[] }[] }> {
  return http("/fundos");
}

export async function apiGenerateDocuments(processId: number, fundCode: string): Promise<{ documents: { id: number; name: string; type: string; url: string }[] }> {
  const body = new FormData();
  body.append("fundo", fundCode);
  return http(`/processos/prevencao/${processId}/gerar-documentos`, { method: "POST", body });
}

export function getDocumentUrl(relativeUrl: string): string {
  // relativeUrl vem como "/documentos/{id}"
  return `${BASE_URL}${relativeUrl}`;
}

export async function apiPreflight(processId: number, fundCode: string): Promise<{ status: string; documents: { doc_type: string; status: string; missing: string[] }[] }> {
  return http(`/processos/prevencao/${processId}/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fund: fundCode }),
  });
}

export async function apiGenerateActionPlan(context: unknown): Promise<void> {
  const res = await fetch(`${BASE_URL}/acao/plano`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao gerar plano: ${res.status} ${t}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plano_acao_municipal.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


