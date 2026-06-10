## Implementation Plan

The goal is to update the "Detalhado por convênio" table in the "Glosa Recuperada" dashboard to support collapsing/expanding data by month, similar to the "Resumo Recursos Efetuados" table in the "Ranking Glosa" dashboard.

### 1. Update `src/routes/glosa-recuperada.tsx`
- **Utility Function**: Add `mesSortKey` to correctly sort payment months (e.g., "Janeiro/2024").
- **State**: Add `expandedRanking` state to track which provider rows are expanded.
- **Grouping Logic**: Refactor the `ranking` `useMemo` to group records first by provider and then by payment month within each provider.
- **UI Update**:
  - Update the "Detalhado por convênio" table to:
    - Include a toggle icon (ChevronDown/ChevronRight).
    - Show month count in the parent row.
    - Render child rows for each month when a provider is expanded.
    - Ensure consistent styling with the rest of the dashboard.
  - Add "Expandir tudo" and "Recolher tudo" buttons for convenience.

### Technical Details
- The new `ranking` structure will be:
  ```typescript
  Array<{
    convenio: string;
    submetida: number;
    recuperada: number;
    mantida: number;
    meses: Array<{
      mes: string;
      submetida: number;
      recuperada: number;
      mantida: number;
    }>;
  }>
  ```
- Use `framer-motion` (if available) or standard React state for the collapse animation/logic. (Standard state is safer and already used in the project).
