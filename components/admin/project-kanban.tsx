import {
  Activity,
  CircleCheck,
  Database,
  FileUp,
  GitBranch,
  ScanEye,
  ShieldCheck,
} from 'lucide-react'

const columns = [
  {
    id: 'backlog',
    title: 'Needs review or an external decision',
    description: 'Do not publish or transact until these operator decisions are made',
    accent: 'bg-[#d9a78c]',
    tasks: [
      {
        title: 'Review published listings before relying on their details',
        area: 'Catalog',
        icon: ScanEye,
        description:
          'The operator published 495 imported listings with a configured stock of 5 each; this is not a physical-stock verification. 89 remain Uncategorized. 406 listings have source image links; review lens details, prices, image rights, and claims before relying on them.',
        files: 'Admin → Products · source records and media links',
      },
      {
        title: 'Configure distributed rate limits before production checkout',
        area: 'Operations',
        icon: Database,
        description:
          'The connected Neon database has the COD checkout schema. Public endpoint throttles are per-process only; configure a distributed edge-level rate limit before exposing checkout to production traffic.',
        files: 'Vercel project configuration · /api/orders · /api/storefront/session',
      },
      {
        title: 'Review repository collaborator access',
        area: 'GitHub',
        icon: GitBranch,
        description:
          'The repository documents the @qaiserfccc operator policy, but repository-wide exclusivity can only be enforced through GitHub collaborator and organization settings.',
        files: 'AGENTS.md · GitHub repository settings',
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
    title: 'Implemented',
    description: 'Wired to the shared catalog and checked in the repository',
    accent: 'bg-[#68765f]',
    tasks: [
      {
        title: 'ISK Lenses storefront identity',
        area: 'Storefront',
        icon: CircleCheck,
        description:
          'The storefront is an ISK Lenses contact-lens catalog with factual listing copy, responsive product browsing, search, categories, and a COD-only checkout for guests and account holders.',
        files: 'app/layout.tsx · components/storefront/storefront-panel.tsx',
      },
      {
        title: 'Guest and account cash-on-delivery checkout',
        area: 'Storefront / Orders',
        icon: CircleCheck,
        description:
          'Checkout reprices active catalog items, reserves inventory and creates an idempotent pending COD order in one database transaction. Shoppers receive a signed short-lived receipt; admins confirm delivery charges before shipping and mark payment received after delivery. Migration 0005 is applied to the connected Neon database; apply it to other targets before enabling checkout there.',
        files: 'app/checkout/ · app/api/orders/ · app/actions/checkout.ts · migration 0005',
      },
      {
        title: 'Database-backed catalog and product details',
        area: 'Database',
        icon: Database,
        description:
          'Public catalog reads expose published products, active options, and supported media. Product details show only recorded facts and do not expose import provenance.',
        files: 'app/actions/storefront.ts · app/api/products/ · app/products/',
      },
      {
        title: 'Lens option management',
        area: 'Admin',
        icon: Activity,
        description:
          'Authorized operators can create, edit, archive, and restore variants with SKU, color, prescription power, base curve, diameter, pack size, price, and stock. Parent price and stock are derived from active options.',
        files: 'components/admin/product-variant-manager.tsx · store_product_variants',
      },
      {
        title: 'Product image and video galleries',
        area: 'Storage',
        icon: FileUp,
        description:
          'Admin uploads validate image/video file contents and size, store bytes in the database media library, and persist metadata. Source catalog image URLs are not shown directly as storefront fallbacks.',
        files: 'app/api/admin/products/ · store_product_assets',
      },
      {
        title: 'Source catalog import',
        area: 'Catalog',
        icon: Database,
        description:
          'The authenticated importer stages every page from the public Store API and atomically replaces the catalog only after all records validate. It retains structured prices, categories, tags, availability, specifications, and image/video source links; descriptions and media files are not copied.',
        files: 'app/api/admin/products/import/ · source_payload · import staging',
      },
      {
        title: 'Database-backed admin workspace',
        area: 'Admin / CRM',
        icon: ShieldCheck,
        description:
          'Owner, admin, and staff accounts use scrypt hashes and revocable signed sessions. Protected product, order, customer, activity, analytics, and system-user workflows share the Neon database.',
        files: 'lib/auth/admin.ts · app/actions/admin.ts · app/api/admin/',
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
          A live project snapshot of shipped workflows and the operator decisions still needed.
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
                        <span className="rounded-full bg-[#f2f1ed] px-2.5 py-1 text-xs font-medium text-[#5f5d57]">
                          {task.area}
                        </span>
                        <span className="max-w-full break-words text-xs leading-4 text-[#8c8a82]">
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
