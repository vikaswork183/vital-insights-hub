
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'hospital', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  hospital_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create model_versions table
CREATE TABLE public.model_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  architecture TEXT NOT NULL DEFAULT 'ft-transformer',
  accuracy DOUBLE PRECISION,
  auc DOUBLE PRECISION,
  precision_score DOUBLE PRECISION,
  recall DOUBLE PRECISION,
  f1_score DOUBLE PRECISION,
  confusion_matrix JSONB,
  feature_importance JSONB,
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'ready', 'active', 'archived')),
  weights_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create update_requests table
CREATE TABLE public.update_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES auth.users(id) NOT NULL,
  hospital_name TEXT NOT NULL,
  model_version_id UUID REFERENCES public.model_versions(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  diagnostics JSONB,
  trust_score DOUBLE PRECISION,
  l2_norm DOUBLE PRECISION,
  key_fingerprint_match BOOLEAN DEFAULT false,
  clinical_outlier_pct DOUBLE PRECISION,
  label_distribution JSONB,
  encrypted_delta_url TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create system_config table
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Model versions policies
CREATE POLICY "Anyone can view model versions" ON public.model_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage model versions" ON public.model_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update requests policies
CREATE POLICY "Hospitals can view own requests" ON public.update_requests FOR SELECT TO authenticated USING (auth.uid() = hospital_id);
CREATE POLICY "Admins can view all requests" ON public.update_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hospitals can create requests" ON public.update_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);
CREATE POLICY "Admins can update requests" ON public.update_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- System config policies
CREATE POLICY "Anyone can view config" ON public.system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage config" ON public.system_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system config
INSERT INTO public.system_config (key, value) VALUES ('selected_model_version', '"1"');
INSERT INTO public.system_config (key, value) VALUES ('aggregation_settings', '{"l2_norm_threshold": 1.0, "outlier_threshold": 0.1, "min_trust_score": 70}');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
