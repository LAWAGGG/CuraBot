import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatDay(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}

function ChartTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{formatDay(label)}</p>
      <p className="mt-0.5 text-muted-foreground">
        {valueLabel}: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  )
}

export default function AnalyticsCharts({ conversationsPerDay = [], ordersPerDay = [] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-semibold">Percakapan per hari</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={conversationsPerDay} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="conversationFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E8B57" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2E8B57" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#E8E8E8" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: '#4A4A4A' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#4A4A4A' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip valueLabel="Percakapan" />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2E8B57"
                strokeWidth={2.5}
                fill="url(#conversationFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-semibold">Pesanan per hari</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersPerDay} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E8E8E8" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDay}
                tick={{ fontSize: 11, fill: '#4A4A4A' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#4A4A4A' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip valueLabel="Pesanan" />} cursor={{ fill: 'rgba(46,139,87,0.06)' }} />
              <Bar dataKey="count" fill="#3FA876" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
