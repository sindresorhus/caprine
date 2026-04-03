# Caprine AGENTS.md

## Build/Lint/Test Commands

- **Build**: `npm run build` or `npm run start` (runs TypeScript compiler)
- **Lint**: `npm run lint` (runs both `npm run lint:xo` and `npm run lint:stylelint`)
- **Type checking**: `npm run test:tsc` (runs `npm run build`)
- **Full test suite**: `npm run test` (type check + lint)
- **Distribution**: `npm run dist:mac`, `npm run dist:linux`, or `npm run dist:win`

Note: There are no unit tests in this project. The test command only runs type checking and linting.

## Code Style Guidelines

### TypeScript/JavaScript (via XO)

- Extends XO with TypeScript support
- Target: ES2022, Module: commonjs
- Enabled esnext, dom, and dom.iterable lib types

#### Disabled Rules (explicitly allowed):
- `@typescript-eslint/ban-ts-comment` - `@ts-expect-error` comments allowed
- `@typescript-eslint/consistent-type-imports` - Dynamic imports allowed
- `@typescript-eslint/naming-convention` - No strict naming requirements
- `@typescript-eslint/no-floating-promises` - Async functions without await allowed
- `@typescript-eslint/no-loop-func` - Functions in loops allowed
- `@typescript-eslint/no-non-null-assertion` - Non-null assertions (!) allowed
- `@typescript-eslint/no-require-imports` - CommonJS require() allowed
- `@typescript-eslint/no-unsafe-*` - Many type safety checks disabled for flexibility
- `import/extensions` - File extensions in imports allowed
- `import/no-anonymous-default-export` - Anonymous default exports allowed
- `import/no-cycle` - Circular dependencies allowed
- `n/file-extension-in-import` - File extensions in imports allowed
- `unicorn/prefer-at` - Use of .at() not required
- `unicorn/prefer-module` - CommonJS allowed
- `unicorn/prefer-top-level-await` - Top-level await not required

#### Conventions:
- Use `const` for variables, `let` for reassignment, avoid `var`
- Use double quotes for strings
- Use 2-space indentation (configured inxo config)
- No trailing semicolons (XO default)
- Use `camelCase` for functions/variables, `PascalCase` for types/classes
- Use `ts-expect-error` for known type issues
- Prioritize readability over strict type safety

### CSS/Style (via Stylelint)

- Extends `stylelint-config-xo`
- Based on XO style guide (2-space indentation, double quotes)

#### Disabled Rules:
- `declaration-no-important` - `!important` allowed
- `no-descending-specificity` - Specificity order not enforced
- `no-duplicate-selectors` - Duplicate selectors allowed
- `rule-empty-line-before` - No empty line requirement before rules
- `selector-class-pattern` - No naming pattern enforced
- `selector-id-pattern` - No ID naming pattern enforced
- `selector-max-class` - No class count limit

#### Conventions:
- Use BEM-style class names (e.g., `.x9f619`, `.x1n2onr6`)
- Prefer attribute selectors for Facebook elements (fragile but necessary)
- Use `!important` liberally to override Facebook's inline styles
- Organize CSS by feature (browser.css, dark-mode.css, etc.)

### Error Handling

- Use `try-catch` for async operations where appropriate
- Prefer returning undefined/null over throwing for recoverable errors
- Use `dialog.showMessageBoxSync` for critical errors requiring user interaction
- Log errors to console when appropriate

### Naming Conventions

- Functions/variables: `camelCase` (e.g., `sendAction`, `getWindow`, `toggleTrayIcon`)
- Types/Interfaces: `PascalCase` with `I` prefix for interfaces (e.g., `IToggleSounds`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `messengerDomain`)
- Selectors: lowercase with hyphens (Facebook's naming)
- File names: `camelCase` or `kebab-case`

### Imports

- Use ES module syntax (`import`) where possible
- CommonJS `require()` allowed when needed (e.g., electron modules)
- Import from `./` relative paths within project
- Order: external libs → internal modules → types

## Additional Notes

- **Electron version**: v29.0.1
- **Node requirement**: >=16
- **Main output**: `dist-js/` directory
- **Build system**: TypeScript + electron-builder
- **License**: MIT
- **Platform support**: macOS, Linux, Windows

## Cursor/Copilot Rules

No Cursor rules or Copilot instructions found in the repository.