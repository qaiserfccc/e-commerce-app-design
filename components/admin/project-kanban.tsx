import { Activity, CircleCheck, Database, Eye, FileUp, GitBranch, ShieldCheck, Workflow } from 'lucide-react'

const columns = [
  {
    id: 'backlog',
    title: 'Backlog',
    description: 'Important work not yet implemented',
    accent: 'bg-[#d9a78c]',
    tasks: [
      {
        title: 'Protect admin operations',
        area: 'Security',
        icon: ShieldCheck,
        description:
          'Add server-verified authentication and authorization before exposing admin metrics, customer/order data, or write actions.',
        files: 'app/actions/admin.ts · app/api/admin/',
      },
      {
        title: 'Finish product media uploads',
        area: 'Storage',
        icon: FileUp,
        description:
          'Wire upload and deletion flows to Vercel Blob, then persist only Blob URLs and metadata in the shared database.',
        files: 'store_product_assets · BLOB_READ_WRITE_TOKEN',
      },
      {
        title: 'Complete order and customer workspaces',
        area: 'Admin / CRM',
        icon: Workflow,
        description:
          'Connect the existing order and customer data actions to admin screens after authorization is in place.',
        files: 'app/actions/admin.ts · app/page.tsx',
      },
      {
        title: 'Enforce GitHub actor exclusivity',
        area: 'GitHub',
        icon: GitBranch,
        description:
          'Agent guidance requires GitHub mutations to use @qaiserfccc. Repository-wide exclusivity still needs GitHub access controls because another collaborator currently has write access.',
        files: 'AGENTS.md · GitHub collaborator settings',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In progress',
    description: 'Partially present in the current app',
    accent: 'bg-[#b58b5b]',
    tasks: [
      {
        title: 'Complete the Admin workspace',
        area: 'Admin / CRM',
        icon: Activity,
        description:
          'Metrics are connected, but the Products, Orders, Customers, and Analytics navigation does not yet open complete workflows.',
        files: 'app/page.tsx · app/api/admin/metrics/route.ts',
      },
      {
        title: 'Confirm the product identity',
        area: 'Product',
        icon: Eye,
        description:
          'The supplied brief says Eye Contact Lenses; the current storefront is branded “morrow.” and uses home/lifestyle copy. Confirm the intended catalog before changing names, copy, or assets.',
        files: 'app/page.tsx · app/layout.tsx',
      },
    ],
  },
  {
    id: 'done',
    title: 'In place',
    description: 'Verified in the repository',
    accent: 'bg-[#68765f]',
    tasks: [
      {
        title: 'Shared Neon data foundation',
        area: 'Database',
        icon: Database,
        description:
          'Storefront and admin data access use the same Drizzle schema and Postgres connection; catalog reads flow through a Next.js API route.',
        files: 'lib/db/ · app/actions/ · app/api/products/route.ts',
      },
      {
        title: 'Storefront catalog refresh',
        area: 'Synchronization',
        icon: CircleCheck,
        description:
          'The storefront uses SWR to load products from the API and revalidates periodically for updates.',
        files: 'lib/hooks/use-storefront-data.ts',
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
          A repository-based snapshot of the commerce requirements and the work still needed to meet them.
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
              {column.tasks.map((task) => {
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
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
