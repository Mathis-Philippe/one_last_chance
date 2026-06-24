-- ============================================================
--  PHASE 2b — Stockage des images (glisser-déposer dans l'admin)
--  À exécuter UNE FOIS dans : Supabase > SQL Editor > New query
-- ============================================================

-- Bucket public "media" : les images sont lisibles par tous (affichage du site),
-- mais seules les personnes connectées (admin) peuvent en téléverser.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Lecture publique des fichiers du bucket media
create policy "Lecture publique media"
on storage.objects for select
using (bucket_id = 'media');

-- Téléversement / modification / suppression réservés aux comptes connectés (admin)
create policy "Upload admin media"
on storage.objects for insert to authenticated
with check (bucket_id = 'media');

create policy "Update admin media"
on storage.objects for update to authenticated
using (bucket_id = 'media');

create policy "Delete admin media"
on storage.objects for delete to authenticated
using (bucket_id = 'media');
