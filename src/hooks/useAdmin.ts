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
export function useAdminProjects() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/projects', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    projects: data?.projects || [],
    isLoading,
    error,
    mutate,
  };
}

export function useAdminTransactions() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/transactions', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    transactions: data?.transactions || [],
    isLoading,
    error,
    mutate,
  };
}

export function useAdminLedger() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/ledger', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    ledger: data?.ledger || [],
    isLoading,
    error,
    mutate,
  };
}