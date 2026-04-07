-- Supabase Schema Migration

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT UNIQUE NOT NULL, -- Added 4-digit ID
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'team_lead', 'counsellor', 'front_office')) NOT NULL,
  team_lead_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_courses TEXT[],
  mobile_no TEXT,
  photo_url TEXT,
  on_break BOOLEAN DEFAULT FALSE,
  break_start_time TIMESTAMPTZ,
  break_duration_mins INTEGER DEFAULT 30,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  duration TEXT,
  fees NUMERIC,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enquiries Table
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  course TEXT NOT NULL, -- Changed from course_id to course (string)
  father_name TEXT,
  last_institution TEXT,
  address TEXT,
  state TEXT,
  pincode TEXT,
  category TEXT,
  marks_12th TEXT,
  marks_grad TEXT,
  city TEXT,
  message TEXT,
  status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
  counsellor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  team_lead_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Time Logs Table
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE CASCADE,
  counsellor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  total_time INTEGER, -- in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Routes Table
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  bus_number TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  stops TEXT[] DEFAULT '{}',
  start_time TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Stops Table
CREATE TABLE IF NOT EXISTS public.transport_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_name TEXT NOT NULL,
  location TEXT,
  routes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Non-recursive)

-- Helper function to check if user is admin or front office (using JWT metadata)
CREATE OR REPLACE FUNCTION public.is_admin_or_front_office()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'front_office');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: Admins can do everything. Users can read their own.
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "Front office can read all users" ON public.users FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'front_office'
);
CREATE POLICY "Users can read their own profile" ON public.users FOR SELECT USING (
  auth.uid() = id
);
CREATE POLICY "Team leads can read their counsellors" ON public.users FOR SELECT USING (
  team_lead_id = auth.uid()
);

-- Courses: Everyone can read. Admins can manage.
CREATE POLICY "Everyone can read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins and Front Office can manage courses" ON public.courses FOR ALL USING (
  public.is_admin_or_front_office()
);

-- Enquiries: Admins, Front Office, Team Leads (their team), Counsellors (assigned)
CREATE POLICY "Admins and Front Office can manage enquiries" ON public.enquiries FOR ALL USING (
  public.is_admin_or_front_office()
);
CREATE POLICY "Team leads can manage their team's enquiries" ON public.enquiries FOR ALL USING (
  team_lead_id = auth.uid()
);
CREATE POLICY "Counsellors can manage assigned enquiries" ON public.enquiries FOR ALL USING (
  counsellor_id = auth.uid()
);
CREATE POLICY "Students can track their enquiry" ON public.enquiries FOR SELECT USING (true);

-- Time Logs: Admins, Front Office, Team Leads (their team), Counsellors (their own)
CREATE POLICY "Admins and Front Office can manage time logs" ON public.time_logs FOR ALL USING (
  public.is_admin_or_front_office()
);
CREATE POLICY "Counsellors can manage their own logs" ON public.time_logs FOR ALL USING (
  counsellor_id = auth.uid()
);

-- Transport: Everyone can read. Admins and Front Office can manage.
CREATE POLICY "Everyone can read transport routes" ON public.transport_routes FOR SELECT USING (true);
CREATE POLICY "Admins and Front Office can manage transport routes" ON public.transport_routes FOR ALL USING (
  public.is_admin_or_front_office()
);

CREATE POLICY "Everyone can read transport stops" ON public.transport_stops FOR SELECT USING (true);
CREATE POLICY "Admins and Front Office can manage transport stops" ON public.transport_stops FOR ALL USING (
  public.is_admin_or_front_office()
);

