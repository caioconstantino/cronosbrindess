ALTER TABLE public.orders ADD COLUMN closed_at timestamptz DEFAULT NULL;

UPDATE public.orders SET closed_at = updated_at WHERE status = 'sold' AND closed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    NEW.closed_at = now();
  END IF;
  IF NEW.status IS DISTINCT FROM 'sold' AND OLD.status = 'sold' THEN
    NEW.closed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_set_closed_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_closed_at();