'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { MetricPoint } from '@/lib/types'

const THRESHOLD = 1100

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e2130', border: '1px solid #252a38', padding: '6px 10px', fontSize: 11, borderRadius: 6 }}>
        <p style={{ color: '#6b7585', marginBottom: 2 }}>{label}</p>
        <p style={{ color: payload[0].value >= THRESHOLD ? '#f04f5e' : '#00c2a8', fontWeight: 600 }}>
          {payload[0].value.toLocaleString()} errors/2min
        </p>
      </div>
    )
  }
  return null
}

const annotations = [
  { time: '20:34', label: 'deploy', color: '#f59e0b' },
  { time: '20:36', label: 'spike',  color: '#f04f5e' },
]

export default function MetricsChart({ data }: { data: MetricPoint[] }) {
  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs mb-1">
        <span style={{ color: '#f59e0b' }}>▲ deploy</span>
        <span style={{ color: '#f04f5e' }}>— alert threshold</span>
        <span style={{ color: '#00c2a8' }}>— errors/2min (Loki)</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#252a38" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#4b5468', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#252a38' }}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fill: '#4b5468', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#252a38' }}
            tickLine={false}
            domain={[0, 4000]}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={THRESHOLD} stroke="rgba(240,79,94,0.4)" strokeDasharray="4 4" />
          {annotations.map((a) => (
            <ReferenceLine
              key={a.time}
              x={a.time}
              stroke={a.color}
              strokeOpacity={0.5}
              label={{ value: a.label, fill: a.color, fontSize: 9, fontFamily: 'monospace', position: 'top' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="errorRate"
            stroke="#00c2a8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#00c2a8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
