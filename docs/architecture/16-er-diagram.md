# 16 — ER Diagram (แผนผังความสัมพันธ์ข้อมูล: Org × Governance × Audit/Security/AI)

> **องค์กร:** Saduak Suay Mai PCL — เครือคลินิกความงาม + ทันตกรรม แบบแฟรนไชส์ในประเทศไทย
> **ระบบฐาน:** NEXUS OS (Next.js 16 + Express + PostgreSQL บน Railway — `nexus-web`, `nexus-api`, Postgres; deploy ด้วย `railway up` ราย service ไม่ใช่ GitHub auto-deploy)
> **ขอบเขตเอกสาร:** **Entity-Relationship model** ระดับ production สำหรับ AI Workforce OS — ครอบคลุม (1) **โครงสร้างองค์กร** Company → Department → Sub-Department → Team/Unit → Position → Employee + profiles; (2) **Governance** roles/permissions/data_ownership; (3) **Audit/Security/AI** `audit_logs`/`ai_query_logs`/`consent_logs`/`login_logs`/`file_access_logs`/`permission_change_logs` พร้อม cardinality และ key relationships
> **มาตรฐาน:** Production-grade · deny-by-default · ทุก core table มี soft-delete + versioning + `security_level` · FK/UNIQUE/CHECK/composite index ครบ · Append-only audit · AI ห้ามอ่าน DB ตรง
> **ภาษา:** ไทย narrative + English technical identifiers ตามสไตล์องค์กร

---

## 0. วิธีอ่านเอกสารนี้ (How to Read This Document)

เอกสารนี้คือ **logical + physical ER model** ที่เป็น single source of truth ของ schema ในมุม "ความสัมพันธ์" (relationship) — ใช้คู่กับ:

- `11-permission-matrix.md` (authorization pipeline RBAC × ABAC × Data-Ownership)
- `12-ai-access-matrix.md` (AI access control flow + redaction)
- `docs/SYSTEM-SPEC.md` / `docs/ARCHITECTURE-MAP.md` (current-state inventory)

ER model นี้แบ่งเป็น **4 diagram** เพื่อความอ่านง่าย (mermaid `erDiagram` รับ entity จำนวนมากแล้วจะอ่านยาก) — แต่ละ diagram มี boundary ชัดเจนและเชื่อมกันด้วย FK ที่ระบุไว้:

| # | Diagram | ครอบคลุม | สถานะหลัก |
|---|---|---|---|
| **A** | **Org Structure** | `companies` → `branches` → `departments` → `sub_departments` → `teams` → `positions` → `employee_profiles` → `users` | ผสม EXISTS + NEW |
| **B** | **Governance / Authorization** | `roles`, `permissions`, `role_permissions`, `permission_groups`, `user_roles`, `data_ownership`, `security_levels`, `consent_logs` | ส่วนใหญ่ **NEW** |
| **C** | **Audit & Security Logs** | `audit_logs`, `login_logs`, `file_access_logs`, `permission_change_logs`, `user_files` | ส่วนใหญ่ **NEW** (ยกเว้น `audit_log`/`user_files` ที่ต้อง migrate) |
| **D** | **AI Governance** | `ai_query_logs`, `ai_redaction_events`, `ai_decision_overrides`, `ai_data_access_policy`, link `request_id` ↔ Diagram C | ทั้งหมด **NEW** (ยกเว้น `ai_logs` legacy ที่ deprecate) |

### 0.1 Legend (สัญลักษณ์ที่ใช้)

NEXUS OS ใช้ **PostgreSQL** (Railway) เป็น target หลัก; IDs เป็น app-generated `randomUUID()` เก็บเป็น **TEXT (UUID)** ตามของเดิมใน `backend/src/lib/db.ts`

| สัญลักษณ์ใน mermaid | ความหมาย |
|---|---|
| `PK` | Primary Key (เสมอเป็น `id TEXT` UUID) |
| `FK` | Foreign Key (มี `REFERENCES ... ON DELETE RESTRICT` เป็นค่าตั้งต้น — **ไม่ใช้ CASCADE** เพราะใช้ soft-delete) |
| `UK` | Unique Key / ส่วนของ composite UNIQUE |
| `NN` | NOT NULL |
| `IDX` | มี index (รวม composite) |
| `SL` | คอลัมน์ `security_level` (BASIC/MEDIUM/HARD/RESTRICTED) |
| `}o--\|\|` | many-to-one (ฝั่ง many เป็น optional FK) |
| `}o--o\|` | many-to-(zero-or-one) |
| `\|\|--o{` | one-to-many (ฝั่ง parent บังคับ, child ศูนย์ขึ้นไป) |
| `\|\|--\|\|` | one-to-one |
| `}o--o{` | many-to-many (ผ่าน junction table เสมอ — เราระบุ junction ชัดเจน ไม่ปล่อย implicit) |

**กฎ relationship ทั่วทั้ง model:**
1. **Tenant isolation:** ทุก entity (ยกเว้น `companies`) มี `company_id FK NN` — ทุก query ต้อง predicate `company_id = $1` (ดู `11-permission-matrix.md` §tenancy)
2. **No hard delete:** FK ใช้ `ON DELETE RESTRICT`; การลบทำผ่าน `deleted_at`/`deleted_by`/`is_active` (soft-delete) ไม่ใช้ `ON DELETE CASCADE` แบบโค้ดเดิม
3. **Audit ไม่มี FK ออกไปยัง business tables** ในเชิง enforce (เพื่อให้ append-only และคง record ไว้แม้ target ถูก soft-delete) — เก็บเป็น `target_table` + `target_id` (logical pointer) แทน hard FK; ความสัมพันธ์ใน diagram จึงเป็น **dashed/logical** และอธิบายใน prose

