## 2026-04-26 - Add accessible names to icon buttons
**Learning:** Found several icon-only buttons (`Minus`, `Plus` adjustments, `X` clear button) in interactive forms lacking `aria-label` or `title` attributes, making them inaccessible to screen readers. Focus states were also indistinct.
**Action:** Always add semantic `aria-label` and `title` to icon-only interactive elements and include explicit keyboard focus styles (`focus-visible:ring-2`, `focus-visible:outline-none`) using existing utility classes.
