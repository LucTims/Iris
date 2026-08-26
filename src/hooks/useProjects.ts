import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Erreur de chargement');
  return res.json();
});

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR('/api/projects', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    projects: data?.projects || [],
    isLoading,
    error,
    mutate,
  };
}