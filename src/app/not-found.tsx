import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[100px] -z-10"></div>
      
      <div className="text-center p-8 max-w-lg">
        <span className="material-symbols-outlined text-[120px] text-secondary opacity-80 mb-6">explore_off</span>
        <h1 className="font-heading text-6xl font-extrabold text-on-surface mb-4">404</h1>
        <h2 className="font-heading text-2xl font-bold text-on-surface mb-4">Page introuvable</h2>
        <p className="text-on-surface-variant mb-8 leading-relaxed">
          Il semble que vous vous soyez perdu dans le désert. La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/">
          <button className="bg-secondary text-white font-heading font-bold text-lg px-8 py-4 rounded-xl shadow-md hover:bg-secondary/90 transition-all">
            Retour à l&apos;accueil
          </button>
        </Link>
      </div>
    </div>
  );
}
