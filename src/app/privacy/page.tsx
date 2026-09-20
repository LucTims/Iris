import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Iris",
  description: "Comment nous protégeons vos données et vos manuscrits.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Sécurité & Confidentialité"
      subtitle="La sécurité de vos manuscrits et de vos données personnelles est notre priorité absolue. Nous construisons nos services avec un engagement total pour la protection de la propriété intellectuelle."
      updatedAt="15 mars 2026"
      activeHref="/privacy"
      showSecurityGrid={true}
    >
      <LegalSection number={1} title="L'engagement fondamental d'Iris">
        <p>
          Chez Iris, nous savons qu'un auteur confie plus que de simples données : il confie son œuvre, 
          ses idées et sa propriété intellectuelle. C'est pourquoi notre architecture entière repose sur un 
          principe fondamental : <strong>vos écrits vous appartiennent et restent confidentiels</strong>.
        </p>
        <p>
          Nos systèmes sont conçus de manière à isoler techniquement vos manuscrits, afin que même 
          notre équipe technique n'y ait pas accès sans votre demande explicite dans le cadre d'un support.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Données collectées et finalités">
        <p>
          Nous collectons uniquement les informations strictement nécessaires pour vous fournir nos services 
          et garantir leur sécurité :
        </p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li><strong>Données de profil</strong> : Votre nom/pseudonyme et votre adresse e-mail pour sécuriser votre compte.</li>
          <li><strong>Données de manuscrit</strong> : Le texte de vos chapitres, les plans et les métadonnées de vos livres pour assurer le bon fonctionnement de l'éditeur et des exportations.</li>
          <li><strong>Préférences de génération</strong> : Vos choix de style, ton et options IA afin de personnaliser vos résultats.</li>
          <li><strong>Données de connexion</strong> : Adresses IP et journaux techniques, pour détecter et prévenir toute tentative d'intrusion.</li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Rôle des intelligences artificielles">
        <p>
          Iris fait appel à des <strong>modèles linguistiques avancés (LLM)</strong> fournis par des partenaires technologiques de premier plan pour vous assister dans la rédaction.
        </p>
        <p>
          <strong>Aucun de nos fournisseurs d'IA n'a l'autorisation d'utiliser vos manuscrits pour entraîner ses modèles publics.</strong> 
          Les textes que vous soumettez à la génération sont transmis via des canaux sécurisés et chiffrés, traités en mémoire pour vous fournir une réponse immédiate, puis supprimés de leurs serveurs de traitement (politique dite "zero data retention"). 
          Votre œuvre ne sera jamais régurgitée à un autre utilisateur par l'IA.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Infrastructures et Sous-traitants">
        <p>
          Pour maintenir un service performant et sécurisé, nous collaborons avec des prestataires d'infrastructure de classe mondiale, rigoureusement sélectionnés pour leurs standards de sécurité (certifications SOC 2, ISO 27001).
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="pb-3 pr-4 font-bold text-neutral-900 dark:text-neutral-100">Catégorie de service</th>
                <th className="pb-3 pr-4 font-bold text-neutral-900 dark:text-neutral-100">Rôle et Sécurité</th>
                <th className="pb-3 font-bold text-neutral-900 dark:text-neutral-100">Données traitées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[
                ["Infrastructure Cloud & Bases de données", "Stockage sécurisé, authentification, sauvegardes chiffrées", "Compte, manuscrits, fichiers"],
                ["Hébergement applicatif", "Déploiement et distribution du trafic", "Journaux techniques, adresses IP"],
                ["Moteurs d'Intelligence Artificielle", "Traitement linguistique et génération textuelle", "Requêtes de génération"],
                ["Passerelles de paiement certifiées", "Traitement des transactions (PCI-DSS)", "Adresse e-mail, montant (aucune CB stockée)"],
                ["Outils de mesure d'audience", "Analyses agrégées et anonymisées", "Données de navigation (sans cookie tiers)"],
              ].map(([category, role, data]) => (
                <tr key={category} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-neutral-800 dark:text-neutral-200">{category}</td>
                  <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">{role}</td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection number={5} title="Transactions et Données bancaires">
        <p>
          Vos transactions financières bénéficient du niveau de sécurité le plus élevé. 
          <strong>Vos coordonnées bancaires (numéro de carte, CVV) ne transitent jamais par les serveurs d'Iris</strong> 
          et n'y sont jamais stockées.
        </p>
        <p>
          Le paiement s'effectue intégralement sur les plateformes certifiées de nos partenaires de paiement (conformité PCI-DSS de niveau 1). 
          Nous ne recevons en retour qu'une confirmation de transaction signée cryptographiquement, nous permettant de débloquer vos fonctionnalités.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Sécurité et Partage (Automatisations MCP)">
        <p>
          Si vous utilisez les fonctionnalités pour développeurs et connectez un assistant IA externe (via le protocole MCP), 
          la clé secrète générée donne un accès direct à vos livres. 
        </p>
        <p>
          Nous ne conservons dans notre base qu'une <strong>empreinte cryptographique (hash SHA-256)</strong> de cette clé. 
          Il nous est mathématiquement impossible de reconstituer votre clé en clair. Si vous la perdez ou suspectez une fuite, 
          révoquez-la depuis votre espace : l'ancienne clé sera immédiatement désactivée.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Conservation et Suppression des Données">
        <p>Nous appliquons des règles strictes sur le cycle de vie de vos informations :</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li><strong>Compte actif</strong> : Les données de vos livres sont conservées et sauvegardées tant que votre compte existe.</li>
          <li><strong>Suppression de compte</strong> : Tous vos manuscrits, fichiers et données de profil sont irrémédiablement effacés de nos bases actives. (Seules les écritures comptables anonymisées sont conservées pour répondre aux obligations légales).</li>
          <li><strong>Journaux de sécurité</strong> : Conservés de manière temporaire puis purgés automatiquement.</li>
        </ul>
      </LegalSection>

      <LegalSection number={8} title="Vos Droits (RGPD)">
        <p>
          Vous conservez un contrôle absolu sur vos données. Conformément aux réglementations sur la protection des données (notamment le RGPD européen), vous disposez des droits suivants :
        </p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li><strong>Droit d'accès et de rectification</strong> : Modifiez vos données depuis votre tableau de bord.</li>
          <li><strong>Droit à la portabilité</strong> : Exportez vos manuscrits (PDF, DOCX, EPUB) à tout moment.</li>
          <li><strong>Droit à l'effacement</strong> : Supprimez un livre ou votre compte complet d'un simple clic.</li>
        </ul>
        <p className="mt-3">
          Pour exercer un droit spécifique qui ne serait pas réalisable depuis l'interface, contactez notre équipe technique via le support intégré.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
