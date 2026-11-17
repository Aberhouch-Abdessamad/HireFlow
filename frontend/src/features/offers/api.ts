import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type { CandidateOffer, Offer, OfferAction, OfferPayload, OfferStatus } from './types';

export interface OfferListParams {
  page: number;
  per_page: number;
  status?: OfferStatus;
  application_id?: number;
  search?: string;
}

export async function fetchOffers(params: OfferListParams): Promise<Paginated<Offer>> {
  return (await http.get<Paginated<Offer>>('/offers', { params })).data;
}

export async function fetchOffer(id: number): Promise<Offer> {
  return (await http.get<ApiResource<Offer>>(`/offers/${id}`)).data.data;
}

export async function saveOffer(id: number | undefined, payload: OfferPayload): Promise<Offer> {
  const response =
    id === undefined
      ? await http.post<ApiResource<Offer>>('/offers', payload)
      : await http.put<ApiResource<Offer>>(`/offers/${id}`, payload);
  return response.data.data;
}

export async function offerAction(
  id: number,
  action: OfferAction,
  body: Record<string, string | null> = {},
): Promise<Offer> {
  return (await http.post<ApiResource<Offer>>(`/offers/${id}/${action}`, body)).data.data;
}

export async function fetchOfferByToken(token: string): Promise<CandidateOffer> {
  return (
    await http.get<ApiResource<CandidateOffer>>(`/public/offers/${encodeURIComponent(token)}`)
  ).data.data;
}

export async function respondByToken(
  token: string,
  decision: 'accept' | 'decline',
  note: string | null,
): Promise<CandidateOffer> {
  return (
    await http.post<ApiResource<CandidateOffer>>(
      `/public/offers/${encodeURIComponent(token)}/${decision}`,
      { note },
    )
  ).data.data;
}
