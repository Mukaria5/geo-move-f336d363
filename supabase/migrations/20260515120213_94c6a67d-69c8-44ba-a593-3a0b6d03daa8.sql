-- Photos shared by the driver during a trip, visible to client + driver + truck owner + admins.
CREATE TABLE public.booking_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pickup','load','dropoff','proof')),
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_photos_booking ON public.booking_photos(booking_id);

ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver inserts own booking photos"
ON public.booking_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver reads own booking photos"
ON public.booking_photos FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Client reads photos for their booking"
ON public.booking_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.client_id = auth.uid()));

CREATE POLICY "Truck owner reads photos for their truck"
ON public.booking_photos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bookings b JOIN public.trucks t ON t.id = b.truck_id
  WHERE b.id = booking_id AND t.owner_id = auth.uid()
));

CREATE POLICY "Admins read all booking photos"
ON public.booking_photos FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_photos;

-- Storage: allow the client of the booking to read trip-photos for their booking.
-- File path convention: <driver_user_id>/<booking_id>/<kind>-<timestamp>.png
-- Existing policies (driver-owns-folder) remain. Add a SELECT policy for the booking client.
CREATE POLICY "Booking client reads trip photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.client_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);

CREATE POLICY "Truck owner reads trip photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.trucks t ON t.id = b.truck_id
    WHERE t.owner_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);

CREATE POLICY "Driver writes own trip photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Driver reads own trip photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
