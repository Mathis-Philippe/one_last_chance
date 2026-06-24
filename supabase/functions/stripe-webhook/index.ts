// Supabase Edge Function (OPTIONNELLE) : enregistre les commandes payées dans la table `orders`.
// Sans elle, la boutique fonctionne quand même : les commandes restent visibles dans le
// tableau de bord Stripe. Avec elle, tu gardes aussi un historique dans Supabase.
// Déploiement : supabase functions deploy stripe-webhook --no-verify-jwt
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (e) {
    return new Response(`Webhook error: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ['line_items'] });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase.from('orders').insert({
      stripe_session_id: s.id,
      email: s.customer_details?.email ?? null,
      amount_total: s.amount_total,
      currency: s.currency,
      items: full.line_items?.data?.map((li) => ({
        name: li.description,
        qty: li.quantity,
        amount: li.amount_total,
      })) ?? [],
      shipping: (s as unknown as { shipping_details?: unknown }).shipping_details ?? null,
      status: 'paid',
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
