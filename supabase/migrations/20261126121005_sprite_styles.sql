-- Estilos de sprite da ficha (Configurações → Preferências): 2D, 2D animado, 3D animado e estática.
-- O antigo 'animated' era o animado do Showdown, que agora se chama '3d-animated'.
alter table public.user_settings drop constraint user_settings_sprite_style;

update public.user_settings set sprite_style = '3d-animated' where sprite_style = 'animated';

alter table public.user_settings
  alter column sprite_style set default '3d-animated',
  add constraint user_settings_sprite_style check (sprite_style in ('2d', '2d-animated', '3d-animated', 'static'));
