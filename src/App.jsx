import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  LoaderCircle,
  LogOut,
  Plus,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatDate, formatMoney, toCents } from '@/lib/utils'

const monthFormatter = new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' })
const today = new Date().toISOString().slice(0, 10)
const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('finanzas_token') ?? '')
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('finanzas_user') ?? 'null'))

  if (!token) return <AuthScreen onAuthenticated={(session) => setSession(session, setToken, setUser)} />
  return <Dashboard token={token} user={user} onLogout={() => clearSession(setToken, setUser)} />
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isRegister = mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = isRegister ? form : { email: form.email, password: form.password }
      const response = await api(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body })
      onAuthenticated(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:grid sm:place-items-center">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-emerald-700 p-8 text-white sm:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/30" />
          <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full border-[28px] border-emerald-500/40" />
          <div className="relative flex h-full flex-col justify-between gap-16">
            <div className="flex items-center gap-3 text-lg font-bold">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-700"><Wallet size={22} /></span>
              Finanzas personales
            </div>
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Tu dinero, claro</p>
              <h1 className="max-w-sm text-4xl font-bold leading-tight">Decide mejor con cada movimiento.</h1>
              <p className="mt-5 max-w-sm text-emerald-50">Registra tus ingresos y egresos, visualiza tu balance y mantén tus finanzas en orden.</p>
            </div>
            <p className="text-sm text-emerald-100">Tus registros son privados y están asociados a tu cuenta.</p>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <p className="text-sm font-medium text-emerald-700">Bienvenido</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
          <p className="mt-2 text-sm text-slate-500">{isRegister ? 'Comienza a gestionar tus finanzas hoy.' : 'Ingresa para ver tu resumen financiero.'}</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {isRegister && <Field label="Nombre" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Tu nombre" required />}
            <Field label="Correo electrónico" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="tu@correo.com" required />
            <Field label="Contraseña" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="Mínimo 8 caracteres" required />
            {isRegister && <Field label="Confirmar contraseña" type="password" value={form.password_confirmation} onChange={(value) => setForm({ ...form, password_confirmation: value })} placeholder="Repite tu contraseña" required />}
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <Button className="w-full" size="lg" disabled={loading} type="submit">
              {loading && <LoaderCircle className="animate-spin" size={16} />}
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <button className="font-semibold text-emerald-700 hover:text-emerald-800" type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError('') }}>
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}

