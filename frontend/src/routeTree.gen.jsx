import { createRootRoute, createRoute, Navigate } from '@tanstack/react-router'
import { RootLayout } from './routes/__root.jsx'
import { LoginPage } from './routes/login.jsx'
import { DashboardPage } from './routes/dashboard.jsx'
import { DataEntryPage } from './routes/data-entry/index.jsx'
import { LedgerPage } from './routes/ledger/index.jsx'
import { AnalyticsPage } from './routes/analytics.jsx'
import { ExportPage } from './routes/export.jsx'
import { DailyHandwrittenImportPage } from './routes/imports/daily-handwritten.jsx'
import { RecycleVoucherImportPage } from './routes/imports/recycle-voucher.jsx'
import { ExcelImportPage } from './routes/imports/excel.jsx'
import { UsersPage } from './routes/settings/users.jsx'
import { CategoriesPage } from './routes/settings/categories.jsx'

const rootRoute = createRootRoute({
  component: RootLayout,
})

function IndexRedirect() {
  return <Navigate to="/dashboard" replace />
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const dataEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data-entry',
  component: DataEntryPage,
})

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger',
  component: LedgerPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export',
  component: ExportPage,
})

const dailyHandwrittenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/imports/daily-handwritten',
  component: DailyHandwrittenImportPage,
})

const recycleVoucherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/imports/recycle-voucher',
  component: RecycleVoucherImportPage,
})

const excelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/imports/excel',
  component: ExcelImportPage,
})

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/users',
  component: UsersPage,
})

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/categories',
  component: CategoriesPage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  dataEntryRoute,
  ledgerRoute,
  analyticsRoute,
  exportRoute,
  dailyHandwrittenRoute,
  recycleVoucherRoute,
  excelRoute,
  usersRoute,
  categoriesRoute,
])
