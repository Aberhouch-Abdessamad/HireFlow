import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const portalKeys = {
  all: ['portal'] as const,
  applications: () => [...portalKeys.all, 'applications'] as const,
  application: (id: number) => [...portalKeys.all, 'application', id] as const,
  offers: () => [...portalKeys.all, 'offers'] as const,
  profile: () => [...portalKeys.all, 'profile'] as const,
  documents: () => [...portalKeys.all, 'documents'] as const,
};

export const useMyApplications = () =>
  useQuery({ queryKey: portalKeys.applications(), queryFn: api.fetchMyApplications });
export const useMyApplication = (id: number) =>
  useQuery({ queryKey: portalKeys.application(id), queryFn: () => api.fetchMyApplication(id) });
export const useMyOffers = () =>
  useQuery({ queryKey: portalKeys.offers(), queryFn: api.fetchMyOffers });
export const useMyProfile = () =>
  useQuery({ queryKey: portalKeys.profile(), queryFn: api.fetchMyProfile });
export const useMyDocuments = () =>
  useQuery({ queryKey: portalKeys.documents(), queryFn: api.fetchMyDocuments });

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: number;
      decision: 'accept' | 'decline';
      note: string | null;
    }) => api.respondToOffer(id, decision, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalKeys.all }),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(portalKeys.profile(), profile);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useUploadMyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, file }: { applicationId: number; file: File }) =>
      api.uploadMyDocument(applicationId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portalKeys.documents() }),
  });
}
