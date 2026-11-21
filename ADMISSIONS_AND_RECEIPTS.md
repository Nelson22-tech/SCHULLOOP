# SchulLoop Admissions and Receipts

## Admission application flow

- A signed-in student or parent can apply to a verified school from the school's detail screen using **Apply for Admission**.
- Required fields are programme/course and academic year. A personal statement is optional.
- SchulLoop assigns a unique `SLA-YYYYMMDD-XXXXXXXX` application number, records the application, and generates a PDF confirmation in `backend/receipts/`.
- Students can review their submitted applications in the same screen. The backend also exposes `GET /api/admissions/mine`.
- Confirmation PDFs are available through authenticated `GET /api/admissions/:id/confirmation`; only the applicant or an administrator can access the document.
- Authorized school representatives and administrators can update application status using `PUT /api/admissions/:id/status`.

## Important distinction

An application confirmation is proof that the application was recorded. It is **not** an admission offer and **not** proof that a fee was paid. SchulLoop's separate payment receipt is issued only after a payment is verified as completed. Never mark an application fee as paid based only on a checkout redirect or a client-side claim.

## API routes

- `POST /api/schools/:id/admissions` — submit an application.
- `GET /api/admissions/mine` — list the signed-in user's applications.
- `GET /api/admissions/:id/confirmation` — download the PDF confirmation.
- `PUT /api/admissions/:id/status` — update status as the verified school representative or an administrator.

## Validation status

The backend file passes `node --check`. This ZIP has not been validated against a live MongoDB instance or by running the Expo app end-to-end. Before production, configure the API URL, use a secured production deployment, test school representative authorization, and verify that PDFs can be downloaded from the target mobile platforms.
