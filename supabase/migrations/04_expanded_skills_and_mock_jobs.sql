-- ============================================================
-- WORKMATCH: Migration 04
-- Expanded Skills Taxonomy + Mock Job Data
-- ============================================================

-- ============================================================
-- PART A: Widen skills.category CHECK constraint
-- ============================================================

ALTER TABLE public.skills
  DROP CONSTRAINT IF EXISTS skills_category_check;

ALTER TABLE public.skills
  ADD CONSTRAINT skills_category_check CHECK (
    category IN (
      'Technical',
      'Framework',
      'Programming Language',
      'Soft Skill',
      'Tool',
      'Database',
      'Cloud & DevOps',
      'Design',
      'Graphic Design',
      'Customer Service',
      'Food Service',
      'Construction',
      'Office & Administration',
      'Microsoft Office',
      'Technician',
      'IT Support',
      'Other'
    )
  );

-- ============================================================
-- PART B: Seed new skills (all categories)
-- ============================================================

INSERT INTO public.skills (name, category) VALUES

-- GRAPHIC DESIGN
('Adobe Photoshop', 'Graphic Design'),
('Adobe Illustrator', 'Graphic Design'),
('Adobe InDesign', 'Graphic Design'),
('Adobe Lightroom', 'Graphic Design'),
('Adobe After Effects', 'Graphic Design'),
('Adobe Premiere Pro', 'Graphic Design'),
('Canva', 'Graphic Design'),
('CorelDRAW', 'Graphic Design'),
('Color Theory', 'Graphic Design'),
('Typography', 'Graphic Design'),
('Brand Identity Design', 'Graphic Design'),
('Print Design', 'Graphic Design'),
('Social Media Graphics', 'Graphic Design'),
('Mockup Design', 'Graphic Design'),
('Motion Graphics', 'Graphic Design'),

-- CUSTOMER SERVICE / CALL CENTER
('Phone Etiquette', 'Customer Service'),
('Inbound Call Handling', 'Customer Service'),
('Outbound Calling', 'Customer Service'),
('Live Chat Support', 'Customer Service'),
('Email Support', 'Customer Service'),
('CRM Software', 'Customer Service'),
('Zendesk', 'Customer Service'),
('Freshdesk', 'Customer Service'),
('Active Listening', 'Customer Service'),
('Conflict Resolution', 'Customer Service'),
('Customer Retention', 'Customer Service'),
('Upselling & Cross-selling', 'Customer Service'),
('Technical Support (L1)', 'Customer Service'),
('Bilingual Support (English/Filipino)', 'Customer Service'),
('Salesforce CRM', 'Customer Service'),
('SLA Compliance', 'Customer Service'),

-- FOOD SERVICE
('Food Safety & Sanitation', 'Food Service'),
('Food Preparation', 'Food Service'),
('Cashiering', 'Food Service'),
('POS Systems', 'Food Service'),
('Customer Order Taking', 'Food Service'),
('Barista Skills', 'Food Service'),
('Food Plating', 'Food Service'),
('Kitchen Equipment Operation', 'Food Service'),
('Inventory & Stock Management', 'Food Service'),
('FIFO Stock Rotation', 'Food Service'),
('Baking & Pastry', 'Food Service'),
('Cooking (Filipino Cuisine)', 'Food Service'),
('Cooking (Western Cuisine)', 'Food Service'),
('Drive-Through Operations', 'Food Service'),

-- CONSTRUCTION
('Blueprint Reading', 'Construction'),
('Masonry', 'Construction'),
('Carpentry', 'Construction'),
('Electrical Wiring', 'Construction'),
('Plumbing', 'Construction'),
('Welding', 'Construction'),
('Steel Fixing / Rebaring', 'Construction'),
('Scaffolding', 'Construction'),
('Concrete Works', 'Construction'),
('Tile Setting', 'Construction'),
('Painting & Finishing', 'Construction'),
('Heavy Equipment Operation', 'Construction'),
('Safety & OSHAS Protocols', 'Construction'),
('Site Surveying', 'Construction'),
('Roofing', 'Construction'),

