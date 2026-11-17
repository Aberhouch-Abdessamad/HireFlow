import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Offer, OfferAction, OfferPayload } from './types';

export const offerKeys = {
  all: ['offers'] as const,
  list: (params: api.OfferListParams) => [...offerKeys.all, 'list', params] as const,
  detail: (id: number) => [...offerKeys.all, 'detail', id] as const,
};

export function useOffers(params: api.OfferListParams, enabled = true) {
  return useQuery({
    queryKey: offerKeys.list(params),
    queryFn: () => api.fetchOffers(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOffer(id: number) {
  return useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: () => api.fetchOffer(id),
    enabled: Number.isFinite(id),
  });
}

function useOfferChanged() {
  const queryClient = useQueryClient();
  return (offer: Offer) => {
    queryClient.setQueryData(offerKeys.detail(offer.id), offer);
    void queryClient.invalidateQueries({ queryKey: [...offerKeys.all, 'list'] });
    // Sending moves the application to Offer; accepting marks it Hired.
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
  };
}

export function useSaveOffer() {
  const changed = useOfferChanged();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: OfferPayload }) =>
      api.saveOffer(id, payload),
    onSuccess: changed,
  });
}

export function useOfferAction() {
  const changed = useOfferChanged();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: number;
      action: OfferAction;
      body?: Record<string, string | null>;
    }) => api.offerAction(id, action, body),
    onSuccess: changed,
  });
}
