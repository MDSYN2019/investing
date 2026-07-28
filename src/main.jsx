import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, ChevronDown,
  CircleHelp, CloudSun, Database, FileText, Gauge, LayoutDashboard, Menu,
  PlugZap, RefreshCw, Search, Settings, ShieldCheck, Sparkles, TrendingUp, X
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const pnl = [
  { day: 'Jul 01', value: 18 }, { day: 'Jul 03', value: 24 }, { day: 'Jul 05', value: 19 },
  { day: 'Jul 07', value: 32 }, { day: 'Jul 09', value: 35 }, { day: 'Jul 11', value: 41 },
  { day: 'Jul 13', value: 36 }, { day: 'Jul 15', value: 49 }, { day: 'Jul 17', value: 54 },
  { day: 'Jul 19', value: 48 }, { day: 'Jul 21', value: 61 }, { day: 'Jul 23', value: 67 },
  { day: 'Jul 25', value: 64 }, { day: 'Jul 27', value: 78 }, { day: 'Jul 28', value: 82 }
];

const nav = [
  [LayoutDashboard, 'Overview'], [TrendingUp, 'Positions'], [Activity, 'Performance'],
  [Gauge, 'Forecasts'], [Database, 'Data quality'], [FileText, 'Reports']
];

function App() {
  const [active, setActive] = useState('Overview');
  const [range, setRange] = useState('30 days');
  const [mobileNav, setMobileNav] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [alerts, setAlerts] = useState(3);
  const [summary, setSummary] = useState(null);
  const [apiState, setApiState] = useState('connecting');

  const loadDashboard = async () => {
    setRefreshed(true);
    try {
      const response = await fetch('/api/v1/dashboard');
      if (!response.ok) throw new Error('Dashboard request failed');
      const payload = await response.json();
      setSummary(payload);
      setAlerts(payload.unacknowledged_alerts);
      setApiState('live');
    } catch {
      setApiState('demo');
    } finally {
      setTimeout(() => setRefreshed(false), 500);
    }
  };
  useEffect(() => { loadDashboard(); }, []);

  const generateReport = async () => {
    const response = await fetch('/api/v1/reports/daily', { method: 'POST' });
    if (!response.ok) return;
    const report = await response.json();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'gridline-daily-report.json' });
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><span className="brand-mark"><PlugZap size={18}/></span><span>gridline</span></div>
      <button className="close-mobile" onClick={() => setMobileNav(false)}><X size={20}/></button>
      <div className="workspace"><span className="workspace-avatar">NV</span><span><b>Northvale Energy</b><small>Trading workspace</small></span><ChevronDown size={16}/></div>
      <nav>
        <p className="nav-label">Workspace</p>
        {nav.map(([Icon, label]) => <button key={label} onClick={() => {setActive(label); setMobileNav(false)}} className={active === label ? 'active' : ''}><Icon size={18}/><span>{label}</span>{label === 'Data quality' && <em>2</em>}</button>)}
        <p className="nav-label integrations-label">Manage</p>
        <button><PlugZap size={18}/><span>Integrations</span></button>
        <button><Settings size={18}/><span>Settings</span></button>
      </nav>
      <div className="system-card"><div><ShieldCheck size={18}/><b>All systems operational</b></div><p>Last pipeline run 07:42 UTC</p><span><i/>Live monitoring</span></div>
      <div className="profile"><span className="profile-avatar">AM</span><span><b>Alex Morgan</b><small>alex@northvale.energy</small></span><ChevronDown size={16}/></div>
    </aside>

    <main>
      <header>
        <button className="menu" onClick={() => setMobileNav(true)}><Menu size={21}/></button>
        <div className="search"><Search size={17}/><input aria-label="Search" placeholder="Search positions, markets, reports..."/><kbd>⌘ K</kbd></div>
        <div className="header-actions"><span className="weather"><CloudSun size={17}/> 16°C London</span><button aria-label="Help"><CircleHelp size={19}/></button><button className="notification" aria-label="Notifications" onClick={() => setAlerts(0)}><Bell size={19}/>{alerts > 0 && <i/>}</button></div>
      </header>

      <section className="content">
        <div className="page-heading"><div><p className="eyebrow">MONDAY, 28 JULY · <span className={`api-state ${apiState}`}>{apiState === 'live' ? 'LIVE API' : apiState === 'demo' ? 'DEMO DATA' : 'CONNECTING'}</span></p><h1>Good morning, Alex.</h1><p>Here’s how your portfolio is performing today.</p></div><div className="heading-actions"><button className="secondary" onClick={loadDashboard}><RefreshCw size={16} className={refreshed ? 'spin' : ''}/>{refreshed ? 'Syncing' : 'Refresh data'}</button><button className="primary" onClick={generateReport}><Sparkles size={16}/>Generate report</button></div></div>

        <div className="notice"><span><Sparkles size={17}/></span><p><b>Morning brief is ready.</b> Portfolio is within risk limits. GB Day-Ahead contributed 62% of today’s P&amp;L.</p><button>View brief <ArrowUpRight size={14}/></button></div>

        <div className="metrics">
          <Metric label="TODAY’S P&L" value={summary ? money(summary.today_pnl) : '+£12,480'} delta="8.4%" note="vs. yesterday" positive />
          <Metric label="MONTH-TO-DATE" value={summary ? money(summary.month_to_date_pnl) : '+£82,160'} delta="12.7%" note="vs. last month" positive />
          <Metric label="NET EXPOSURE" value={summary ? money(summary.net_exposure) : '£1.24m'} delta="£84k" note="since yesterday" warning />
          <Metric label="FORECAST ACCURACY" value={summary ? `${summary.forecast.accuracy_percent}%` : '94.2%'} delta="1.8%" note="observed periods" positive />
        </div>

        <div className="dashboard-grid">
          <article className="card performance">
            <div className="card-head"><div><h2>Portfolio performance</h2><p>Cumulative realised and unrealised P&amp;L</p></div><select value={range} onChange={e => setRange(e.target.value)}><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
            <div className="chart-summary"><strong>£82,160</strong><span><ArrowUpRight size={14}/>12.7%</span><small>for the last {range.toLowerCase()}</small></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={pnl} margin={{top: 8,right: 5,left: -15,bottom: 0}}><defs><linearGradient id="pnl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#52735d" stopOpacity={0.25}/><stop offset="100%" stopColor="#52735d" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7e8e3"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#8a8e86'}} interval={2}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#8a8e86'}} tickFormatter={v => `£${v}k`}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="value" stroke="#456a52" strokeWidth={2.5} fill="url(#pnl)" activeDot={{r:5,fill:'#456a52',stroke:'#fff',strokeWidth:3}}/></AreaChart></ResponsiveContainer></div>
          </article>

          <article className="card risk"><div className="card-head"><div><h2>Risk overview</h2><p>Current portfolio limits</p></div><button className="more">•••</button></div>
            <RiskRow label="Daily loss limit" value="£12.5k / £50k" pct={25} color="green"/>
            <RiskRow label="Gross exposure" value="£1.84m / £3m" pct={61} color="amber"/>
            <RiskRow label="Single market concentration" value="38% / 50%" pct={76} color="amber"/>
            <RiskRow label="Open positions" value="14 / 30" pct={47} color="green"/>
            <div className="risk-footer"><ShieldCheck size={17}/><span><b>Within all limits</b><small>Calculated 2 minutes ago</small></span></div>
          </article>

          <article className="card markets"><div className="card-head"><div><h2>Market contribution</h2><p>Today’s P&amp;L by market</p></div><button className="text-button">View all <ArrowUpRight size={14}/></button></div>
            <Market name="GB Day-Ahead" region="United Kingdom" value="+£7,740" percent="62.0%" width="62%"/>
            <Market name="GB Intraday" region="United Kingdom" value="+£3,120" percent="25.0%" width="25%"/>
            <Market name="EPEX Spot" region="France" value="+£1,240" percent="9.9%" width="10%"/>
            <Market name="Nord Pool" region="Nordics" value="+£380" percent="3.1%" width="3%"/>
          </article>

          <article className="card alerts"><div className="card-head"><div><h2>Needs attention</h2><p>Data and position alerts</p></div><span className="count">3</span></div>
            <Alert icon={AlertTriangle} tone="amber" title="Forecast deviation above threshold" detail="GB Day-Ahead · Period 18:00–19:00" time="12 min ago"/>
            <Alert icon={Database} tone="red" title="Missing settlement data" detail="EPEX Spot · 27 July" time="34 min ago"/>
            <Alert icon={Activity} tone="blue" title="Position nearing concentration limit" detail="GB Intraday · 46% of limit" time="1 hr ago"/>
            <button className="all-alerts">View all alerts</button>
          </article>
        </div>
      </section>
    </main>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}
  </div>;
}

