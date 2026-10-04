import PageHeader from '@/components/PageHeader'

export default function Placeholder({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
        Halaman ini sedang disiapkan.
      </div>
    </>
  )
}
