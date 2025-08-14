-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true);

-- Create policies for QR code storage
CREATE POLICY "Anyone can view QR codes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-codes');

CREATE POLICY "Users can upload their own QR codes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own QR codes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own QR codes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);