import useSWR, { preload } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Erreur de chargement');
  return res.json();
});

export const preloadProjects = () => preload('/api/projects', fetcher);

// Les lignes renvoyées par /api/projects ne sont pas encore typées côté client :
// on expose au moins un tableau, pour que les callbacks (map, filter) soient typés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectRow = any;

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<{ projects?: ProjectRow[] }>('/api/projects', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });

  return {
    projects: data?.projects || [],
    isLoading,
    error,
    mutate,
  };
}
