export interface LeadRequest {
  id: string;
  name: string;
  phone: string;
  status: 'new' | 'done';
  createdAt: string;
}

export interface LeadDraft {
  name: string;
  phone: string;
}
