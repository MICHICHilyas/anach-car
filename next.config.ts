import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /*
       * Les server actions acceptent 1 Mo par défaut. Or une réservation
       * transporte deux photos de pièces d'identité, et un téléphone récent
       * produit des images de 3 à 5 Mo chacune : la requête était rejetée
       * avant même d'atteindre le code, sans trace ni en base ni dans les
       * logs — le client voyait seulement « une erreur est survenue ».
       *
       * Les images sont désormais compressées dans le navigateur avant
       * l'envoi ; cette marge couvre les cas que la compression ne suffit
       * pas à ramener sous la limite.
       */
      bodySizeLimit: "12mb",
    },
  },

  images: {
    /**
     * Les photos de véhicules sont servies :
     *  - en développement, par /api/media/… (chemin local, rien à déclarer) ;
     *  - en production, par Vercel Blob si STORAGE_DRIVER=vercel-blob.
     */
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // En-têtes de sécurité appliqués à toutes les réponses.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
