-- Site Secretary — seed data
-- Run AFTER 0001_init.sql AND after creating your first auth user.
-- Replace OWNER_USER_ID below with your actual auth.users.id (find in Supabase Auth > Users).

-- =========================================================
-- 1. CATALOGS (no user dependency — safe to run any time)
-- =========================================================

insert into activities (slug, name_en, name_ar, sort_order) values
  ('lifting',                'Lifting',                       'الرفع',                              1),
  ('working_at_height',      'Working at Height',             'العمل في المرتفعات',                  2),
  ('excavation',             'Excavation',                    'الحفر',                              3),
  ('civil_work',             'Civil Work',                    'الأعمال المدنية',                    4),
  ('concrete_pouring',       'Concrete Pouring',              'صب الخرسانة',                        5),
  ('form_work',              'Formwork',                      'القوالب',                            6),
  ('steel_shuttering',       'Steel & Shuttering',            'الحديد والقوالب الفولاذية',          7),
  ('scaffolding',            'Scaffolding',                   'السقالات',                           8),
  ('confined_space',         'Confined Space',                'الأماكن المغلقة',                    9),
  ('overhead_power_lines',   'Working near Overhead Power',   'العمل قرب خطوط الكهرباء العلوية',   10),
  ('batching_plant',         'Batching Plant',                'محطة الخلط',                        11),
  ('welding_cutting',        'Welding & Cutting',             'اللحام والقطع',                     12),
  ('pipe_coating',           'Pipe Coating',                  'طلاء الأنابيب',                     13),
  ('sandblasting',           'Sandblasting',                  'السفع الرملي',                      14),
  ('working_in_heat',        'Working in the Heat',           'العمل في الحرارة',                  15),
  ('concrete_isolation',     'Concrete Isolation',            'عزل الخرسانة',                      16),
  ('concrete_precast',       'Concrete Precast',              'الخرسانة سابقة الصب',               17)
on conflict (slug) do nothing;

insert into equipment (slug, name_en, name_ar, sort_order) values
  ('loaders',             'Loaders',             'لوادر',                  1),
  ('excavators',          'Excavators',          'حفّارات',                2),
  ('cranes',              'Cranes',              'رافعات',                 3),
  ('bulldozers',          'Bulldozers',          'بلدوزرات',               4),
  ('bobcats',             'Bobcats',             'بوبكات',                 5),
  ('jcb',                 'JCB',                 'JCB',                    6),
  ('welding_machines',    'Welding Machines',    'ماكينات اللحام',         7),
  ('generators',          'Generators',          'مولدات',                 8),
  ('ventilators',         'Ventilators',         'مراوح التهوية',          9),
  ('boom_trucks',         'Boom Trucks',         'شاحنات الرافعات',       10),
  ('trailers',            'Trailers',            'مقطورات',               11),
  ('dump_trucks',         'Dump Trucks',         'شاحنات قلابة',          12),
  ('low_bed_trailers',    'Low Bed Trailers',    'مقطورات منخفضة',        13),
  ('pickups',             'Pickups',             'سيارات بيك أب',         14),
  ('buses',               'Buses',               'حافلات',                15),
  ('concrete_pumps',      'Concrete Pumps',      'مضخات خرسانة',          16),
  ('concrete_mixers',     'Concrete Mixers',     'خلاطات خرسانة',         17),
  ('hand_tools',          'Hand Tools',          'عدد يدوية',             18),
  ('distribution_panels', 'Distribution Panels', 'لوحات توزيع كهرباء',    19),
  ('electrical_wiring',   'Electrical Wiring',   'أسلاك كهربائية',        20),
  ('cable_tray',          'Cable Tray',          'حامل الكابلات',         21)
on conflict (slug) do nothing;

