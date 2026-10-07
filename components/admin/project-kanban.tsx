import { Activity, CircleCheck, CreditCard, Database, Eye, FileUp, GitBranch, ShieldCheck, Workflow } from 'lucide-react'

const columns = [
  {
    id: 'backlog',
    title: 'Backlog',
    description: 'External decisions and configuration still needed',
    accent: 'bg-[#d9a78c]',
    tasks: [
      {
        title: 'Confirm the product identity',
        area: 'Product',
        icon: Eye,
        description:
          'The existing storefront is morrow. home/lifestyle goods, while the supplied brief says Eye Contact Lenses. Keep current copy and assets until the catalog identity is confirmed.',
        files: 'app/page.tsx · app/layout.tsx',
      },
      {
        title: 'Configure admin access',
        area: 'Operations',
        icon: ShieldCheck,
        description:
          'The signed-session admin login is implemented, but an operator must set the private ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET values in each target environment.',
        files: 'lib/auth/admin.ts · Vercel project environment',
      },
      {
        title: 'Connect checkout and payment processing',
        area: 'Storefront',
        icon: CreditCard,
        description:
          'Browsing, search, filters, and the in-page bag are functional. Do not create orders until a payment provider and its approved checkout flow are configured.',
        files: 'components/storefront/storefront-panel.tsx · payment integration',
      },
      {
        title: 'Enforce repository collaborator access',
        area: 'GitHub',
        icon: GitBranch,
        description:
          'The operator identity policy is documented, but repository-wide exclusivity requires a repository owner to change collaborator access in GitHub settings.',
        files: 'AGENTS.md · GitHub collaborator settings',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In progress',
    description: 'No active in-repository implementation tasks',
    accent: 'bg-[#b58b5b]',
    tasks: [],
  },
  {
    id: 'done',
    title: 'In place',
    description: 'Implemented and checked in the repository',
    accent: 'bg-[#68765f]',
    tasks: [
      {
        title: 'Shared Neon data foundation',
        area: 'Database',
        icon: Database,
        description:
          'Storefront and admin data access use the same Drizzle schema and Postgres connection; catalog reads flow through a Next.js API route.',
        files: 'lib/db/ · app/actions/ · app/api/products/',
      },
      {
        title: 'Storefront catalog and bag',
        area: 'Storefront',
        icon: CircleCheck,
        description:
          'Active products, images, categories, search, prices, and stock come from the database. The in-page bag is session-memory only and explains why checkout is not available.',
        files: 'components/storefront/storefront-panel.tsx · app/api/products/',
      },
      {
        title: 'Protect admin operations',
        area: 'Security',
        icon: ShieldCheck,
        description:
          'Configured single-operator credentials create an HTTP-only signed session. Admin data actions, API reads, uploads, and deletes verify the session on the server.',
        files: 'lib/auth/admin.ts · app/actions/admin.ts · app/api/admin/',
      },
      {
        title: 'Finish product media uploads',
        area: 'Storage',
        icon: FileUp,
        description:
          'Authenticated image uploads validate file type and size, save files to Vercel Blob, and persist Blob URLs and metadata. Image deletion removes the Blob and its row.',
        files: 'app/api/admin/products/ · store_product_assets',
      },
      {
        title: 'Complete order and customer workspaces',
        area: 'Admin / CRM',
        icon: Workflow,
        description:
          'Signed-in operators can review orders, change permitted order statuses, search customer records, and update marketing preference. Writes are audit logged without customer fields.',
        files: 'app/actions/admin.ts · components/admin/admin-workspace.tsx',
      },
      {
        title: 'Complete the Admin workspace',
        area: 'Admin / CRM',
        icon: Activity,
        description:
          'Products, orders, customers, analytics, recent activity, and loading, empty, and error states are wired to the shared database.',
        files: 'components/admin/admin-workspace.tsx · app/api/admin/',
      },
      {
        title: 'GitHub operator identity documented',
        area: 'GitHub',
        icon: GitBranch,
        description:
          'Project guidance requires agents to verify @qaiserfccc before GitHub mutations. No GitHub Actions workflows are currently tracked.',
        files: 'AGENTS.md · docs/NEXT_AGENT_HANDOFF.md',
      },
    ],
  },
]

export function ProjectKanban() {
  return (
    <section aria-labelledby="project-kanban-title" className="min-w-0 flex-1">
      <div className="mb-7">
        <h1 id="project-kanban-title" className="text-3xl font-medium tracking-[-.06em]">
          Project Kanban
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77756e]">
          A repository snapshot of implemented workflows and the decisions or environment setup still needed.
        </p>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.id}
            aria-labelledby={`kanban-${column.id}`}
            className="min-w-0 rounded-2xl bg-[#eeede8] p-3 sm:p-4"
          >
            <header className="mb-4 flex items-start justify-between gap-3 px-1">
              <div>
                <h2 id={`kanban-${column.id}`} className="text-sm font-semibold">
                  {column.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#77756e]">{column.description}</p>
              </div>
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${column.accent}`} aria-hidden="true" />
            </header>

            <div className="space-y-3">
              {column.tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1c1c1a]/12 bg-white/35 px-4 py-6 text-center text-xs leading-5 text-[#77756e]">
                  No active implementation tasks.
                </div>
              ) : (
                column.tasks.map((task) => {
                  const Icon = task.icon
                  return (
                    <article key={task.title} className="rounded-xl border border-[#1c1c1a]/8 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-medium leading-5">{task.title}</h3>
                        <Icon className="mt-0.5 size-4 shrink-0 text-[#77756e]" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#66645e]">{task.description}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#1c1c1a]/8 pt-3">
                        <span className="rounded-full bg-[#f2f1ed] px-2.5 py-1 text-[11px] font-medium text-[#5f5d57]">
                          {task.area}
                        </span>
                        <span className="max-w-full break-words text-[10px] leading-4 text-[#8c8a82]">
                          {task.files}
                        </span>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