-- OFFICE & ADMINISTRATION
('Data Entry', 'Office & Administration'),
('Typing (60+ WPM)', 'Office & Administration'),
('Filing & Records Management', 'Office & Administration'),
('Document Scanning & Archiving', 'Office & Administration'),
('Transcription', 'Office & Administration'),
('Scheduling & Calendar Management', 'Office & Administration'),
('Office Administration', 'Office & Administration'),
('Bookkeeping Basics', 'Office & Administration'),
('Business Correspondence', 'Office & Administration'),
('10-Key Data Entry', 'Office & Administration'),

-- MICROSOFT OFFICE
('Microsoft Word', 'Microsoft Office'),
('Microsoft Excel', 'Microsoft Office'),
('Microsoft PowerPoint', 'Microsoft Office'),
('Microsoft Outlook', 'Microsoft Office'),
('Microsoft Teams', 'Microsoft Office'),
('Microsoft Access', 'Microsoft Office'),
('Microsoft SharePoint', 'Microsoft Office'),
('Microsoft OneDrive', 'Microsoft Office'),
('Excel Pivot Tables', 'Microsoft Office'),
('Excel Formulas & VLOOKUP', 'Microsoft Office'),

-- TECHNICIAN
('Hardware Troubleshooting', 'Technician'),
('Device Repair (Smartphones)', 'Technician'),
('Laptop & Desktop Repair', 'Technician'),
('Circuit Board Soldering', 'Technician'),
('HVAC Installation & Repair', 'Technician'),
('Appliance Repair', 'Technician'),
('Electrical Troubleshooting', 'Technician'),
('CCTV & Security Camera Setup', 'Technician'),
('Printer & Copier Maintenance', 'Technician'),
('Electronics Diagnosis', 'Technician'),
('Aircon Cleaning & Servicing', 'Technician'),

-- IT SUPPORT
('Network Troubleshooting', 'IT Support'),
('Help Desk Support', 'IT Support'),
('Active Directory', 'IT Support'),
('Windows Server Administration', 'IT Support'),
('VPN Setup & Configuration', 'IT Support'),
('IT Ticketing Systems (JIRA, ServiceNow)', 'IT Support'),
('LAN/WAN Networking', 'IT Support'),
('Network Switch & Router Config', 'IT Support'),
('Remote Desktop Support', 'IT Support'),
('Antivirus & Endpoint Security', 'IT Support'),
('OS Installation (Windows/Linux)', 'IT Support'),
('Microsoft 365 Administration', 'IT Support'),

-- EXTRA PROGRAMMING LANGUAGES
('C#', 'Programming Language'),
('C++', 'Programming Language'),
('Kotlin', 'Programming Language'),
('Swift', 'Programming Language'),
('Rust', 'Programming Language'),
('Ruby', 'Programming Language'),
('Dart / Flutter', 'Programming Language'),
('Bash / Shell Scripting', 'Programming Language'),

-- EXTRA SOFT SKILLS
('Communication Skills', 'Soft Skill'),
('Time Management', 'Soft Skill'),
('Attention to Detail', 'Soft Skill'),
('Problem Solving', 'Soft Skill'),
('Adaptability', 'Soft Skill'),
('Teamwork & Collaboration', 'Soft Skill'),
('Critical Thinking', 'Soft Skill'),
('Work Under Pressure', 'Soft Skill'),

-- EXTRA DESIGN TOOLS
('Adobe XD', 'Design'),
('Sketch', 'Design'),
('Prototyping', 'Design'),
('Wireframing', 'Design'),
('User Research', 'Design'),
('Accessibility Design', 'Design')

ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- PART C: Seed Mock Companies
-- ============================================================