insert into welfare_items (slug, name_en, name_ar, sort_order) values
  ('rest_shelters',           'Rest Shelters',           'أكشاك الاستراحة',     1),
  ('smoking_shelters',        'Smoking Shelters',        'أكشاك التدخين',       2),
  ('toilets',                 'Toilets',                 'دورات المياه',        3),
  ('drinking_water_stations', 'Drinking Water Stations', 'محطات مياه الشرب',    4),
  ('hard_barriers',           'Hard Barriers',           'الحواجز الصلبة',      5),
  ('assembly_points',         'Assembly Points',         'نقاط التجمع',         6)
on conflict (slug) do nothing;

-- =========================================================
-- 2. PROJECT + HIERARCHY
-- =========================================================
-- IMPORTANT: replace this placeholder with your real user id.
-- Find it under Supabase dashboard > Authentication > Users.

do $$
declare
  owner uuid := '34d1f794-6095-49a6-b48d-a7c1f4449d8c';
  proj_id uuid;
  a1_id uuid;
  a2_id uuid;
begin
  -- Skip if this owner has already been seeded (idempotent re-runs)
  if exists (select 1 from projects where owner_id = owner) then
    raise notice 'Project for owner % already exists. Skipping.', owner;
    return;
  end if;

  -- Project
  insert into projects (owner_id, name, description)
  values (owner,
          'OTG Water Transmission System',
          'NEOM potable water transmission — twin DN2000 mm pipelines, ~65 km along the KSA Red Sea west coast.')
  returning id into proj_id;

  -- Alignment 1 (10 sections, 0 → 64,970 m)
  insert into alignments (project_id, kind, code, name_en, name_ar, sort_order)
  values (proj_id, 'alignment', 'A1', 'Alignment 1', 'المسار 1', 1)
  returning id into a1_id;

  insert into sections (alignment_id, number, km_start_m, km_end_m) values
    (a1_id,  1,     0,  6150),
    (a1_id,  2,  6150, 14800),
    (a1_id,  3, 14800, 18750),
    (a1_id,  4, 18750, 24750),
    (a1_id,  5, 24750, 35150),
    (a1_id,  6, 35150, 42200),
    (a1_id,  7, 42200, 48300),
    (a1_id,  8, 48300, 52800),
    (a1_id,  9, 52800, 60800),
    (a1_id, 10, 60800, 64970);

  -- Alignment 2 (5 sections, 0 → 34,685 m)
  insert into alignments (project_id, kind, code, name_en, name_ar, sort_order)
  values (proj_id, 'alignment', 'A2', 'Alignment 2', 'المسار 2', 2)
  returning id into a2_id;

  insert into sections (alignment_id, number, km_start_m, km_end_m) values
    (a2_id, 1,     0,  7500),
    (a2_id, 2,  7500, 15700),
    (a2_id, 3, 15700, 24200),
    (a2_id, 4, 24200, 30750),
    (a2_id, 5, 30750, 34685);

  -- Laydowns LD1..LD6
  insert into alignments (project_id, kind, code, name_en, name_ar, sort_order) values
    (proj_id, 'laydown', 'LD1', 'Laydown 1', 'مخزن 1',  3),
    (proj_id, 'laydown', 'LD2', 'Laydown 2', 'مخزن 2',  4),
    (proj_id, 'laydown', 'LD3', 'Laydown 3', 'مخزن 3',  5),
    (proj_id, 'laydown', 'LD4', 'Laydown 4', 'مخزن 4',  6),
    (proj_id, 'laydown', 'LD5', 'Laydown 5', 'مخزن 5',  7),
    (proj_id, 'laydown', 'LD6', 'Laydown 6', 'مخزن 6',  8);

  -- Main Pumping Station
  insert into alignments (project_id, kind, code, name_en, name_ar, sort_order)
  values (proj_id, 'pumping_station', 'PS', 'Main Pumping Station', 'محطة الضخ الرئيسية', 9);

  raise notice 'Seeded project % with hierarchy.', proj_id;
end $$;
