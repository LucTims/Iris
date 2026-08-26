import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur de chargement');
  return data;
});

export function useAdminStats() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/overview', fetcher, {
    refreshInterval: 60000, // Rafraîchir toutes les minutes
  });

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  };
}

export function useAdminUsers(fallbackData?: any[]) {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/users', fetcher, {
    revalidateOnFocus: true,
    fallbackData,
  });

  return {
    users: data?.users || [],
    isLoading,
    error,
    mutate,
  };
}