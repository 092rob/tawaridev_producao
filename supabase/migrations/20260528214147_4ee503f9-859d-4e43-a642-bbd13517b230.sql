-- Create storage bucket for demand attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('demand_attachments', 'demand_attachments', true);

-- Create policies for demand attachments
CREATE POLICY "Demand attachments are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'demand_attachments');

CREATE POLICY "Authenticated users can upload demand attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'demand_attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own demand attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'demand_attachments' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own demand attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'demand_attachments' AND auth.uid() = owner);