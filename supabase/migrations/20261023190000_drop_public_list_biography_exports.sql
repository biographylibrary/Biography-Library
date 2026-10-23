/*
  Toglie la policy SELECT "Public read biography exports" su storage.objects.

  Motivo: con quella policy chiunque (ruolo public, senza accedere) poteva elencare
  gli oggetti del bucket biography-exports via API Storage e scoprire gli
  identificativi delle biografie, comprese quelle con visibility = 'private'.

  Il bucket resta pubblico: gli indirizzi diretti già salvati in biographies
  (final_pdf_url, export_txt_url, export_docx_url, listing_cover_url da
  getPublicUrl) continuano a funzionare. Non si introducono URL firmati qui.
*/

DROP POLICY IF EXISTS "Public read biography exports" ON storage.objects;
