import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#4da6ff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard').then(res => {
      setStats(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Welcome back, {user?.name}!</p>
          </div>
          <div style={styles.badge}>{user?.role?.toUpperCase()}</div>
        </div>

        {loading ? <p>Loading...</p> : stats && (
          <>
            {/* Overview Cards */}
            <div style={styles.cards}>
              {[
                { label: 'Total Complaints', value: stats.overview.total, color: '#4da6ff', icon: '📋' },
                { label: 'Pending', value: stats.overview.pending, color: '#f59e0b', icon: '⏳' },
                { label: 'In Progress', value: stats.overview.inProgress, color: '#8b5cf6', icon: '🔄' },
                { label: 'Resolved', value: stats.overview.resolved, color: '#22c55e', icon: '✅' },
              ].map(card => (
                <div key={card.label} style={{ ...styles.card, borderTop: `4px solid ${card.color}` }}>
                  <div style={styles.cardIcon}>{card.icon}</div>
                  <div style={{ ...styles.cardValue, color: card.color }}>{card.value}</div>
                  <div style={styles.cardLabel}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={styles.charts}>
              <div style={styles.chartBox}>
                <h3 style={styles.chartTitle}>Complaints by Category</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.byCategory}>
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4da6ff" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartBox}>
                <h3 style={styles.chartTitle}>Complaints by Urgency</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats.byUrgency} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label={({ _id, count }) => `${_id}: ${count}`}>
                      {stats.byUrgency.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Complaints */}
            <div style={styles.tableBox}>
              <h3 style={styles.chartTitle}>Recent Complaints</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Urgency</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Citizen</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentComplaints.map(c => (
                    <tr key={c._id} style={styles.tr}>
                      <td style={styles.td}>{c.title}</td>
                      <td style={styles.td}>{c.category}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge2, background: c.urgency === 'High' ? '#fee2e2' : c.urgency === 'Medium' ? '#fef3c7' : '#dcfce7', color: c.urgency === 'High' ? '#dc2626' : c.urgency === 'Medium' ? '#d97706' : '#16a34a' }}>
                          {c.urgency}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge2, background: c.status === 'Resolved' ? '#dcfce7' : c.status === 'Pending' ? '#fef3c7' : '#dbeafe', color: c.status === 'Resolved' ? '#16a34a' : c.status === 'Pending' ? '#d97706' : '#2563eb' }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={styles.td}>{c.citizen?.name}</td>
                      <td style={styles.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
  main: { marginLeft: '240px', flex: 1, padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e3a5f' },
  subtitle: { color: '#666', marginTop: '4px' },
  badge: { background: '#1e3a5f', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
  cardIcon: { fontSize: '32px', marginBottom: '12px' },
  cardValue: { fontSize: '36px', fontWeight: '700', marginBottom: '4px' },
  cardLabel: { color: '#666', fontSize: '14px' },
  charts: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' },
  chartBox: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  chartTitle: { fontSize: '16px', fontWeight: '600', color: '#1e3a5f', marginBottom: '16px' },
  tableBox: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#333' },
  badge2: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
};