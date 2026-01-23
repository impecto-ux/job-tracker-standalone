
# Visual Task Board Redesign Plan

## Kanban Layout
We will replace the vertical list with a horizontal scrollable container holding 4 columns:
1.  **To Do** (bg-zinc-900)
2.  **In Progress** (bg-blue-900/10)
3.  **Review / Done** (bg-green-900/10)
4.  **Blocked** (bg-red-900/10)

## Dashboard Header (Infographic)
Instead of simple number cards, we will add a section called "Live Operations Center":
-   **Total Active Tasks:** Big counter.
-   **Department Load (Bar Chart):** A set of CSS bars showing the ratio of tasks per department (e.g., Post-Production vs Design).
-   **Completion Rate:** A circular progress (CSS-based) showing % of 'Done' tasks.

## Enhanced Task Cards
-   **Badges:** 'High Priority' with fire icon.
-   **Avatar:** User initials with colored background.
-   **Department Tag:** Small colored pill.
-   **Clean Typography:** Inter font, lighter colors for secondary text.
