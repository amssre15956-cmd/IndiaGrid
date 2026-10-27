# Plan: Make the Methodology Document module solid and responsive

## Context
The four attachments are the same package as last turn (the `.md` and `.html` are byte-identical to `public/docs/METHODOLOGY.*`, plus the zip and the README). There is still no backend code or data. `src/Methodology.tsx` already exists and is wired into `src/App.tsx` (sidebar, module card, hero CTA, nav link). It has never been run in a browser, and no browser tooling is installed. The user wants the module to be "click responsive" and framed around their backend logic, and wants missing sources reported.

## Steps
1. **Responsive pass on `src/Methodology.tsx`.** Check 360, 768 and 1280 px widths. Target risks:
   - the sticky mobile TOC sitting under the fixed nav (`top-16`)
   - `Planner` grids (`xl:grid-cols-5`) on tablets
   - horizontal overflow in `Formula` blocks and the `CorridorSim` track
   - the table-to-card swap in `SourcesTable`
2. **Fix content issues in the source docs.** `public/docs/METHODOLOGY.md` and `.html` have broken LaTeX (`rac{`, `imes`, `ight)`). Repair the formulas (`\frac`, `\times`, `\right`). Correct the forecast figure from 65,632 to 65,721 (still 657 required, 357 additional).
3. **Make "click responsive" real.**
   - Deep link: hash route `#/methodology` so the view survives refresh and the back button.
   - Section anchors with focus management.
   - Keyboard operation for the pipeline tabs (arrow keys).
   - Close the sidebar on mobile after navigation.
4. **Keep the existing design.** Reuse the `glass`, `lift`, `mono-label` and `btn-*` classes and the theme tokens. No new dependencies.
5. **Browser verification.** Install `playwright-core` as a dev dependency and use `/usr/bin/chromium` to screenshot all three widths and click through the tabs and sliders. This installs a package, so it needs approval.

## Missing sources to report to the user
- No Python or backend code, API contract or endpoints; calculators run client-side from the document's formulas.
- No real Uttar Pradesh district, charger or VAHAN data, so no district table or UP map.
- Min-max bounds for normalisation, plus real demand-context and corridor-deficit values, are absent (currently sliders; EVs-per-charger ceiling is assumed to be 166.7).
- `METHODOLOGY.pdf` is referenced by the README but not supplied.
- Scope mismatch: the document is Uttar Pradesh only, while the site is national.

## Verification
- `npx tsc --noEmit -p .`
- Screenshots at 360 / 768 / 1280 px in dark and light themes.
- Click through: sidebar, module card, hero CTA, nav link, Back, refresh on `#/methodology`.