function Metric({label,value,delta,note,positive,warning}) { return <article className="metric"><div className="metric-label"><span>{label}</span><CircleHelp size={14}/></div><strong>{value}</strong><p className={warning ? 'warn' : positive ? 'up' : ''}>{warning ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>}<b>{delta}</b><span>{note}</span></p></article> }
function RiskRow({label,value,pct,color}) { return <div className="risk-row"><div><span>{label}</span><b>{value}</b></div><div className="track"><i className={color} style={{width:`${pct}%`}}/></div></div> }
function Market({name,region,value,percent,width}) { return <div className="market-row"><div className="market-name"><span>{name.slice(0,2).toUpperCase()}</span><div><b>{name}</b><small>{region}</small></div></div><div className="market-bar"><i style={{width}}/></div><b className="market-value">{value}<small>{percent}</small></b></div> }
function Alert({icon:Icon,tone,title,detail,time}) { return <div className="alert-row"><span className={`alert-icon ${tone}`}><Icon size={17}/></span><div><b>{title}</b><p>{detail}</p></div><time>{time}</time></div> }
function ChartTooltip({active,payload,label}) { if (!active || !payload?.length) return null; return <div className="tooltip"><small>{label}</small><b>£{payload[0].value},000</b></div> }
function money(value) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0, signDisplay: value > 0 ? 'always' : 'auto' }).format(value); }

createRoot(document.getElementById('root')).render(<App/>);