### 0.2 Base Column Contract (ทุก core table มีเหมือนกัน)

ทุก **core business table** ในทุก diagram ถือว่ามีคอลัมน์มาตรฐานชุดนี้ (ไม่วาดซ้ำในทุก entity เพื่อไม่ให้ diagram รก — แต่บังคับใน migration จริง):

```sql
-- BASE COLUMN CONTRACT (ผนวกเข้าทุก core table) [NEW migration]
id            TEXT        PRIMARY KEY,                          -- randomUUID()
company_id    TEXT        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
security_level TEXT       NOT NULL DEFAULT 'BASIC'
              CHECK (security_level IN ('BASIC','MEDIUM','HARD','RESTRICTED')),
is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
version       INTEGER     NOT NULL DEFAULT 1,                   -- optimistic lock
created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at    TIMESTAMPTZ NULL,                                 -- soft-delete
created_by    TEXT        NULL REFERENCES users(id) ON DELETE RESTRICT,
updated_by    TEXT        NULL REFERENCES users(id) ON DELETE RESTRICT,
deleted_by    TEXT        NULL REFERENCES users(id) ON DELETE RESTRICT
```

> ใน mermaid เราจะ **ย่อ** เป็นคอมเมนต์ `audit-cols` ในแต่ละ entity แทนการ list 11 คอลัมน์ทุกตัว และจะ list เฉพาะคอลัมน์ที่ "เป็นเอกลักษณ์ของ entity" + คอลัมน์สำคัญต่อ relationship/constraint เท่านั้น

---

## 1. Diagram A — โครงสร้างองค์กร (Org Structure)