DO $$
BEGIN
  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000001',
    'TechBridge Solutions',
    'techbridge-solutions',
    'A leading software development company in Cebu specializing in full-stack web applications, mobile apps, and enterprise software for clients across Southeast Asia.',
    'Software & Technology',
    'https://techbridge.ph',
    'Cebu City', 'Cebu', 10.3157, 123.8854, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000002',
    'CallConnect PH',
    'callconnect-ph',
    'One of the Philippines fastest-growing BPO companies providing world-class inbound and outbound customer service solutions to US and Australian clients.',
    'BPO / Call Center',
    'https://callconnectph.com',
    'Pasig City', 'Metro Manila', 14.5764, 121.0851, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000003',
    'Mang Juans Kitchen',
    'mang-juans-kitchen',
    'A beloved Filipino fast food chain known for affordable and delicious traditional Filipino meals. Operating 120+ branches nationwide.',
    'Food & Beverage',
    'https://mangjuanskitchen.ph',
    'Cebu City', 'Cebu', 10.3157, 123.8854, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000004',
    'BuildRight Construction',
    'buildright-construction',
    'A reputable construction company in Mindanao specializing in residential, commercial, and infrastructure projects. Committed to safety and quality craftsmanship.',
    'Construction & Real Estate',
    'https://buildright.ph',
    'Davao City', 'Davao del Sur', 7.1907, 125.4553, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000005',
    'PixelForge Creative',
    'pixelforge-creative',
    'A premium creative agency in Makati offering branding, graphic design, video production, and digital marketing services to local and international clients.',
    'Creative & Marketing',
    'https://pixelforge.ph',
    'Makati City', 'Metro Manila', 14.5547, 121.0244, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000006',
    'DataCore IT Services',
    'datacore-it-services',
    'A trusted IT services provider in BGC offering managed IT support, network infrastructure, and cloud solutions to SMEs and enterprise clients across the Philippines.',
    'IT Services',
    'https://datacoreit.ph',
    'Taguig / BGC', 'Metro Manila', 14.5492, 121.0509, true
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (id, name, slug, description, industry, website, city, province, latitude, longitude, verified)
  VALUES (
    '11111111-0000-0000-0000-000000000007',
    'OfficeFlow Manila',
    'officeflow-manila',
    'A premier business process outsourcing firm specializing in back-office operations, data encoding, document processing, and administrative support services.',
    'Administrative Services',
    'https://officeflowmanila.com',
    'Manila', 'Metro Manila', 14.5995, 120.9842, true
  ) ON CONFLICT (slug) DO NOTHING;
END $$;


-- ============================================================
-- PART D: Seed Mock Jobs + Job Skills
-- ============================================================

DO $$
DECLARE
  v_employer_id UUID;
  c_techbridge UUID := '11111111-0000-0000-0000-000000000001';
  c_callconnect UUID := '11111111-0000-0000-0000-000000000002';
  c_mangjuan UUID := '11111111-0000-0000-0000-000000000003';
  c_buildright UUID := '11111111-0000-0000-0000-000000000004';
  c_pixelforge UUID := '11111111-0000-0000-0000-000000000005';
  c_datacore UUID := '11111111-0000-0000-0000-000000000006';
  c_officeflow UUID := '11111111-0000-0000-0000-000000000007';
  s_react UUID; s_nextjs UUID; s_typescript UUID; s_javascript UUID;
  s_nodejs UUID; s_postgresql UUID; s_docker UUID; s_git UUID;
  s_restapi UUID; s_figma UUID; s_agile UUID; s_python UUID;
  s_uiux UUID; s_photoshop UUID; s_illustrator UUID; s_canva UUID;
  s_after_effects UUID; s_premiere UUID; s_indesign UUID;
  s_phone_etiquette UUID; s_inbound UUID; s_outbound UUID;
  s_crm UUID; s_zendesk UUID; s_conflict_res UUID; s_active_listen UUID;
  s_food_safety UUID; s_food_prep UUID; s_cashiering UUID;
  s_pos UUID; s_order_taking UUID;
  s_blueprint UUID; s_masonry UUID; s_carpentry UUID;
  s_welding UUID; s_safety_proto UUID;
  s_data_entry UUID; s_typing UUID;
  s_ms_word UUID; s_ms_excel UUID; s_ms_ppt UUID;
  s_ms_outlook UUID; s_ms_teams UUID;
  s_hw_troubleshoot UUID; s_laptop_repair UUID;
  s_network UUID; s_help_desk UUID; s_active_dir UUID;
  s_win_server UUID; s_ticketing UUID; s_vpn UUID;
  s_communication UUID; s_attention UUID;
  s_problem_solving UUID; s_teamwork UUID; s_time_mgmt UUID;
