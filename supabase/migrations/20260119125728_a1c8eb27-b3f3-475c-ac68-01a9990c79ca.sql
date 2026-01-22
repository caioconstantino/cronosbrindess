-- Create order audit logs table
CREATE TABLE public.order_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_order_audit_logs_order_id ON public.order_audit_logs(order_id);
CREATE INDEX idx_order_audit_logs_created_at ON public.order_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.order_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can view all logs
CREATE POLICY "Admins can view all audit logs"
ON public.order_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Vendedores can view logs for their orders
CREATE POLICY "Vendedores can view audit logs for their orders"
ON public.order_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_audit_logs.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Anyone authenticated can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.order_audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);