-- RPC to check real-time sync status
CREATE OR REPLACE FUNCTION public.check_realtime_status()
RETURNS TABLE (table_name TEXT, enabled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name::TEXT as table_name,
    EXISTS (
      SELECT 1 
      FROM pg_publication_tables p
      WHERE p.pubname = 'supabase_realtime' 
      AND p.schemaname = 'public' 
      AND p.tablename = t.name
    ) as enabled
  FROM (
    VALUES ('enquiries'), ('users'), ('courses'), ('time_logs'), ('transport_routes'), ('transport_stops')
  ) AS t(name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Seed Initial Courses (Official 2025-26 Fee Structure)
INSERT INTO public.courses (name, duration, fees, description) VALUES
-- School of Engineering and Technology (Undergraduate)
('B.Tech. Computer Science and Engineering', '4 Years', 230000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Lateral)', '3 Years', 230000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (AI and ML) with academic support of IBM & powered by Microsoft Certifications', '4 Years', 265000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (AI and ML) with academic support of Samatrix and IBM (Lateral)', '3 Years', 265000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Full Stack Development) with academic support of ImaginXP', '4 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Full Stack Development) with academic support of Xebia (Lateral)', '3 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (UX/UI) with academic support of ImaginXP', '4 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (UX/UI) with academic support of ImaginXP (Lateral)', '3 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Cyber Security) with academic support of EC-Council and IBM', '4 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Cyber Security) with academic support of EC-Council and IBM (Lateral)', '3 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Data Science) with academic support of IBM', '4 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Data Science) with academic support of Grant Thornton (Lateral)', '3 Years', 250000, 'School of Engineering and Technology'),
('B.Tech. Computer Science and Engineering (Robotics and AI) with academic support of IBM & powered by Microsoft Certifications', '4 Years', 250000, 'School of Engineering and Technology'),
('BCA (AI & Data Science) with academic support of IBM & powered by Microsoft Certifications', '3 Years', 165000, 'School of Engineering and Technology'),
('BCA (Hons. / Hons. with Research) AI & Data Science with academic support of IBM & powered by Microsoft Certifications', '4 Years', 165000, 'School of Engineering and Technology'),
('BCA (Cyber Security) with academic support of EC-Council', '3 Years', 165000, 'School of Engineering and Technology'),
('BCA (Hons. / Hons. with Research) Cyber Security with academic support of EC-Council', '4 Years', 165000, 'School of Engineering and Technology'),
('B.Sc. (Hons.) Computer Science with academic support of IBM', '3 Years', 135000, 'School of Engineering and Technology'),
('B.Sc. (Hons.) Cyber Security', '3 Years', 135000, 'School of Engineering and Technology'),
('B.Sc. (Hons.) Data Science', '3 Years', 135000, 'School of Engineering and Technology'),

-- School of Management and Commerce (Undergraduate)
('BBA (HR/Mktng/Fin/IB/Travel & Tourism)', '3 Years', 185000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (HR/Mktng/Fin/IB/Travel & Tourism)', '4 Years', 185000, 'School of Management and Commerce'),
('BBA (Business Analytics) with academic support of Ernst & Young (EY)', '3 Years', 210000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (Business Analytics) with academic support of Ernst & Young (EY)', '4 Years', 210000, 'School of Management and Commerce'),
('BBA (Entrepreneurship) with academic support of GCEC Global Foundation', '3 Years', 205000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (Entrepreneurship) with academic support of GCEC Global Foundation', '4 Years', 205000, 'School of Management and Commerce'),
('BBA (International Accounting and Finance) (ACCA - UK) with academic support of Grant Thornton', '3 Years', 205000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (International Accounting and Finance) (ACCA - UK) with academic support of Grant Thornton', '4 Years', 205000, 'School of Management and Commerce'),
('BBA (Logistics and Supply Chain Management) with academic support of Safexpress', '3 Years', 205000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (Logistics and Supply Chain Management) with academic support of Safexpress', '4 Years', 205000, 'School of Management and Commerce'),
('BBA (Digital Marketing) with academic support of IIDE', '3 Years', 205000, 'School of Management and Commerce'),
('BBA (Hons. / Hons. with Research) (Digital Marketing) with academic support of IIDE', '4 Years', 205000, 'School of Management and Commerce'),
('B.Com. (Hons.)', '3 Years', 140000, 'School of Management and Commerce'),
('B.Com. (Hons. / Hons. with Research)', '4 Years', 140000, 'School of Management and Commerce'),
('B.Com. (Hons.) (International Accounting and Finance) (ACCA - UK) With academic support of Grant Thornton', '3 Years', 165000, 'School of Management and Commerce'),
('B.Com. (Hons. / Hons. with Research) (International Accounting and Finance) (ACCA - UK) With academic support of Grant Thornton', '4 Years', 165000, 'School of Management and Commerce'),
('B.Com. Programme', '3 Years', 125000, 'School of Management and Commerce'),

-- School of Basic and Applied Sciences (Undergraduate)
('B.Sc. (Hons. / Hons. with Research) Physics', '4 Years', 90000, 'School of Basic and Applied Sciences'),
('B.Sc. (Hons. / Hons. with Research) Chemistry', '4 Years', 90000, 'School of Basic and Applied Sciences'),
('B.Sc. (Hons. / Hons. with Research) Maths', '4 Years', 90000, 'School of Basic and Applied Sciences'),
('B.Sc. (Hons.) Forensic Science', '3 Years', 130000, 'School of Basic and Applied Sciences'),
('B.Sc. (Hons. / Hons. with Research) Forensic Science', '4 Years', 130000, 'School of Basic and Applied Sciences'),

-- School of Medical and Allied Sciences (Undergraduate)
('B.Pharm.', '4 Years', 195000, 'School of Medical and Allied Sciences'),
('B.Pharm. (Lateral)', '3 Years', 195000, 'School of Medical and Allied Sciences'),
('D.Pharm.', '2 Years', 120000, 'School of Medical and Allied Sciences'),
('B.Sc. (Hons.) Emergency Medical Technology with Academic and Industry support of Emversity', '4 Years', 240000, 'School of Medical and Allied Sciences'),
('B.Sc. (Hons.) Respiratory Technology with Academic and Industry support of Emversity', '4 Years', 240000, 'School of Medical and Allied Sciences'),
('B.Sc. (Hons.) Cardiovascular Technology with Academic and Industry support of Emversity', '4 Years', 240000, 'School of Medical and Allied Sciences'),

-- School of Physiotherapy and Rehabilitation Sciences (Undergraduate)
('Bachelor of Physiotherapy (BPT)', '4.5 Years', 158000, 'School of Physiotherapy and Rehabilitation Sciences'),

-- School of Architecture and Design (Undergraduate)
('Bachelor of Architecture (B.Arch)', '5 Years', 190000, 'School of Architecture and Design'),
('Bachelor of Fine Arts (BFA)', '4 Years', 120000, 'School of Architecture and Design'),
('Bachelor of Design (B.Des.) (Hons. / Hons. with Research) Fashion Design', '4 Years', 210000, 'School of Architecture and Design'),
('Bachelor of Design (B.Des.) (Hons. / Hons. with Research) Interior Design', '4 Years', 210000, 'School of Architecture and Design'),
('Bachelor of Design (B.Des.) (Hons. / Hons. with Research) Game Design & Animation with academic support of ImaginXP', '4 Years', 240000, 'School of Architecture and Design'),
('Bachelor of Design (B.Des.) (Hons. / Hons. with Research) (UX/UI & Interaction Design) with academic support of ImaginXP', '4 Years', 240000, 'School of Architecture and Design'),

-- School of Legal Studies (Undergraduate)
('BBA LL.B. (Hons.)', '5 Years', 185000, 'School of Legal Studies'),
('B.A. LL.B. (Hons.)', '5 Years', 185000, 'School of Legal Studies'),
('LL.B. (Hons.)', '3 Years', 160000, 'School of Legal Studies'),

-- School of Journalism & Mass Communication (Undergraduate)
('B.A. (Journalism And Mass Communication)', '3 Years', 160000, 'School of Journalism & Mass Communication'),
('B.A. (Hons. / Hons. with Research) (Journalism and Mass Communication)', '4 Years', 160000, 'School of Journalism & Mass Communication'),

-- School of Liberal Arts (Undergraduate)
('B.A. (Hons.) English', '3 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons. / Hons. with Research) English', '4 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons.) Economics', '3 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons. / Hons. with Research) Economics', '4 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons.) Psychology', '3 Years', 130000, 'School of Liberal Arts'),
('B.A. (Hons. / Hons. with Research) Psychology', '4 Years', 130000, 'School of Liberal Arts'),
('B.A. (Hons.) Political Science', '3 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons. / Hons. with Research) Political Science', '4 Years', 120000, 'School of Liberal Arts'),
('B.A. Programme', '3 Years', 120000, 'School of Liberal Arts'),
('B.A. (Hons. / Hons. with Research) (Liberal Arts)', '4 Years', 150000, 'School of Liberal Arts'),

-- School of Education (Undergraduate)
('Bachelor of Elementary Education (B.El.Ed.)', '4 Years', 125000, 'School of Education'),
('Bachelor of Education (B.Ed.)', '2 Years', 125000, 'School of Education'),

-- School of Agriculture Sciences (Undergraduate)
('B.Sc. (Hons.) Agriculture', '4 Years', 140000, 'School of Agriculture Sciences'),

-- Integrated Programmes
('Integrated BBA + MBA with academic support of IBM', '5 Years', 230000, 'Integrated Programme'),
('Integrated/Dual Degree B.Sc. - M.Sc. (Forensic Science)', '5 Years', 130000, 'Integrated Programme'),

-- Postgraduate Programmes
-- School of Engineering and Technology (Postgraduate)
('M.Tech. Computer Science and Engineering', '2 Years', 110000, 'School of Engineering and Technology'),
('M.Tech. in Automobile Engineering', '2 Years', 110000, 'School of Engineering and Technology'),
('MCA', '2 Years', 120000, 'School of Engineering and Technology'),
('MCA (AI & ML) with academic support of IBM and powered by Microsoft Certifications', '2 Years', 150000, 'School of Engineering and Technology'),

-- School of Management and Commerce (Postgraduate)
('MBA with academic support of IBM', '2 Years', 300000, 'School of Management and Commerce'),
('MBA (Digital Marketing) with academic support of IIDE', '2 Years', 350000, 'School of Management and Commerce'),
('MBA (Fintech) with academic support of Ernst & Young (EY)', '2 Years', 350000, 'School of Management and Commerce'),

-- School of Basic and Applied Sciences (Postgraduate)
('M.Sc. (Hons.) (Part Time)', '2 Years', 55000, 'School of Basic and Applied Sciences'),
('M.Sc. Forensic Science', '2 Years', 125000, 'School of Basic and Applied Sciences'),

-- School of Medical and Allied Sciences (Postgraduate)
('Master of Pharmacy (M.Pharm.) - Pharmaceutics', '2 Years', 154000, 'School of Medical and Allied Sciences'),
('Master of Pharmacy (M.Pharm.) - Pharmacology', '2 Years', 154000, 'School of Medical and Allied Sciences'),

-- School of Legal Studies (Postgraduate)
('LL.M.', '1 Year', 150000, 'School of Legal Studies'),

-- School of Journalism & Mass Communication (Postgraduate)
('M.A. (Journalism and Mass Communication)', '2 Years', 110000, 'School of Journalism & Mass Communication'),

-- School of Liberal Arts (Postgraduate)
('M.A. English', '2 Years', 110000, 'School of Liberal Arts'),
('M.A. Economics', '2 Years', 110000, 'School of Liberal Arts'),
('M.A. Political Science', '2 Years', 110000, 'School of Liberal Arts'),
('M.A. Applied Psychology', '2 Years', 115000, 'School of Liberal Arts'),

-- School of Education (Postgraduate)
('M.A. Education', '2 Years', 110000, 'School of Education'),

-- Ph.D
('Ph.D (All Disciplines)', '3 Years', 120000, 'Doctoral Programme')
ON CONFLICT (name) DO NOTHING;
