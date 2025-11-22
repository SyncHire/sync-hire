<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Python Development

### Package Management
- **Use `uv` for all Python package operations** - not pip, pip3, or other package managers
- Install packages: `uv add <package-name>`
- Remove packages: `uv remove <package-name>`
- Sync dependencies: `uv sync`
- Run Python scripts: `uv run python <script.py>`

### Python Execution
- Always use `uv run python` to execute Python scripts
- This ensures the correct virtual environment and dependencies are used
- Example: `uv run python apps/agent/main.py`

## TypeScript/JavaScript Development

### Import Rules
- **Never use inline/dynamic imports** - always use static imports at the top of the file
- Bad: `const { toast } = await import('@/lib/hooks/use-toast');`
- Good: `import { toast } from '@/lib/hooks/use-toast';` at the top of the file