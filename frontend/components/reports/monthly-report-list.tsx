import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Link from "next/link"

type MonthlyReport = {
  id: number
  report_month: string
  avg_uptime_percent: number
  alerts_opened: number
}

interface MonthlyReportListProps {
  reports: MonthlyReport[]
}

export function MonthlyReportList({ reports }: MonthlyReportListProps) {
  const formattedReports = useMemo(
    () =>
      reports.map((report) => {
        const date = new Date(report.report_month)
        const monthLabel = Number.isNaN(date.valueOf())
          ? report.report_month
          : `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`
        return {
          ...report,
          monthLabel,
          uptimeLabel: `${report.avg_uptime_percent.toFixed(2)}%`,
          alertsLabel: `${report.alerts_opened} opened`,
        }
      }),
    [reports],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Monthly Reports</h2>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uptime</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alerts</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {formattedReports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3">{report.monthLabel}</td>
                <td className="px-4 py-3">{report.uptimeLabel}</td>
                <td className="px-4 py-3">{report.alertsLabel}</td>
                <td className="px-4 py-3">
                  <Button size="sm" asChild>
                    <Link href={`/reports/monthly/${report.id}/preview`}>
                      <Download className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {formattedReports.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                  No monthly reports found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
