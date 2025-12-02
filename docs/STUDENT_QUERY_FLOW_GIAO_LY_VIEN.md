# Student Query Flow — Role `giao_ly_vien`

## Overview
- This flow captures how a `giao_ly_vien` searches for students.
- It shows the UI steps and the backend calls involved.

## Step-by-step Flow
1. `giao_ly_vien` logs into the system.
2. Backend loads the user's assigned `class_id` and stores it in the session/token.
3. User navigates to the Student Directory, which pre-fills the `class_id` filter with the assigned class.
4. User can add optional filters (student name, keywords) and submits the search; `class_id` stays locked to the assigned value.
5. Frontend sends `GET /students?class_id={assignedClassId}&...` including the locked `class_id`.
6. Backend validates the token, re-resolves the user's assigned `class_id`, and rejects requests whose `class_id` does not match.
7. Backend queries the student table using the validated `class_id` plus optional filters.
8. Backend returns only the students from the assigned class to the frontend.
9. Frontend renders the student list and allows drill-down into student details limited to that class.

## Mermaid Diagram
```mermaid
flowchart TD
    A[Login as giao_ly_vien] --> B[Backend loads assigned class_id]
    B --> C[Open Student Directory with locked class filter]
    C --> D[Enter optional filters & submit]
    D --> E[Frontend calls GET /students?class_id=assigned]
    E --> F[Backend validates token & class lock]
    F --> G{Class_id matches assigned?}
    G -- No --> H[Reject request (empty/403)]
    G -- Yes --> I[Query student table for assigned class]
    I --> J[Return students from assigned class]
    J --> K[Display class-specific student list]
```