BEGIN
  -- Resolve employer_id
  SELECT id INTO v_employer_id FROM public.profiles WHERE role IN ('employer', 'admin') LIMIT 1;
  IF v_employer_id IS NULL THEN
    v_employer_id := '00000000-0000-0000-0000-000000000001';
    INSERT INTO public.profiles (id, email, first_name, last_name, role, status)
    VALUES (v_employer_id, 'system@workmatch.ph', 'WorkMatch', 'System', 'admin', 'active')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Resolve skill UUIDs
  SELECT id INTO s_react FROM public.skills WHERE name = 'React';
  SELECT id INTO s_nextjs FROM public.skills WHERE name = 'Next.js';
  SELECT id INTO s_typescript FROM public.skills WHERE name = 'TypeScript';
  SELECT id INTO s_javascript FROM public.skills WHERE name = 'JavaScript';
  SELECT id INTO s_nodejs FROM public.skills WHERE name = 'Node.js';
  SELECT id INTO s_postgresql FROM public.skills WHERE name = 'PostgreSQL';
  SELECT id INTO s_docker FROM public.skills WHERE name = 'Docker';
  SELECT id INTO s_git FROM public.skills WHERE name = 'Git & GitHub';
  SELECT id INTO s_restapi FROM public.skills WHERE name = 'REST APIs';
  SELECT id INTO s_figma FROM public.skills WHERE name = 'Figma';
  SELECT id INTO s_agile FROM public.skills WHERE name = 'Agile Scrum';
  SELECT id INTO s_python FROM public.skills WHERE name = 'Python';
  SELECT id INTO s_uiux FROM public.skills WHERE name = 'UI/UX Design';
  SELECT id INTO s_photoshop FROM public.skills WHERE name = 'Adobe Photoshop';
  SELECT id INTO s_illustrator FROM public.skills WHERE name = 'Adobe Illustrator';
  SELECT id INTO s_canva FROM public.skills WHERE name = 'Canva';
  SELECT id INTO s_after_effects FROM public.skills WHERE name = 'Adobe After Effects';
  SELECT id INTO s_premiere FROM public.skills WHERE name = 'Adobe Premiere Pro';
  SELECT id INTO s_indesign FROM public.skills WHERE name = 'Adobe InDesign';
  SELECT id INTO s_phone_etiquette FROM public.skills WHERE name = 'Phone Etiquette';
  SELECT id INTO s_inbound FROM public.skills WHERE name = 'Inbound Call Handling';
  SELECT id INTO s_outbound FROM public.skills WHERE name = 'Outbound Calling';
  SELECT id INTO s_crm FROM public.skills WHERE name = 'CRM Software';
  SELECT id INTO s_zendesk FROM public.skills WHERE name = 'Zendesk';
  SELECT id INTO s_conflict_res FROM public.skills WHERE name = 'Conflict Resolution';
  SELECT id INTO s_active_listen FROM public.skills WHERE name = 'Active Listening';
  SELECT id INTO s_food_safety FROM public.skills WHERE name = 'Food Safety & Sanitation';
  SELECT id INTO s_food_prep FROM public.skills WHERE name = 'Food Preparation';
  SELECT id INTO s_cashiering FROM public.skills WHERE name = 'Cashiering';
  SELECT id INTO s_pos FROM public.skills WHERE name = 'POS Systems';
  SELECT id INTO s_order_taking FROM public.skills WHERE name = 'Customer Order Taking';
  SELECT id INTO s_blueprint FROM public.skills WHERE name = 'Blueprint Reading';
  SELECT id INTO s_masonry FROM public.skills WHERE name = 'Masonry';
  SELECT id INTO s_carpentry FROM public.skills WHERE name = 'Carpentry';
  SELECT id INTO s_welding FROM public.skills WHERE name = 'Welding';
  SELECT id INTO s_safety_proto FROM public.skills WHERE name = 'Safety & OSHAS Protocols';
  SELECT id INTO s_data_entry FROM public.skills WHERE name = 'Data Entry';
  SELECT id INTO s_typing FROM public.skills WHERE name = 'Typing (60+ WPM)';
  SELECT id INTO s_ms_word FROM public.skills WHERE name = 'Microsoft Word';
  SELECT id INTO s_ms_excel FROM public.skills WHERE name = 'Microsoft Excel';
  SELECT id INTO s_ms_ppt FROM public.skills WHERE name = 'Microsoft PowerPoint';
  SELECT id INTO s_ms_outlook FROM public.skills WHERE name = 'Microsoft Outlook';
  SELECT id INTO s_ms_teams FROM public.skills WHERE name = 'Microsoft Teams';
  SELECT id INTO s_hw_troubleshoot FROM public.skills WHERE name = 'Hardware Troubleshooting';
  SELECT id INTO s_laptop_repair FROM public.skills WHERE name = 'Laptop & Desktop Repair';
  SELECT id INTO s_network FROM public.skills WHERE name = 'Network Troubleshooting';
  SELECT id INTO s_help_desk FROM public.skills WHERE name = 'Help Desk Support';
  SELECT id INTO s_active_dir FROM public.skills WHERE name = 'Active Directory';
  SELECT id INTO s_win_server FROM public.skills WHERE name = 'Windows Server Administration';
  SELECT id INTO s_ticketing FROM public.skills WHERE name = 'IT Ticketing Systems (JIRA, ServiceNow)';
  SELECT id INTO s_vpn FROM public.skills WHERE name = 'VPN Setup & Configuration';
  SELECT id INTO s_communication FROM public.skills WHERE name = 'Communication Skills';
  SELECT id INTO s_attention FROM public.skills WHERE name = 'Attention to Detail';
  SELECT id INTO s_problem_solving FROM public.skills WHERE name = 'Problem Solving';
  SELECT id INTO s_teamwork FROM public.skills WHERE name = 'Teamwork & Collaboration';
  SELECT id INTO s_time_mgmt FROM public.skills WHERE name = 'Time Management';

  -- JOB 1: Full Stack Developer @ TechBridge
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', c_techbridge, v_employer_id,
    'Full Stack Developer', 'full-stack-developer-techbridge-001',
    'TechBridge Solutions is looking for a talented Full Stack Developer to join our growing engineering team. You will work on exciting web applications for local and international clients using modern technologies.',
    E'Develop and maintain full-stack web applications using React and Node.js\nCollaborate with UI/UX designers and backend engineers\nWrite clean, maintainable, and well-tested code\nParticipate in code reviews and agile ceremonies\nOptimize application performance and scalability',
    E'2+ years of experience in full-stack development\nProficiency in React, TypeScript, and Node.js\nExperience with PostgreSQL or similar databases\nFamiliarity with REST APIs and Git workflows\nGood communication skills and a team-player mindset',
    60000, 90000, 'PHP', 'Full-time', 'Hybrid', 'Mid Level',
    'Cebu City', 'Cebu', 10.3157, 123.8854, 'published', 142,
    NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', s_react, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_typescript, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_nodejs, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_postgresql, false, 3),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_git, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_restapi, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000001', s_agile, false, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 2: Senior React Developer @ TechBridge
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000002', c_techbridge, v_employer_id,
    'Senior React Developer', 'senior-react-developer-techbridge-002',
    'We are seeking a Senior React Developer to lead our frontend development. You will architect and build high-performance, scalable UI systems that power our client projects.',
    E'Lead frontend architecture decisions for large-scale projects\nMentor junior developers and conduct code reviews\nBuild reusable component libraries and design systems\nIntegrate with RESTful and GraphQL APIs\nDrive performance optimization and accessibility improvements',
    E'4+ years of React experience\nDeep knowledge of TypeScript and modern JS ecosystem\nExperience with Next.js and server-side rendering\nStrong understanding of state management patterns\nAbility to work independently in a remote setting',
    70000, 100000, 'PHP', 'Full-time', 'Remote', 'Senior Level',
    'Cebu City', 'Cebu', 10.3157, 123.8854, 'published', 87,
    NOW() - INTERVAL '1 day', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000002', s_react, true, 5),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_nextjs, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_typescript, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_javascript, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_restapi, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_git, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000002', s_figma, false, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 3: Customer Service Representative @ CallConnect PH
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000003', c_callconnect, v_employer_id,
    'Customer Service Representative', 'customer-service-representative-callconnect-003',
    'CallConnect PH is hiring Customer Service Representatives to handle inbound queries from our US and Australian clients. Fresh graduates are welcome to apply. Full training provided.',
    E'Answer inbound calls and resolve customer concerns professionally\nDocument interactions accurately in the CRM system\nEscalate complex issues to the appropriate team\nMaintain a high customer satisfaction rating\nMeet daily call quota and quality metrics',
    E'Excellent English communication skills (verbal and written)\nHigh school graduate or above\nBasic computer literacy\nWilling to work on shifting schedules including weekends and holidays\nWith or without BPO experience',
    18000, 22000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Pasig City', 'Metro Manila', 14.5764, 121.0851, 'published', 312,
    NOW() - INTERVAL '5 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000003', s_phone_etiquette, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000003', s_inbound, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000003', s_crm, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000003', s_active_listen, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000003', s_conflict_res, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000003', s_communication, true, 4)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 4: Outbound Sales Agent @ CallConnect PH
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000004', c_callconnect, v_employer_id,
    'Outbound Sales Agent', 'outbound-sales-agent-callconnect-004',
    'Join our growing outbound sales team! You will contact potential customers to promote our clients products and services. Commission-based incentives on top of a competitive base salary.',
    E'Make outbound calls to prospective customers based on provided leads\nPresent and promote products/services persuasively\nMeet daily, weekly, and monthly sales targets\nRecord call outcomes and update leads database\nParticipate in ongoing sales training programs',
    E'Strong verbal English communication skills\nConfident and resilient personality\nSales experience is a plus but not required\nWillingness to work on US/AU time zones\nTarget-oriented mindset',
    20000, 25000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Pasig City', 'Metro Manila', 14.5764, 121.0851, 'published', 198,
    NOW() - INTERVAL '2 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000004', s_outbound, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000004', s_phone_etiquette, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000004', s_crm, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000004', s_communication, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000004', s_conflict_res, false, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 5: Service Crew / Cashier @ Mang Juans Kitchen
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000005', c_mangjuan, v_employer_id,
    'Service Crew / Cashier', 'service-crew-cashier-mangjuan-005',
    'Mang Juans Kitchen is expanding! We are looking for energetic and customer-friendly Service Crew members for our Cebu branches. No experience required - we provide full training.',
    E'Take customer orders accurately at the counter or drive-through\nOperate POS system and handle cash transactions\nPrepare and assemble food orders following standard recipes\nMaintain cleanliness and sanitation standards in the restaurant\nRestock supplies and assist in inventory counts',
    E'At least 18 years old\nHigh school graduate (college level preferred)\nWith pleasing personality and good customer service attitude\nWilling to work on shifting schedules including weekends and holidays\nNo work experience required',
    11000, 13000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Cebu City', 'Cebu', 10.3157, 123.8854, 'published', 504,
    NOW() - INTERVAL '7 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000005', s_cashiering, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000005', s_pos, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000005', s_order_taking, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000005', s_food_safety, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000005', s_communication, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000005', s_teamwork, true, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 6: Kitchen Staff @ Mang Juans Kitchen
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000006', c_mangjuan, v_employer_id,
    'Kitchen Staff', 'kitchen-staff-mangjuan-006',
    'We are looking for hardworking Kitchen Staff to join our back-of-house team. You will be responsible for food preparation and ensuring kitchen cleanliness and order.',
    E'Prepare ingredients and cook food items following standard recipes\nMaintain cleanliness of cooking stations and kitchen equipment\nFollow food safety and sanitation protocols strictly\nCoordinate with front-of-house staff for order fulfillment\nAssist in receiving and storing food deliveries',
    E'At least 18 years old\nCan work under pressure and in a fast-paced environment\nKnowledge of basic food preparation is an advantage\nPhysically fit and able to stand for long periods\nWilling to work on shifting schedules',
    10000, 12000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Cebu City', 'Cebu', 10.3157, 123.8854, 'published', 276,
    NOW() - INTERVAL '6 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000006', s_food_prep, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000006', s_food_safety, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000006', s_teamwork, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000006', s_attention, true, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 7: Construction Worker @ BuildRight
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000007', c_buildright, v_employer_id,
    'Construction Worker', 'construction-worker-buildright-007',
    'BuildRight Construction is hiring skilled construction workers for ongoing residential and commercial projects in Davao City. Competitive daily rates, SSS, PhilHealth, and Pag-IBIG benefits provided.',
    E'Perform general construction tasks including concrete works, masonry, and finishing\nFollow supervisor instructions and adhere to safety protocols\nOperate basic construction tools and equipment\nMaintain a clean and orderly work site\nReport site hazards and defects immediately',
    E'TESDA NC II certification preferred but not required\nAt least 1 year of construction experience preferred\nPhysically fit and able to work outdoors\nKnowledgeable in basic construction safety protocols\nWilling to be deployed to project sites in Davao',
    16000, 20000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Davao City', 'Davao del Sur', 7.1907, 125.4553, 'published', 189,
    NOW() - INTERVAL '4 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000007', s_masonry, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000007', s_safety_proto, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000007', s_teamwork, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000007', s_attention, true, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 8: Carpenter @ BuildRight
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000008', c_buildright, v_employer_id,
    'Carpenter', 'carpenter-buildright-008',
    'We are looking for an experienced Carpenter to handle formworks, interior finishing, furniture installation, and other carpentry needs across our active construction projects.',
    E'Perform formwork, shuttering, and concrete pouring support\nInstall doors, windows, cabinets, and other fixtures\nRead and interpret blueprints and construction drawings\nFabricate and repair wooden structures\nEnsure quality of carpentry works meets standards',
    E'At least 2 years of carpentry experience\nAble to read basic blueprints and measurements\nSkilled in using hand tools and power tools\nWith TESDA NC II in Carpentry (preferred)\nCan work with minimal supervision',
    18000, 22000, 'PHP', 'Full-time', 'On-site', 'Mid Level',
    'Davao City', 'Davao del Sur', 7.1907, 125.4553, 'published', 97,
    NOW() - INTERVAL '2 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000008', s_carpentry, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000008', s_blueprint, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000008', s_safety_proto, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000008', s_attention, true, 2)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 9: Graphic Designer @ PixelForge
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000009', c_pixelforge, v_employer_id,
    'Graphic Designer', 'graphic-designer-pixelforge-009',
    'PixelForge Creative is looking for a talented Graphic Designer to join our creative studio. You will work on branding, print, and digital materials for a diverse portfolio of clients.',
    E'Design logos, brand identities, packaging, and marketing collateral\nCreate social media graphics, digital ads, and email templates\nCollaborate with clients and account managers to understand design briefs\nPresent design concepts and incorporate feedback\nEnsure brand consistency across all deliverables',
    E'At least 2 years of professional graphic design experience\nProficiency in Adobe Photoshop, Illustrator, and InDesign\nStrong portfolio demonstrating versatile design work\nGood understanding of color theory and typography\nAbility to manage multiple projects and meet deadlines',
    25000, 40000, 'PHP', 'Full-time', 'Hybrid', 'Mid Level',
    'Makati City', 'Metro Manila', 14.5547, 121.0244, 'published', 231,
    NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000009', s_photoshop, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_illustrator, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_indesign, false, 3),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_canva, false, 3),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_figma, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_attention, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000009', s_communication, false, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 10: Video Editor @ PixelForge
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000010', c_pixelforge, v_employer_id,
    'Video Editor', 'video-editor-pixelforge-010',
    'We are looking for a skilled Video Editor to produce compelling video content for our clients brands, including social media videos, product ads, and corporate films.',
    E'Edit raw footage into polished, engaging video content\nAdd motion graphics, text overlays, transitions, and sound design\nWork with the creative team to develop video concepts and storyboards\nManage and organize video assets and project files\nDeliver content in required formats and specifications',
    E'At least 2 years of professional video editing experience\nProficiency in Adobe Premiere Pro and After Effects\nExperience with motion graphics and color grading\nStrong portfolio of edited videos\nAbility to work independently and manage deadlines remotely',
    22000, 35000, 'PHP', 'Full-time', 'Remote', 'Mid Level',
    'Makati City', 'Metro Manila', 14.5547, 121.0244, 'published', 164,
    NOW() - INTERVAL '1 day', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000010', s_premiere, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000010', s_after_effects, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000010', s_photoshop, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000010', s_attention, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000010', s_time_mgmt, true, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 11: IT Support Specialist @ DataCore IT
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000011', c_datacore, v_employer_id,
    'IT Support Specialist', 'it-support-specialist-datacore-011',
    'DataCore IT Services is seeking an IT Support Specialist to provide Level 1 and Level 2 technical assistance to our corporate clients. You will be part of a high-performing IT support team in BGC.',
    E'Respond to IT support tickets and resolve hardware/software issues\nSet up and configure workstations, printers, and network devices\nManage user accounts in Active Directory and Microsoft 365\nPerform regular system maintenance and backups\nDocument solutions in the knowledge base',
    E'Bachelor degree in IT, Computer Science, or related field\n1-2 years of IT support experience\nFamiliarity with Windows environments and Active Directory\nGood troubleshooting and analytical skills\nStrong communication skills',
    25000, 35000, 'PHP', 'Full-time', 'Hybrid', 'Entry Level',
    'Taguig / BGC', 'Metro Manila', 14.5492, 121.0509, 'published', 143,
    NOW() - INTERVAL '4 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000011', s_help_desk, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_active_dir, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_win_server, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_network, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_ticketing, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_hw_troubleshoot, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000011', s_communication, true, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 12: Network Technician @ DataCore IT
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000012', c_datacore, v_employer_id,
    'Network Technician', 'network-technician-datacore-012',
    'We need a Network Technician to install, configure, and maintain networking equipment for our enterprise clients in the Metro Manila area.',
    E'Install and configure network switches, routers, and access points\nTroubleshoot LAN/WAN connectivity issues and resolve network outages\nSet up and maintain VPN connections for remote access\nPerform network cabling and structured cabling projects\nMonitor network performance and generate reports',
    E'CCNA certification or equivalent experience\n2+ years in network installation and maintenance\nHands-on experience with Cisco/Mikrotik networking equipment\nWilling to do field work and travel to client sites\nDrivers license is an advantage',
    22000, 30000, 'PHP', 'Full-time', 'On-site', 'Mid Level',
    'Taguig / BGC', 'Metro Manila', 14.5492, 121.0509, 'published', 88,
    NOW() - INTERVAL '5 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000012', s_network, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000012', s_vpn, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000012', s_hw_troubleshoot, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000012', s_win_server, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000012', s_problem_solving, true, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 13: Data Encoder @ OfficeFlow
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000013', c_officeflow, v_employer_id,
    'Data Encoder', 'data-encoder-officeflow-013',
    'OfficeFlow Manila is looking for detail-oriented Data Encoders to handle high-volume document processing and data encoding tasks for our business clients.',
    E'Accurately encode data from physical documents into digital systems\nVerify and validate encoded data for errors and inconsistencies\nScan, file, and archive physical documents\nMeet daily encoding quotas and productivity targets\nMaintain confidentiality of all documents handled',
    E'High school graduate or college level\nFast and accurate typing skills (at least 40 WPM)\nBasic computer proficiency (MS Word, Excel)\nHigh attention to detail and accuracy\nWilling to work on a Monday to Friday schedule',
    16000, 18000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Manila', 'Metro Manila', 14.5995, 120.9842, 'published', 421,
    NOW() - INTERVAL '6 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000013', s_data_entry, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000013', s_typing, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000013', s_ms_word, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000013', s_ms_excel, true, 2),
    ('aaaaaaaa-0000-0000-0000-000000000013', s_attention, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000013', s_time_mgmt, true, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

  -- JOB 14: Administrative Assistant @ OfficeFlow
  INSERT INTO public.jobs (id, company_id, employer_id, title, slug, description, responsibilities, qualifications,
    salary_min, salary_max, salary_currency, employment_type, work_arrangement, experience_level,
    city, province, latitude, longitude, status, views, created_at, updated_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000014', c_officeflow, v_employer_id,
    'Administrative Assistant', 'administrative-assistant-officeflow-014',
    'We are looking for a proactive Administrative Assistant to support our operations team with scheduling, document management, and general office administration tasks.',
    E'Manage executive schedules, meetings, and appointments\nPrepare and format reports, presentations, and correspondence\nHandle incoming and outgoing communications (email, phone, mail)\nMaintain organized filing systems (physical and digital)\nCoordinate office supplies and vendor requirements',
    E'Bachelor degree in Business Administration or related field (preferred)\n1+ year of administrative experience\nProficiency in Microsoft Office Suite (Word, Excel, PowerPoint, Outlook)\nExcellent organizational and multitasking skills\nProfessional communication skills',
    18000, 22000, 'PHP', 'Full-time', 'On-site', 'Entry Level',
    'Manila', 'Metro Manila', 14.5995, 120.9842, 'published', 267,
    NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.job_skills (job_id, skill_id, is_required, minimum_proficiency) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000014', s_ms_word, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_ms_excel, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_ms_ppt, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_ms_outlook, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_ms_teams, false, 2),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_communication, true, 4),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_attention, true, 3),
    ('aaaaaaaa-0000-0000-0000-000000000014', s_time_mgmt, true, 3)
  ON CONFLICT (job_id, skill_id) DO NOTHING;

END $$;
