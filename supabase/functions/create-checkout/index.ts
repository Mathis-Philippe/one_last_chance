// Supabase Edge Function : crée une session de paiement Stripe Checkout.
// Sécurité : les prix ne viennent JAMAIS du navigateur, ils sont relus en base.
// Déploiement : supabase functions deploy create-checkout --no-verify-jwt
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { items, origin } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Panier vide.' }, 400);
    }

    // Connexion à la base avec la clé service_role (contourne la RLS, côté serveur uniquement)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const ids = items.map((i: { id: string }) => i.id);
    const { data: products, error } = await supabase.from('merch').select('*').in('id', ids);
    if (error) throw error;

    // Construction des lignes à partir des prix RÉELS en base
    const line_items = [];
    for (const it of items) {
      const p = (products || []).find((pr) => String(pr.id) === String(it.id));
      if (!p || !p.price_cents) continue;
      const qty = Math.max(1, Math.min(20, parseInt(it.qty) || 1));
      line_items.push({
        quantity: qty,
        price_data: {
          currency: p.currency || 'eur',
          unit_amount: p.price_cents,
          product_data: {
            name: p.name,
            images: p.img ? [p.img] : [],
            ...(p.description ? { description: p.description } : {}),
          },
        },
      });
    }
    if (line_items.length === 0) return json({ error: 'Aucun article valide.' }, 400);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const baseUrl = origin || Deno.env.get('SITE_URL') || '';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      // Collecte de l'adresse de livraison (pays autorisés — ajuste si besoin)
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'DE', 'NL', 'ES', 'IT', 'GB', 'PT', 'IE', 'AT'],
      },
      phone_number_collection: { enabled: true },
      // Génère une facture et l'envoie par email à l'acheteur (preuve d'achat)
      invoice_creation: { enabled: true },
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    });

    return json({ url: checkoutSession.url }, 200);
  } catch (e) {
    return json({ error: (e as Error).message || 'Erreur serveur.' }, 500);
  }
});
