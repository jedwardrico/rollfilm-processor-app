import { Chemical, Process, Procedure, Roll, Stats } from '../types';

// Update this to your NAS IP/hostname when deploying
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Processes
export const api = {
  processes: {
    list: () => request<Process[]>('/api/processes'),
  },

  chemicals: {
    list: (params?: { process_id?: string; active?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.process_id) q.set('process_id', params.process_id);
      if (params?.active !== undefined) q.set('active', String(params.active));
      return request<Chemical[]>(`/api/chemicals?${q}`);
    },
    get: (id: number) => request<Chemical>(`/api/chemicals/${id}`),
    create: (body: Partial<Chemical>) => request<Chemical>('/api/chemicals', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Chemical>) => request<Chemical>(`/api/chemicals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    increment: (id: number) => request<Chemical>(`/api/chemicals/${id}/increment`, { method: 'POST' }),
    delete: (id: number) => request<void>(`/api/chemicals/${id}`, { method: 'DELETE' }),
  },

  rolls: {
    list: (params?: { process_id?: string; status?: string; format?: string }) => {
      const q = new URLSearchParams();
      if (params?.process_id) q.set('process_id', params.process_id);
      if (params?.status) q.set('status', params.status);
      if (params?.format) q.set('format', params.format);
      return request<Roll[]>(`/api/rolls?${q}`);
    },
    get: (id: string | number) => request<Roll>(`/api/rolls/${id}`),
    create: (body: Partial<Roll>) => request<Roll>('/api/rolls', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Roll>) => request<Roll>(`/api/rolls/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    process: (id: number, body: { chemical_id?: number; procedure_id?: number }) =>
      request<Roll>(`/api/rolls/${id}/process`, { method: 'POST', body: JSON.stringify(body) }),
  },

  procedures: {
    list: (params?: { process_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.process_id) q.set('process_id', params.process_id);
      return request<Procedure[]>(`/api/procedures?${q}`);
    },
    get: (id: number) => request<Procedure>(`/api/procedures/${id}`),
    create: (body: Partial<Procedure> & { steps?: Partial<Procedure['steps'][0]>[] }) =>
      request<Procedure>('/api/procedures', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Procedure> & { steps?: Partial<Procedure['steps'][0]>[] }) =>
      request<Procedure>(`/api/procedures/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/api/procedures/${id}`, { method: 'DELETE' }),
  },

  stats: {
    get: () => request<Stats>('/api/stats'),
  },
};
