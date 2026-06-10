-- Create table for demand annotations
CREATE TABLE public.demand_annotations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    demand_id UUID NOT NULL REFERENCES public.agendas_positivas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_annotations TO authenticated;
GRANT ALL ON public.demand_annotations TO service_role;

-- Enable RLS
ALTER TABLE public.demand_annotations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Annotations are viewable by authenticated users" 
ON public.demand_annotations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create their own annotations" 
ON public.demand_annotations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations" 
ON public.demand_annotations 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations" 
ON public.demand_annotations 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX idx_demand_annotations_demand_id ON public.demand_annotations(demand_id);