function Dashboard({ token, user, onLogout }) {
  const [period, setPeriod] = useState(today.slice(0, 7))
  const [ingresos, setIngresos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [categorias, setCategorias] = useState({ ingreso: [], egreso: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalType, setModalType] = useState('')

  const refresh = useCallback(async () => {
    const [year, month] = period.split('-')
    const query = `?anio=${year}&mes=${Number(month)}`
    setLoading(true)
    setError('')
    try {
      const [incomeResponse, expenseResponse, incomeCategories, expenseCategories] = await Promise.all([
        api(`/ingresos${query}`, { token }),
        api(`/egresos${query}`, { token }),
        api('/categorias?tipo=ingreso', { token }),
        api('/categorias?tipo=egreso', { token }),
      ])
      setIngresos(incomeResponse.data)
      setEgresos(expenseResponse.data)
      setCategorias({ ingreso: incomeCategories.data, egreso: expenseCategories.data })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [period, token])

  useEffect(() => { refresh() }, [refresh])

  const totalIngresos = useMemo(() => ingresos.reduce((total, item) => total + toCents(item.monto), 0), [ingresos])
  const totalEgresos = useMemo(() => egresos.reduce((total, item) => total + toCents(item.monto), 0), [egresos])
  const balance = totalIngresos - totalEgresos
  const chartData = useMemo(() => groupExpenses(egresos), [egresos])
  const transactions = useMemo(() => recentTransactions(ingresos, egresos), [ingresos, egresos])
  const periodLabel = monthFormatter.format(new Date(`${period}-01T00:00:00`))

  async function createTransaction(type, body) {
    await api(`/${type === 'ingreso' ? 'ingresos' : 'egresos'}`, { method: 'POST', token, body })
    setModalType('')
    await refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white"><Wallet size={21} /></span>
            <div><p className="font-bold text-slate-900">Finanzas personales</p><p className="text-xs text-slate-500">Tu control financiero</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:inline">Hola, {user?.name ?? 'usuario'}</span>
            <Button variant="ghost" size="icon" onClick={onLogout} title="Cerrar sesión"><LogOut size={18} /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Resumen mensual</p>
            <h1 className="mt-1 text-3xl font-bold capitalize tracking-tight text-slate-900">{periodLabel}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input aria-label="Periodo" className={inputClass} type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
            <Button variant="outline" onClick={() => setModalType('egreso')}><ArrowUpRight size={17} /> Agregar egreso</Button>
            <Button onClick={() => setModalType('ingreso')}><Plus size={17} /> Agregar ingreso</Button>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard icon={<ArrowDownLeft size={20} />} label="Ingresos" value={formatMoney(totalIngresos)} tone="emerald" detail={`${ingresos.length} movimiento${ingresos.length === 1 ? '' : 's'}`} />
          <MetricCard icon={<ArrowUpRight size={20} />} label="Egresos" value={formatMoney(totalEgresos)} tone="rose" detail={`${egresos.length} movimiento${egresos.length === 1 ? '' : 's'}`} />
          <MetricCard icon={<CircleDollarSign size={20} />} label="Balance" value={formatMoney(balance)} tone={balance >= 0 ? 'sky' : 'amber'} detail={balance >= 0 ? 'Vas por buen camino' : 'Revisa tus gastos'} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader><CardTitle>Gastos por categoría</CardTitle><CardDescription>Distribución de tus egresos del periodo.</CardDescription></CardHeader>
            <CardContent className="h-80 pt-6">
              {loading ? <LoadingState /> : chartData.length ? <ExpenseChart data={chartData} /> : <EmptyState icon={<ReceiptText size={28} />} text="Aún no registras egresos este mes." />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Balance del mes</CardTitle><CardDescription>El resultado entre ingresos y egresos.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-slate-950 p-6 text-white">
                <p className="text-sm text-slate-300">Disponible</p><p className="mt-2 text-3xl font-bold">{formatMoney(balance)}</p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${totalIngresos ? Math.min(100, Math.round((Math.max(balance, 0) * 100) / totalIngresos)) : 0}%` }} /></div>
                <p className="mt-3 text-xs text-slate-400">{totalIngresos ? `${Math.round((Math.max(balance, 0) * 100) / totalIngresos)}% de tus ingresos permanece disponible.` : 'Registra un ingreso para comenzar.'}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-emerald-700">Ingresos</p><p className="mt-1 font-semibold text-emerald-900">{formatMoney(totalIngresos)}</p></div>
                <div className="rounded-xl bg-rose-50 p-3"><p className="text-rose-700">Egresos</p><p className="mt-1 font-semibold text-rose-900">{formatMoney(totalEgresos)}</p></div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-6">
          <CardHeader><CardTitle>Movimientos recientes</CardTitle><CardDescription>Ingresos y egresos registrados en {periodLabel}.</CardDescription></CardHeader>
          <CardContent className="pt-5">
            {loading ? <LoadingState /> : transactions.length ? <TransactionList transactions={transactions} /> : <EmptyState icon={<Wallet size={28} />} text="No hay movimientos para este mes. Agrega el primero." />}
          </CardContent>
        </Card>
      </div>

      {modalType && <TransactionModal key={modalType} type={modalType} period={period} categories={categorias[modalType]} onClose={() => setModalType('')} onSave={createTransaction} />}
    </main>
  )
}

function TransactionModal({ type, period, categories, onClose, onSave }) {
  const [form, setForm] = useState({ categoria_id: '', subcategoria_id: '', fecha: `${period}-01`, monto: '', fuente: '', descripcion: '', notas: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isIncome = type === 'ingreso'
  const selectedCategory = categories.find((category) => String(category.id) === form.categoria_id)

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })) }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.categoria_id || !form.fecha || !form.monto || (!isIncome && !form.descripcion) || (isIncome && !form.fuente)) {
      setError('Completa los campos obligatorios.')
      return
    }
    setSaving(true)
    try {
      const body = { categoria_id: Number(form.categoria_id), fecha: form.fecha, monto: form.monto.replace(',', '.'), notas: form.notas || null }
      if (isIncome) body.fuente = form.fuente
      else {
        body.descripcion = form.descripcion
        if (form.subcategoria_id) body.subcategoria_id = Number(form.subcategoria_id)
      }
      await onSave(type, body)
    } catch (requestError) {
      setError(requestError.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`Agregar ${type}`}>
      <form className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Nuevo movimiento</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Agregar {isIncome ? 'ingreso' : 'egreso'}</h2></div><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Categoría</span><select className={inputClass} value={form.categoria_id} onChange={(event) => { update('categoria_id', event.target.value); update('subcategoria_id', '') }}><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Fecha</span><input className={inputClass} type="date" value={form.fecha} onChange={(event) => update('fecha', event.target.value)} /></label>
          {!isIncome && selectedCategory?.subcategorias?.length > 0 && <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Subcategoría</span><select className={inputClass} value={form.subcategoria_id} onChange={(event) => update('subcategoria_id', event.target.value)}><option value="">Sin subcategoría</option>{selectedCategory.subcategorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>}
          <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>{isIncome ? 'Fuente' : 'Descripción'}</span><input className={inputClass} value={isIncome ? form.fuente : form.descripcion} maxLength={150} placeholder={isIncome ? 'Ej. trabajo freelance' : 'Ej. compra de supermercado'} onChange={(event) => update(isIncome ? 'fuente' : 'descripcion', event.target.value)} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Monto</span><input className={inputClass} inputMode="decimal" pattern="^\\d+(\\.\\d{1,2})?$" value={form.monto} placeholder="0.00" onChange={(event) => update('monto', event.target.value)} /></label>
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700"><span>Notas <span className="font-normal text-slate-400">(opcional)</span></span><textarea className={`${inputClass} h-24 py-2`} value={form.notas} onChange={(event) => update('notas', event.target.value)} /></label>
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin" size={16} />}Guardar {isIncome ? 'ingreso' : 'egreso'}</Button></div>
      </form>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, required }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>{label}</span><input className={inputClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></label>
}

function MetricCard({ icon, label, value, detail, tone }) {
  const tones = { emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', sky: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700' }
  return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span></CardContent></Card>
}

function ExpenseChart({ data }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 0, left: -20, bottom: 4 }}><CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatMoney} width={72} /><Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value) => [formatMoney(value), 'Egresos']} /><Bar dataKey="amount" fill="#f43f5e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
}

function TransactionList({ transactions }) {
  return <div className="divide-y divide-slate-100">{transactions.map((item) => <div className="flex items-center justify-between gap-4 py-4 first:pt-0" key={`${item.type}-${item.id}`}><div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{item.type === 'ingreso' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</span><div className="min-w-0"><p className="truncate font-medium text-slate-800">{item.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.category} · {formatDate(item.fecha)}</p></div></div><p className={`shrink-0 font-semibold ${item.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.type === 'ingreso' ? '+' : '-'}{formatMoney(item.cents)}</p></div>)}</div>
}

function LoadingState() { return <div className="grid h-full place-items-center text-sm text-slate-500"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} /> Cargando datos...</span></div> }
function EmptyState({ icon, text }) { return <div className="grid h-full place-items-center text-center text-slate-500"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon}</span><p className="mt-3 text-sm">{text}</p></div></div> }

function groupExpenses(items) {
  const grouped = items.reduce((map, item) => {
    const name = item.categoria?.nombre ?? 'Sin categoría'
    map.set(name, (map.get(name) ?? 0) + toCents(item.monto))
    return map
  }, new Map())
  return Array.from(grouped, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6)
}

function recentTransactions(incomes, expenses) {
  return [
    ...incomes.map((item) => ({ ...item, type: 'ingreso', title: item.fuente, category: item.categoria?.nombre ?? 'Ingreso', cents: toCents(item.monto) })),
    ...expenses.map((item) => ({ ...item, type: 'egreso', title: item.descripcion, category: item.categoria?.nombre ?? 'Egreso', cents: toCents(item.monto) })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8)
}

function setSession(session, setToken, setUser) {
  localStorage.setItem('finanzas_token', session.token)
  localStorage.setItem('finanzas_user', JSON.stringify(session.user))
  setToken(session.token)
  setUser(session.user)
}

function clearSession(setToken, setUser) {
  localStorage.removeItem('finanzas_token')
  localStorage.removeItem('finanzas_user')
  setToken('')
  setUser(null)
}

export default App
