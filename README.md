# HMIS Backend — Hospital Management Information System

A single-app Django REST Framework backend powering the full patient journey:
**Registration → Billing → Queue → Triage → Consultation → Lab/Radiology → Pharmacy → Reports.**

Built with Python 3.13, Django 5, DRF, PostgreSQL, JWT auth, RBAC, soft deletes, audit
logging, QR-coded receipts, and OpenAPI/Swagger docs — all inside **one Django app (`api`)**
for simplicity, as requested.

---

## Project Structure

```
hmis_backend/
├── manage.py                  # Django entrypoint
├── requirements.txt           # Python dependencies
├── .env.example                # Environment variable template (copy to .env)
│
├── backend/                   # Project configuration package
│   ├── __init__.py
│   ├── settings.py            # Apps, DB, DRF, JWT, CORS, Swagger config
│   └── urls.py                # Root URLConf — mounts /api/ and Swagger/Redoc
│
├── api/                       # ⭐ The single application — all HMIS logic lives here
│   ├── __init__.py
│   ├── apps.py                 # AppConfig — wires up signals on startup
│   ├── admin.py                 # Django admin registrations (back-office access)
│   ├── models.py                # Every table: accounts, patients, visits, billing,
│   │                             #   queue, triage, ICD-10, consultation, prescriptions,
│   │                             #   lab, radiology, pharmacy, inventory, audit log
│   ├── serializers.py           # DRF serializers for every model above
│   ├── views.py                 # ViewSets + APIViews: auth, CRUD, dashboard, reports
│   ├── urls.py                  # DRF router + auth/dashboard/report routes
│   ├── permissions.py           # RBAC permission classes (one per role)
│   ├── filters.py               # django-filter FilterSets (search/filter per module)
│   ├── signals.py                # Audit logging + business-flow automation
│   │                             #   (auto-invoice on visit, auto-queue on payment, etc.)
│   ├── managers.py               # Soft-delete manager/queryset
│   ├── middleware.py             # Thread-local request/user (used by audit signals)
│   ├── exceptions.py              # Consistent DRF error-response envelope
│   ├── utils.py                    # Number generators (hospital/visit/invoice/receipt),
│   │                                #   QR code generation, BMI/age calculators
│   ├── management/
│   │   └── commands/               # Custom manage.py commands (e.g. seed data) go here
│   └── migrations/                  # Generated via `makemigrations` (not committed yet)
│
├── media/                      # Uploaded files (lab results, radiology images, receipts/QR)
└── static/                     # Static assets (e.g. hospital logo for receipts/PDFs)
```

---

## Setup

### 1. Create a virtual environment & install dependencies
```bash
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables
```bash
cp .env.example .env
# then edit .env with your real SECRET_KEY and PostgreSQL credentials
```

### 3. Create the PostgreSQL database
```bash
createdb hmis_db
```

### 4. Run migrations
```bash
python manage.py makemigrations api
python manage.py migrate
```

### 5. Create a Super Admin
```bash
python manage.py createsuperuser
```
(Note: `role` isn't prompted by `createsuperuser` — set it via `/admin/` or the shell:
`User.objects.filter(username="you").update(role="SUPER_ADMIN")`)

### 6. Run the server
```bash
python manage.py runserver
```

---

## API Documentation

Once running, the full interactive API reference is available at:

| URL | Purpose |
|---|---|
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | ReDoc UI |
| `/api/schema/` | Raw OpenAPI 3 schema (JSON) |
| `/admin/` | Django admin back-office |

---

## Key Endpoint Groups (under `/api/`)

| Group | Base path | Notes |
|---|---|---|
| Auth | `auth/login/`, `auth/refresh/`, `auth/me/`, `auth/change-password/` | JWT via SimpleJWT |
| Users | `users/` | Super Admin only |
| Departments | `departments/` | Consultation fees per department |
| Patients | `patients/`, `patients/search/?q=`, `patients/{id}/summary/` | Duplicate-check search built in |
| Visits | `visits/` | Auto-generates a consultation invoice on creation |
| Billing | `invoices/`, `payments/`, `payments/{id}/receipt/` | Payments auto-update invoice balance + push to Nurse queue |
| Queue | `queue/`, `queue/my-queue/`, `queue/{id}/call-next/` | Nurse/Doctor/Lab/Radiology/Pharmacy queues |
| Triage | `vitals/` | Auto-computes BMI, moves patient to Doctor queue |
| ICD-10 | `icd10/`, `icd10/lookup/?q=` | Autocomplete by code or description |
| Consultation | `consultations/`, `.../pause/`, `.../resume/`, `.../complete/`, `.../add-diagnosis/` | Full clinical workflow incl. pause/resume |
| Prescriptions | `prescriptions/` | Linked to Pharmacy dispensing |
| Laboratory | `lab-tests-catalog/`, `lab-orders/`, `lab-orders/pending/`, `lab-results/` | Blocks result entry until payment confirmed |
| Radiology | `radiology-tests-catalog/`, `radiology-orders/`, `radiology-results/` | Same payment-gate pattern |
| Pharmacy | `medicines/`, `medicine-batches/`, `pharmacy-dispenses/` | FEFO batch selection, auto stock deduction & invoicing |
| Inventory | `suppliers/`, `stock-transactions/` | Stock in/out audit trail |
| Reports | `reports/?type=...` | daily/doctor/department/consultation/lab/radiology revenue, patient stats, medicine sales |
| Dashboard | `dashboard/` | Today's cards + 7-day revenue/visits charts + department breakdown |
| Audit Log | `audit-logs/` | Read-only, Super Admin only |

---

## Roles (RBAC)

`SUPER_ADMIN`, `RECEPTIONIST`, `CASHIER`, `NURSE`, `DOCTOR`, `LAB_TECHNOLOGIST`,
`RADIOLOGIST`, `PHARMACIST`, `ACCOUNTANT` — enforced per-endpoint via classes in
`api/permissions.py`. Super Admin always has full access.

---

## Automated Business Flow (via `api/signals.py`)

1. **Visit created** → consultation invoice auto-generated.
2. **Invoice paid in full** → patient auto-enters the Nurse queue.
3. **Vitals recorded** → patient auto-moves to the Doctor queue.
4. **Lab/Radiology order placed** → invoice auto-generated; results are blocked until `is_paid=True`.
5. **Consultation completed** → visit marked completed; prescriptions push patient to the Pharmacy queue.
6. **Every create/update/delete** on clinical/financial models is written to `AuditLog` automatically.

---

## Notes

- All primary keys are UUIDs.
- Deletes are **soft** (`is_deleted` + `deleted_at`) — nothing is hard-deleted by the API.
- Pagination, search, and filtering are enabled globally via DRF defaults + `django-filter`.
- This backend intentionally uses **one app (`api`)** instead of the originally-proposed
  multi-app layout (`accounts/`, `patients/`, `visits/`, ...) per your request — all of that
  logic is organized by *file* within `api/` instead of by separate Django apps.