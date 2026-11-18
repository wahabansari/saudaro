Upload one or many documents. This is the heart of the exporter experience: documents live beside the product so importers never have to ask.

## States
Idle, drag-over, uploading (Progress per file), done (Document tile), error (message and Retry).

## Rules
- The whole zone is a button and keyboard reachable.
- State accepted types and the size limit in the zone ("PDF, JPG, PNG, up to 10 MB").
- Show a document type select per file (certificate, product_specification, packing_list, …).
- Never auto-publish; show who can see each file.

**Build with:** Custom composed from shadcn `Button` and `Progress`; use react-dropzone.. 
