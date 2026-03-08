CREATE POLICY "Admins can delete model versions"
ON public.model_versions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));