**เป้าหมาย:** สร้าง chain เชิงอ้างอิงจริง (referential) `Company → Branch → Department → Sub-Department → Team → Position → Employee` แทน free-text `users.department` string แบบของเดิม (ดู gap #6 ใน inventory)

**สถานะ grounding (EXISTS vs NEW):**

| Entity | สถานะ | ที่มา / การเปลี่ยนแปลง |
|---|---|---|
| `companies` | **EXISTS** | `db.ts initSchema()` — เพิ่ม base-column contract |
| `branches` | **EXISTS** | migration v8 — wire เข้า authz (เดิมเป็น data เฉยๆ) |
| `departments` | **EXISTS** | `nexus-extended-schema.ts` — เพิ่ม FK `parent`/canonical 10 แผนก |
| `sub_departments` | **NEW** | ปัจจุบันอยู่ใน `org_units` level-3 เท่านั้น — ยกเป็น first-class table |
| `teams` | **NEW** | first-class (เดิมไม่มี) |
| `positions` | **EXISTS** | `nexus-hr-schema.ts` — เพิ่ม FK ไป `teams`/`sub_departments` |
| `employee_profiles` | **EXISTS** | `nexus-hr-schema.ts` — เป็น 1:1 กับ `users` |
| `users` | **EXISTS** | `db.ts` — `department` string จะ deprecate, ใช้ FK แทน |
| `org_units` | **EXISTS (legacy)** | คงไว้ชั่วคราวเพื่อ backward-compat แล้ว migrate เข้า dept/sub/team |

```mermaid
erDiagram
    companies ||--o{ branches : "has (1 company → N branches)"
    companies ||--o{ departments : "defines (canonical 10 depts)"
    companies ||--o{ users : "employs"
    departments ||--o{ sub_departments : "contains"
    sub_departments ||--o{ teams : "contains"
    departments ||--o{ teams : "direct teams (sub optional)"
    teams ||--o{ positions : "staffed by"
    departments ||--o{ positions : "dept-level positions"
    positions ||--o{ employee_profiles : "filled by (N employees per position)"
    users ||--|| employee_profiles : "1:1 HR profile"
    branches ||--o{ employee_profiles : "home branch of"
    users }o--o| users : "reports_to (manager self-ref)"
    departments }o--o| positions : "headed_by (dept head)"

    companies {
        TEXT id PK
        TEXT name NN
        TEXT legal_name
        TEXT tax_id UK "เลขนิติบุคคล 13 หลัก"
        TEXT settings "JSON: ai_decision_rights ฯลฯ"
        TEXT _audit_cols "base contract: SL,is_active,version,created/updated/deleted *"
    }

    branches {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT branch_code UK,NN "UNIQUE(company_id,branch_code)"
        TEXT name NN
        TEXT branch_type "clinic|dental|hq|warehouse"
        TEXT province
        TEXT timezone "Asia/Bangkok"
        TEXT _audit_cols "base contract"
    }

    departments {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT dept_code UK,NN "CEO|OPS|MKT|MED|FIN|HR|IT|WH|FR|DENTAL"
        TEXT name_th NN
        TEXT name_en NN
        TEXT system_role "FK→roles.code (1:1 canonical)"
        TEXT head_position_id FK "→positions.id"
        TEXT default_security_level SL "MED/DENTAL→RESTRICTED hint"
        TEXT _audit_cols "base contract"
    }

    sub_departments {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT department_id FK,NN
        TEXT sub_code UK,NN "UNIQUE(department_id,sub_code)"
        TEXT name_th NN
        TEXT name_en
        TEXT _audit_cols "base contract"
    }

    teams {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT department_id FK,NN "denormalized for query scope"
        TEXT sub_department_id FK "nullable (team อาจอยู่ใต้ dept ตรง)"
        TEXT team_code UK,NN "UNIQUE(department_id,team_code)"
        TEXT name_th NN
        TEXT branch_id FK "team ผูกสาขา (optional)"
        TEXT _audit_cols "base contract"
    }

    positions {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT department_id FK,NN
        TEXT sub_department_id FK
        TEXT team_id FK
        TEXT position_code UK,NN "UNIQUE(company_id,position_code)"
        TEXT title_th NN
        TEXT title_en
        INTEGER level "1=staff..7=C-level"
        TEXT default_security_level SL
        TEXT _audit_cols "base contract"
    }

    employee_profiles {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT user_id FK,UK,NN "UNIQUE(user_id) → 1:1 users"
        TEXT position_id FK,NN
        TEXT home_branch_id FK
        TEXT employee_no UK,NN "UNIQUE(company_id,employee_no)"
        DATE hire_date
        TEXT employment_status "active|leave|terminated"
        TEXT salary_security_level SL "RESTRICTED"
        TEXT _audit_cols "base contract"
    }

    users {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT email UK,NN "UNIQUE(company_id,email) (citext)"
        TEXT password_hash NN "never returned by sanitize.ts"
        TEXT name NN
        TEXT app_role "FK→roles.code (legacy 13-role)"
        TEXT department "DEPRECATED → ใช้ employee_profiles.position_id"
        TEXT manager_user_id FK "self-ref reports_to"
        TEXT line_user_id "LINE binding"
        BOOLEAN email_notify
        TEXT _audit_cols "base contract"
    }
```

### 1.1 หมายเหตุ cardinality + integrity (Diagram A)

- **`departments` 1:1 `roles`** เชิง logical: 10 แผนก map 1:1 กับ system role ผ่าน `departments.system_role` → `roles.code` (ของเดิม `getSystemRoleForDepartment`) — เราคง 1:1 นี้แต่ย้ายเป็น FK จริง
- **`positions` → `teams`/`sub_departments`/`departments`:** position อยู่ได้ 3 ระดับ (team-level / sub-dept-level / dept-level) จึงมี FK สามตัว โดย **CHECK** บังคับ "อย่างน้อย `department_id` ต้องมี" และถ้ามี `team_id` ต้อง consistent กับ `sub_department_id`/`department_id` (ตรวจด้วย trigger หรือ generated denormalized column)
- **`employee_profiles` 1:1 `users`:** บังคับ `UNIQUE(user_id)` — ทุก user ที่เป็นพนักงานมี profile เดียว (external/system users อาจไม่มี — จึงเป็น `users ||--|| employee_profiles` ในเชิง business แต่ physical คือ `users ||--o| employee_profiles`)
- **`manager_user_id` self-ref:** ใช้ขับ ABAC "manager sees subordinate" และ approval chain (leave/OT) — ต้องมี CHECK กัน self-cycle ระดับ application + index `IDX(company_id, manager_user_id)`
- **Composite index ที่ต้องมี:** `IDX(company_id, department_id)` บน `sub_departments`/`teams`/`positions`; `IDX(company_id, home_branch_id)` บน `employee_profiles`; ทั้งหมดเพื่อรองรับ ABAC department/branch scope ใน `11-permission-matrix.md`

---

## 2. Diagram B — Governance / Authorization (RBAC × ABAC × Data-Ownership × Consent)

**เป้าหมาย:** ยก authorization จาก static map ในโค้ด (`rbac.ts MODULE_ACCESS`) ขึ้นมาเป็น **policy data** ที่ query ได้ + เพิ่ม `data_ownership` model และ `consent_logs` (ปัจจุบันไม่มี — gap #2, #3)

**สถานะ grounding:**

| Entity | สถานะ | หมายเหตุ |
|---|---|---|
| `roles` | **NEW (formalize)** | เดิมเป็น array `ROLES` 13 ตัวในโค้ด — ยกเป็น table |
| `permissions` | **NEW** | atomic permission (module × action) |
| `role_permissions` | **NEW** | junction roles ↔ permissions |
| `user_roles` | **NEW** | junction (เดิม role เป็น string เดียวบน user) — รองรับ multi-role + grant แบบมีเวลา |
| `permission_groups` | **EXISTS** | `nexus-hr-schema.ts` — overlay เพิ่มเติม |
| `user_permission_groups` | **EXISTS** | `nexus-hr-schema.ts` |
| `data_ownership` | **NEW** | owner/steward ของ row ใดๆ (resolve RESTRICTED + direct grant) |
| `security_levels` | **NEW (lookup)** | 4 ระดับ BASIC/MEDIUM/HARD/RESTRICTED |
| `consent_logs` | **NEW** | บันทึก consent (PDPA) ของ patient/employee/AI data use |

```mermaid
erDiagram
    companies ||--o{ roles : "scopes (system + custom roles)"
    companies ||--o{ permissions : "scopes"
    roles ||--o{ role_permissions : "grants"
    permissions ||--o{ role_permissions : "granted via"
    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "held by"
    users ||--o{ user_permission_groups : "member of"
    permission_groups ||--o{ user_permission_groups : "includes"
    permission_groups ||--o{ permission_group_permissions : "bundles"
    permissions ||--o{ permission_group_permissions : "bundled in"
    security_levels ||--o{ permissions : "min level required"
    users ||--o{ data_ownership : "owns / stewards"
    security_levels ||--o{ data_ownership : "classified at"
    users ||--o{ consent_logs : "subject of / granted by"
    companies ||--o{ consent_logs : "scopes"

    roles {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT code UK,NN "admin|ceo|operations|medical|dental|finance|hr|it|marketing|warehouse|franchise|sales|staff|+custom"
        TEXT name_th NN
        BOOLEAN is_system "true=ห้ามลบ (13 canonical)"
        INTEGER rank "ใช้จัดลำดับ override"
        TEXT _audit_cols "base contract"
    }

    permissions {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT module NN "home|people|finance|medical|... (~45 keys)"
        TEXT action NN "view|search|create|update|delete|export|approve|reject"
        TEXT min_security_level FK "→security_levels.code"
        TEXT perm_key UK,NN "UNIQUE(company_id,module,action)"
        TEXT _audit_cols "base contract"
    }

    role_permissions {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT role_id FK,NN
        TEXT permission_id FK,NN
        TEXT effect NN "ALLOW|DENY (deny wins)"
        TEXT _uk "UNIQUE(role_id,permission_id)"
        TEXT _audit_cols "base contract"
    }

    user_roles {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT user_id FK,NN
        TEXT role_id FK,NN
        TIMESTAMPTZ granted_at NN
        TEXT granted_by FK "→users.id"
        TIMESTAMPTZ expires_at "nullable = permanent"
        TEXT _uk "UNIQUE(user_id,role_id)"
        TEXT _audit_cols "base contract"
    }

    permission_groups {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT name UK,NN
        TEXT description
        TEXT _audit_cols "base contract"
    }

    user_permission_groups {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT user_id FK,NN
        TEXT group_id FK,NN
        TEXT _uk "UNIQUE(user_id,group_id)"
        TEXT _audit_cols "base contract"
    }

    permission_group_permissions {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT group_id FK,NN
        TEXT permission_id FK,NN
        TEXT _uk "UNIQUE(group_id,permission_id)"
    }

    security_levels {
        TEXT code PK "BASIC|MEDIUM|HARD|RESTRICTED"
        INTEGER rank NN "0..3"
        TEXT description_th NN
        BOOLEAN direct_grant_only "true สำหรับ RESTRICTED"
    }

    data_ownership {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT target_table NN "patients|payslips|... (logical)"
        TEXT target_id NN "row id (no hard FK)"
        TEXT owner_user_id FK,NN "เจ้าของ record"
        TEXT steward_user_id FK "ผู้ดูแล (เช่น HR ของ payroll)"
        TEXT security_level FK,NN "→security_levels.code"
        TEXT grant_scope "OWNER|DEPARTMENT|DIRECT_GRANT"
        TEXT _uk "UNIQUE(company_id,target_table,target_id)"
        TEXT _audit_cols "base contract"
    }

    consent_logs {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT subject_user_id FK "เจ้าของข้อมูล (employee) "
        TEXT subject_patient_id "→patients.id (logical, PII)"
        TEXT consent_type NN "PDPA_PII|AI_PROCESSING|MARKETING|MEDICAL_SHARE"
        TEXT status NN "GRANTED|WITHDRAWN|EXPIRED"
        TEXT scope_json "ขอบเขตที่ยินยอม"
        TIMESTAMPTZ effective_at NN
        TIMESTAMPTZ withdrawn_at
        TEXT request_id "link → audit_logs/ai_query_logs"
        TEXT security_level SL "RESTRICTED"
        TEXT _audit_cols "base contract"
    }
```

### 2.1 หมายเหตุ cardinality + decision logic (Diagram B)

- **Effective permission ของ user =** `(role_permissions ของทุก role ใน user_roles) ∪ (permission_group_permissions ของทุก group)` แล้ว apply **DENY-wins** + **deny-by-default** (ดู pipeline เต็มใน `11-permission-matrix.md`) — junction ทุกตัวมี `UNIQUE` กันซ้ำ
- **`data_ownership` คือหัวใจของ RESTRICTED + direct-grant:** เมื่อ `security_level = RESTRICTED` การเข้าถึงจะ **ไม่ inherit จาก department scope** ต้องมี row ใน `data_ownership` ที่ `owner_user_id` หรือ `steward_user_id` = ผู้ขอ หรือมี explicit grant — pointer เป็น `(target_table, target_id)` แบบ logical (ไม่มี hard FK เพื่อให้ครอบทุก table ได้)
- **`consent_logs` (PDPA):** ผูกได้ทั้ง `subject_user_id` (พนักงาน) และ `subject_patient_id` (คนไข้ — PII, อยู่ใน `patients`) — ทุกครั้งที่ AI จะประมวลผลข้อมูลคนไข้ต้องมี consent `AI_PROCESSING` ที่ `status=GRANTED` มิฉะนั้น block (เชื่อม `request_id` ไป Diagram D)
- **`security_levels` เป็น lookup 4 แถวคงที่** — referenced โดย `permissions.min_security_level`, `data_ownership.security_level` และ `security_level` ในทุก core table (เชิง CHECK constraint, ไม่จำเป็นต้อง FK จริงทุกที่เพื่อ performance)

---

## 3. Diagram C — Audit & Security Logs (Append-Only)

**เป้าหมาย:** แทน `audit_log` แบบ best-effort เดิม (gap #1) ด้วยชุด log ที่ **append-only + tamper-evident (hash-chain)** + เพิ่ม `login_logs`/`file_access_logs`/`permission_change_logs` ที่ปัจจุบัน "ไม่มีเลย" (gap #3)

**สถานะ grounding:**

| Entity | สถานะ | หมายเหตุ |
|---|---|---|
| `audit_logs` | **EXISTS → MIGRATE** | เดิม `audit_log` (single, no before/after, no hash) — ขยายเป็น schema เต็ม + `prev_hash`/`row_hash` |
| `login_logs` | **NEW** | auth event/failure (เดิมไม่ log) |
| `file_access_logs` | **NEW** | trail ของ view/download/export ไฟล์ |
| `permission_change_logs` | **NEW** | บันทึกทุกการแก้ role/permission/group |
| `user_files` | **EXISTS** | `nexus-ai-schema.ts` + migration `storage_path` — เพิ่ม `security_level` |

> **กฎ append-only (บังคับใน migration):** ทุก log table ใน diagram นี้
> 1. `REVOKE UPDATE, DELETE ON <table> FROM app_role;` (มีแต่ INSERT/SELECT)
> 2. BEFORE UPDATE/DELETE trigger → `RAISE EXCEPTION`
> 3. `row_hash = sha256(prev_hash || canonical_json(row))` → hash-chain ต่อเนื่องต่อ `company_id` (tamper-evident)
> 4. มี **retention policy** (เช่น 7 ปีสำหรับ medical/financial ตาม [ASSUMPTION] กฎหมายไทย) ด้วย partition by `created_at` (monthly)
> 5. write **ต้อง fatal-on-failure สำหรับ action สำคัญ** (ไม่ swallow แบบ `try/catch{}` เดิม) — โดยเฉพาะ delete/export/permission-change/ai-query

```mermaid
erDiagram
    companies ||--o{ audit_logs : "scopes (append-only)"
    users ||--o{ audit_logs : "actor"
    companies ||--o{ login_logs : "scopes"
    users }o--o{ login_logs : "actor (incl. failed = unknown user)"
    companies ||--o{ file_access_logs : "scopes"
    users ||--o{ file_access_logs : "accessor"
    user_files ||--o{ file_access_logs : "accessed file"
    companies ||--o{ permission_change_logs : "scopes"
    users ||--o{ permission_change_logs : "changed by"
    users }o--o{ permission_change_logs : "target user"
    audit_logs ||--o| audit_logs : "hash-chain prev (self-ref)"

    audit_logs {
        TEXT id PK
        TEXT company_id FK,NN,IDX
        TEXT actor_user_id FK,IDX "NULL=system/anonymous"
        TEXT actor_role NN "role ขณะกระทำ (snapshot)"
        TEXT action NN "login|logout|view|search|create|update|delete|soft_delete|restore|upload|download|export|approve|reject|permission_change|role_change|ai_query|ai_response|failed_access|blocked_access"
        TEXT target_table IDX "logical pointer (no FK)"
        TEXT target_id IDX
        TEXT target_security_level SL
        JSONB before_state "ก่อนแก้ (null สำหรับ create)"
        JSONB after_state "หลังแก้ (null สำหรับ delete)"
        JSONB changed_fields "array ชื่อ field ที่เปลี่ยน"
        TEXT result NN "SUCCESS|FAILURE|BLOCKED"
        TEXT failure_reason
        TEXT ip_address
        TEXT user_agent
        TEXT device
        TEXT request_id IDX "correlation → ai_query_logs/login_logs"
        TEXT session_id IDX
        TEXT endpoint
        TEXT http_method
        TEXT prev_hash "hash-chain"
        TEXT row_hash NN "sha256(prev_hash||row)"
        TIMESTAMPTZ created_at NN,IDX "append-only, partition key"
    }

    login_logs {
        TEXT id PK
        TEXT company_id FK,IDX "NULL ได้ถ้า email ไม่ match tenant"
        TEXT user_id FK,IDX "NULL = failed (unknown email)"
        TEXT email_attempted "เก็บ email ที่กรอก แม้ login fail"
        TEXT event NN "LOGIN_SUCCESS|LOGIN_FAILURE|LOGOUT|MFA_CHALLENGE|MFA_FAIL|LOCKOUT|TOKEN_REFRESH|IMPERSONATE_START|IMPERSONATE_END"
        TEXT failure_reason "bad_password|no_user|locked|expired"
        TEXT ip_address IDX
        TEXT user_agent
        TEXT device
        TEXT session_id IDX
        TEXT request_id IDX
        TEXT impersonated_by FK "→users.id (jwt impersonated_by)"
        TEXT row_hash NN "hash-chain"
        TIMESTAMPTZ created_at NN,IDX
    }

    file_access_logs {
        TEXT id PK
        TEXT company_id FK,NN,IDX
        TEXT user_id FK,NN,IDX "ผู้เข้าถึง"
        TEXT file_id FK,NN "→user_files.id"
        TEXT action NN "VIEW|DOWNLOAD|EXPORT|PREVIEW|SHARE_LINK"
        TEXT file_security_level SL "snapshot จาก user_files"
        TEXT result NN "SUCCESS|BLOCKED"
        TEXT failure_reason
        BIGINT bytes_served
        TEXT ip_address
        TEXT request_id IDX
        TEXT row_hash NN
        TIMESTAMPTZ created_at NN,IDX
    }

    permission_change_logs {
        TEXT id PK
        TEXT company_id FK,NN,IDX
        TEXT changed_by FK,NN "ผู้แก้สิทธิ"
        TEXT target_user_id FK,IDX "ผู้ถูกแก้ (nullable ถ้าแก้ role/group ระดับองค์กร)"
        TEXT change_type NN "ROLE_GRANT|ROLE_REVOKE|GROUP_ADD|GROUP_REMOVE|PERM_GRANT|PERM_REVOKE|DATA_GRANT|DATA_REVOKE"
        TEXT object_type "role|permission_group|permission|data_ownership"
        TEXT object_id "→ id ของ object ที่ถูกแก้"
        JSONB before_state
        JSONB after_state
        TEXT justification "เหตุผล (บังคับสำหรับ RESTRICTED grant)"
        TEXT request_id IDX
        TEXT row_hash NN
        TIMESTAMPTZ created_at NN,IDX
    }

    user_files {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT owner_user_id FK,NN
        TEXT filename NN
        TEXT storage_path NN "migration: user_files.storage_path"
        TEXT mime_type
        BIGINT size_bytes
        TEXT security_level SL "NEW: เดิมมีแค่ security_tier label"
        TEXT _audit_cols "base contract"
    }
```

### 3.1 หมายเหตุ append-only + correlation (Diagram C)

- **`audit_logs` self-ref hash-chain:** `prev_hash` ชี้ไปยัง `row_hash` ของ record ก่อนหน้า (เรียงตาม `created_at` ภายใน `company_id`) — verify ได้ทั้ง chain เพื่อพิสูจน์ไม่มีการลบ/แก้ย้อนหลัง (ของเดิมไม่มี — gap #1)
- **`request_id` คือ correlation key หลัก** เชื่อม `audit_logs` ↔ `login_logs` ↔ `file_access_logs` ↔ `ai_query_logs` (Diagram D) — 1 HTTP request ผลิตได้หลาย log ข้าม table แต่ผูกด้วย `request_id` เดียว (จึงเป็นความสัมพันธ์เชิง logical ไม่ใช่ FK)
- **`login_logs` รองรับ failed login ของ user ที่ไม่รู้จัก:** `user_id` nullable, เก็บ `email_attempted` ไว้สอบสวน brute-force/lockout — เป็นเหตุผลที่ relationship `users }o--o{ login_logs` เป็น optional ทั้งสองฝั่ง
- **`file_access_logs` → `user_files`** เป็น FK จริง (ฝั่งเดียวที่ log มี FK ได้ เพราะ file ไม่ถูก hard-delete) — ปิด gap "ไฟล์ถูกเสิร์ฟโดยไม่มี trail"
- **`permission_change_logs.justification`** บังคับ NOT NULL สำหรับ `change_type IN (DATA_GRANT, PERM_GRANT)` ที่แตะ RESTRICTED (enforce ด้วย CHECK + application) — ทุก grant ของข้อมูล RESTRICTED ต้องมีเหตุผลกำกับ

---

## 4. Diagram D — AI Governance (ai_query_logs × redaction × decision × policy)

**เป้าหมาย:** แทน `ai_logs` legacy ที่ metering ปลอม (length/4 tokens, fixed 0.5 THB, ไม่เก็บ prompt/response — gap #4) ด้วย **`ai_query_logs`** เต็มรูป + ผูก **redaction** และ **data-access policy** เข้ากับ flow "AI ไม่อ่าน DB ตรง"

**สถานะ grounding:**

| Entity | สถานะ | หมายเหตุ |
|---|---|---|
| `ai_logs` | **EXISTS → DEPRECATE** | คงไว้ read-only ชั่วคราว, write ใหม่ลง `ai_query_logs` |
| `ai_query_logs` | **NEW** | prompt+response+provider+model+tokens+latency+decision+grounded+redaction |
| `ai_redaction_events` | **NEW** | บันทึกทุก PII/field ที่ถูก mask ก่อนส่ง provider |
| `ai_decision_overrides` | **NEW** | human override ของ auto/suggest decision (Copilot not Autopilot) |
| `ai_data_access_policy` | **NEW** | per-table/per-field policy ว่า AI อ้างถึงได้ไหม ที่ security_level ใด |

```mermaid
erDiagram
    companies ||--o{ ai_query_logs : "scopes"
    users ||--o{ ai_query_logs : "asked by"
    ai_query_logs ||--o{ ai_redaction_events : "redacted (N fields masked)"
    ai_query_logs ||--o| ai_decision_overrides : "may be overridden"
    users ||--o{ ai_decision_overrides : "overridden by (human)"
    companies ||--o{ ai_data_access_policy : "defines"
    security_levels ||--o{ ai_data_access_policy : "max level AI may surface"
    ai_query_logs }o--o| audit_logs : "request_id correlation (logical)"

    ai_query_logs {
        TEXT id PK
        TEXT company_id FK,NN,IDX
        TEXT user_id FK,NN,IDX "ผู้ถาม (identify ก่อน filter)"
        TEXT actor_role NN "role ขณะถาม (กำหนด data scope)"
        TEXT task_type NN "strategy|automation|research|thai_market|general"
        TEXT provider NN "openai|claude|gemini|typhoon"
        TEXT model NN "gpt-4o|claude-sonnet-4|..."
        TEXT prompt_redacted NN "prompt หลัง redaction (ส่งจริง)"
        TEXT prompt_hash "sha256 ของ raw prompt (ไม่เก็บ raw PII)"
        TEXT response_text "คำตอบ (หลัง output filter)"
        TEXT decision NN "auto|suggest|human"
        BOOLEAN grounded NN "ใช้ org RAG context หรือไม่"
        TEXT data_scope_json "tables/rows ที่อนุญาตให้เข้าถึง (post-ABAC)"
        BOOLEAN redaction_applied NN
        BOOLEAN output_blocked "true=คำตอบโดน redact/หยุด"
        INTEGER prompt_tokens "เมตริงจริง (ไม่ใช่ len/4)"
        INTEGER completion_tokens
        NUMERIC cost_thb "คำนวณจริงตาม provider rate"
        INTEGER latency_ms
        TEXT status NN "SUCCESS|FALLBACK|BLOCKED|ERROR"
        TEXT request_id IDX "→ audit_logs.request_id"
        TEXT session_id IDX
        TEXT security_level SL "RESTRICTED (เก็บ prompt/response)"
        TIMESTAMPTZ created_at NN,IDX
    }

    ai_redaction_events {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT ai_query_log_id FK,NN "→ai_query_logs.id"
        TEXT target_field NN "salary|national_id|patient_name|..."
        TEXT redaction_type NN "MASK|HASH|DROP|TOKENIZE"
        TEXT reason NN "security_level|consent_missing|policy_deny"
        TIMESTAMPTZ created_at NN
    }

    ai_decision_overrides {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT ai_query_log_id FK,NN
        TEXT overridden_by FK,NN "→users.id (human)"
        TEXT original_decision NN "auto|suggest"
        TEXT final_action NN "APPROVED|REJECTED|EDITED"
        TEXT note
        TEXT request_id IDX
        TIMESTAMPTZ created_at NN
    }

    ai_data_access_policy {
        TEXT id PK
        TEXT company_id FK,NN
        TEXT target_table NN "patients|payslips|deals|..."
        TEXT target_field "NULL=ทั้ง table"
        BOOLEAN ai_may_access NN "deny-by-default → false"
        TEXT max_security_level FK "→security_levels.code (AI surface ได้ถึงระดับนี้)"
        BOOLEAN require_consent "true สำหรับ patient PII"
        TEXT _uk "UNIQUE(company_id,target_table,target_field)"
        TEXT _audit_cols "base contract"
    }
```

### 4.1 หมายเหตุ AI flow + relationship (Diagram D)

- **AI access flow ผูกกับ entities นี้อย่างไร** (ตรงกับ Global Rule "AI ไม่อ่าน DB ตรง"):
  1. user query → identify (`ai_query_logs.user_id`, `actor_role`)
  2. check policy → `ai_data_access_policy` (deny-by-default) + ABAC (Diagram B) + `consent_logs` (ถ้า `require_consent`)
  3. filter allowed data → เก็บ `data_scope_json`
  4. **redact** ก่อนส่ง provider → ทุก field ที่ mask = 1 row ใน `ai_redaction_events`
  5. ส่ง `prompt_redacted` → provider → response → output filter (`output_blocked`)
  6. log ครบใน `ai_query_logs` + correlate `request_id` ไป `audit_logs` (`action='ai_query'/'ai_response'`)
- **`ai_query_logs` ↔ `audit_logs`** เป็น **logical** ผ่าน `request_id` (ตาม Global Rule "AI logs separate but linked by request_id") — ไม่ทำ hard FK เพื่อให้สอง store แยก retention/partition กันได้
- **`ai_decision_overrides`** บังคับใช้หลัก "Copilot not Autopilot": ทุก decision `auto`/`suggest` ที่มนุษย์เข้ามาแก้ → 1 row, เก็บ `original_decision` vs `final_action` (audit trail ของการตัดสินใจ AI)
- **`prompt_hash` ไม่เก็บ raw PII:** เก็บเฉพาะ `prompt_redacted` (หลัง mask) + hash ของ raw เพื่อ dedupe/idempotency โดยไม่ persist PII ดิบ — สอดคล้องกับ redaction requirement
- **`cost_thb`/tokens เมตริงจริง:** ดึงจาก provider usage API (ไม่ใช่ `prompt.length/4` แบบ `ai_logs` เดิม) — `security_level=RESTRICTED` เพราะ prompt/response อาจมีบริบทธุรกิจ

---

## 5. Cross-Diagram Map (ภาพรวมความเชื่อมระหว่าง 4 diagram)

ตารางสรุป **join key หลัก** ที่ร้อย 4 diagram เข้าด้วยกัน — ใช้เป็น checklist ตอนเขียน migration/query:

| จาก (Diagram) | ผ่าน key | ไป (Diagram) | ประเภท |
|---|---|---|---|
| `users` (A) | `users.id` | `user_roles.user_id` (B) | FK จริง |
| `users` (A) | `users.id` | `data_ownership.owner_user_id` (B) | FK จริง |
| `departments` (A) | `departments.system_role` | `roles.code` (B) | FK จริง (1:1 canonical) |
| `positions` (A) | `positions.default_security_level` | `security_levels.code` (B) | lookup/CHECK |
| ทุก core table (A,B) | `*.id` + `target_table/target_id` | `audit_logs` (C) | **logical pointer** (no FK) |
| `user_files` (C) | `user_files.id` | `file_access_logs.file_id` (C) | FK จริง |
| `roles`/`permission_groups` (B) | `object_id` | `permission_change_logs` (C) | logical |
| ทุก request | `request_id` | `audit_logs` ↔ `login_logs` ↔ `file_access_logs` ↔ `ai_query_logs` (C,D) | **correlation (logical)** |
| `consent_logs` (B) | `request_id` / `subject_patient_id` | `ai_query_logs` (D) + `patients` | logical / gate |
| `ai_query_logs` (D) | `ai_query_log_id` | `ai_redaction_events`, `ai_decision_overrides` (D) | FK จริง |

### 5.1 หลักการเลือก FK จริง vs logical pointer (สรุป)

- **FK จริง (`REFERENCES ... ON DELETE RESTRICT`)** ใช้กับความสัมพันธ์ภายใน business model ที่ทั้งสองฝั่งเป็น "ข้อมูลที่ใช้งาน" และไม่ถูก hard-delete (เช่น `employee_profiles.position_id`, `file_access_logs.file_id`, `ai_redaction_events.ai_query_log_id`)
- **Logical pointer (`target_table` + `target_id`, ไม่มี FK)** ใช้กับ **audit/log tables** ที่ต้อง append-only + คงอยู่แม้ target ถูก soft-delete + ต้องชี้ได้ทุก table แบบ polymorphic — เป็นการแลก referential strictness กับ immutability ของ audit (ตามเจตนา append-only)
- **Correlation key (`request_id`, `session_id`)** ไม่ใช่ FK — เป็น UUID ที่สร้างต้นทาง request แล้ว stamp ลงทุก log ข้าม store เพื่อ trace end-to-end

---

## 6. สรุปสถานะ (EXISTS / MIGRATE / NEW) ทั้ง model

| กลุ่ม | EXISTS (ใช้ต่อ) | MIGRATE (ขยาย schema) | NEW (migration ใหม่) |
|---|---|---|---|
| **Org (A)** | `companies`, `branches`, `departments`, `positions`, `employee_profiles`, `users` | `departments` (+FK), `users` (deprecate `department` string) | `sub_departments`, `teams` |
| **Governance (B)** | `permission_groups`, `user_permission_groups` | — | `roles`, `permissions`, `role_permissions`, `user_roles`, `permission_group_permissions`, `data_ownership`, `security_levels`, `consent_logs` |
| **Audit/Security (C)** | `user_files` | `audit_log`→`audit_logs` (before/after + hash-chain + IP/UA/request_id), `user_files` (+`security_level`) | `login_logs`, `file_access_logs`, `permission_change_logs` |
| **AI (D)** | `ai_logs` (deprecate) | — | `ai_query_logs`, `ai_redaction_events`, `ai_decision_overrides`, `ai_data_access_policy` |

> **[ASSUMPTION]** retention: medical/dental/patient + financial logs เก็บ **7 ปี**, audit ทั่วไป **3 ปี**, AI query logs **2 ปี** (ปรับตามที่ปรึกษากฎหมาย PDPA/กรมสรรพากร) — ยังไม่มี policy จริงในระบบปัจจุบัน จึงตั้งเป็น assumption
> **[ASSUMPTION]** จำนวนสาขา/headcount/salary band ไม่ทราบจริง — `branches`/`employee_profiles` รองรับ N สาขาแบบ generic ไว้แล้ว

---

## 7. ภาคผนวก — Index & Constraint Checklist (ที่ต้องมีตอน migrate)

```sql
-- ===== Diagram A =====
CREATE UNIQUE INDEX uq_branch_code      ON branches(company_id, branch_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_dept_code        ON departments(company_id, dept_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_subdept_code     ON sub_departments(department_id, sub_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_team_code        ON teams(department_id, team_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_position_code    ON positions(company_id, position_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_emp_profile_user ON employee_profiles(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_emp_no           ON employee_profiles(company_id, employee_no) WHERE deleted_at IS NULL;
CREATE        INDEX ix_pos_scope        ON positions(company_id, department_id, sub_department_id, team_id);
CREATE        INDEX ix_user_mgr         ON users(company_id, manager_user_id);
ALTER TABLE positions ADD CONSTRAINT ck_pos_scope CHECK (department_id IS NOT NULL);

-- ===== Diagram B =====
CREATE UNIQUE INDEX uq_role_code        ON roles(company_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_perm_key         ON permissions(company_id, module, action) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_role_perm        ON role_permissions(role_id, permission_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_user_role        ON user_roles(user_id, role_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_data_owner       ON data_ownership(company_id, target_table, target_id) WHERE deleted_at IS NULL;
ALTER TABLE role_permissions ADD CONSTRAINT ck_effect CHECK (effect IN ('ALLOW','DENY'));

-- ===== Diagram C (append-only) =====
CREATE INDEX ix_audit_scope   ON audit_logs(company_id, created_at);
CREATE INDEX ix_audit_target  ON audit_logs(company_id, target_table, target_id);
CREATE INDEX ix_audit_req     ON audit_logs(request_id);
CREATE INDEX ix_login_email   ON login_logs(email_attempted, created_at);
CREATE INDEX ix_file_acc      ON file_access_logs(company_id, file_id, created_at);
-- append-only enforcement
REVOKE UPDATE, DELETE ON audit_logs, login_logs, file_access_logs, permission_change_logs FROM nexus_app;
-- + BEFORE UPDATE/DELETE triggers RAISE EXCEPTION (ดู §3)

-- ===== Diagram D =====
CREATE INDEX ix_aiq_scope     ON ai_query_logs(company_id, created_at);
CREATE INDEX ix_aiq_req       ON ai_query_logs(request_id);
CREATE UNIQUE INDEX uq_ai_policy ON ai_data_access_policy(company_id, target_table, COALESCE(target_field,'*')) WHERE deleted_at IS NULL;
ALTER TABLE ai_data_access_policy ALTER COLUMN ai_may_access SET DEFAULT FALSE; -- deny-by-default
```

> **กฎปิดท้าย:** ทุก entity ในเอกสารนี้ผูกกับ `company_id` (tenant), มี `security_level` (4 ระดับ), soft-delete + `version`, และทุก mutation ต้องผลิต record ใน `audit_logs` (append-only, hash-chained) — ไม่มีข้อยกเว้น (deny-by-default, enforce ที่ Backend เท่านั้น ทั้ง API และ AI query)
