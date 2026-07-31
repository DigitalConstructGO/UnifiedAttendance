# UnifiedAttendance glossary

- **Person** — a human identity and contact record; a Person may become an Employee.
- **Employee** — the stable staff identity and employee code used across attendance and access workflows.
- **Employment Period** — a non-overlapping, effective-dated assignment of an Employee to a branch, department, position, employment type, and status.
- **Employment Contract** — a dated agreement for an Employee and one Employment Period; every contract has a Cosigner and may own a private signed-contract document.
- **Cosigner** — a person who guarantees one or more Employment Contracts; a Cosigner does not belong directly to a Person or Employee.
- **Employee Document** — private S3-backed metadata for an employee, cosigner, or employment contract file; access is granted with short-lived signed URLs.
- **Attendance Event** — an immutable biometric device punch received from a configured attendance device.
- **Manual Attendance Entry** — an attributable staff-authored attendance overlay; it never changes an Attendance Event.
- **Attendance Day** — the derived attendance result for one Employee on one local branch date.
- **Attendance Correction** — a requested, reviewed overlay that affects an Attendance Day only when approved.

## Client / CRM language

- **Client** — an external company or customer organization served by the workspace. _Avoid_: Customer, Account, Company (as the canonical domain name).
- **Client Type** — an editable workspace classification of a Client such as enterprise; it is not the Client's lifecycle or sales stage.
- **Company Size** — an editable classification of the Client's organizational scale. It is separate from Client Type even when both currently use the label Enterprise.
- **Industry** — an editable workspace sector classification used to group Clients and report revenue. _Avoid_: hard-coded industry enum.
- **Account Owner** — the internal Employee responsible for the Client relationship. _Avoid_: User, unless referring specifically to an authenticated account.
- **Client Owner Assignment** — the dated history of an Employee becoming or ceasing to be a Client's Account Owner; the current owner is only the latest open assignment.
- **Client Contact** — a named person associated with a Client, with their own phone, email, and role. One Client Contact may be designated as primary; this does not replace the Client's main business phone and email.
- **Client Status** — the relationship state of a Client, such as active or archived. It does not describe a proposal, project, or invoice.
- **Client Directory Status** — a derived headline describing a Client's most relevant current Project or Opportunity state. _Avoid_: storing Active project, Proposal sent, Negotiation, Waiting payment, or Completed as Client Status values.
- **Recurring Client** — a Client with at least two Projects currently in progress or completed. It is a derived segment, not a Client Status.
- **Opportunity** — a commercial pursuit for a prospective or existing Client. An Opportunity may exist before a prospect becomes a Client. _Avoid_: Lead as the aggregate name; “Lead” is a pipeline stage in the UI.
- **Pipeline Stage** — an editable, ordered sales state of an Opportunity, including Lead, Qualified, Proposal sent, Negotiation, and Waiting payment.
- **Opportunity Stage Transition** — an immutable dated move between Pipeline Stages; it supplies sales history and Timeline events while the Opportunity keeps only its current-stage projection.
- **Project** — a piece of work delivered for a Client. Project status describes delivery, such as planning, in progress, completed, or cancelled.
- **Commercial Contract** — a commercial agreement with a Client, optionally associated with a Project or Opportunity. _Avoid_: Contract without qualification; Employment Contract is a separate workforce concept.
- **Client Document** — a private, versioned business file belonging to a Client and optionally concerning one Commercial Contract, Opportunity, Project, or Invoice; it is distinct from an Employee Document.
- **Client Note** — an authored internal note about a Client; it is separate from the event-oriented CRM Activity history.
- **Invoice** — a request for payment issued to a Client for billable work. Invoice lifecycle and payment state are separate concepts.
- **Invoice Payment** — a recorded receipt allocated to an Invoice; outstanding and overdue balances are derived from invoices, payments, and due dates.
- **Invoiced Revenue** — the total value of issued, non-void Invoices in a reporting period. _Avoid_: Revenue without qualification.
- **Collected Revenue** — the total Invoice Payments received in a reporting period. _Avoid_: Revenue without qualification.
- **CRM Activity** — a deliberately recorded interaction associated with a Client or Opportunity; it provides the source for “last activity,” while system-generated events appear through Client Timeline.
- **Client Health** — a derived assessment of the Client relationship based on recent activity, delivery, and billing signals. It is separate from manually assigned Client Priority.
- **Client Priority** — the manually assigned importance or attention level of a Client; it may be Critical even when Client Health is Healthy.
- **Client Timeline** — a chronological read-only projection of Client activities and important business changes; it is not a separate authored record.
- **Audit Entry** — an immutable record of who changed Client data, what changed, and when.
- **Client Overview** — a read-only summary of Clients, Opportunities, Projects, Invoices, and Invoice Payments used by the dashboard and directory; it is not a primary business entity.
