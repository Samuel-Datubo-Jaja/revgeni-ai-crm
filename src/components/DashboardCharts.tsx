"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Company {
  id: string;
  name: string;
  status: string;
  industry: string | null;
  score: number | null;
}

const COLORS = {
  'NEW': '#3B82F6',
  'QUALIFIED': '#10B981', 
  'CONTACTED': '#F59E0B',
  'MEETING': '#8B5CF6',
  'PROPOSAL': '#F97316',
  'WON': '#059669',
  'LOST': '#DC2626'
};

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DashboardCharts({ companies }: { companies: Company[] }) {
  const statusData = [
    { name: 'NEW', count: companies.filter(c => c.status === 'NEW').length, color: COLORS.NEW },
    { name: 'QUALIFIED', count: companies.filter(c => c.status === 'QUALIFIED').length, color: COLORS.QUALIFIED },
    { name: 'CONTACTED', count: companies.filter(c => c.status === 'CONTACTED').length, color: COLORS.CONTACTED },
    { name: 'MEETING', count: companies.filter(c => c.status === 'MEETING').length, color: COLORS.MEETING },
    { name: 'WON', count: companies.filter(c => c.status === 'WON').length, color: COLORS.WON },
  ].filter(item => item.count > 0); // Only show statuses that have data

  // Industry distribution data
  const industryCount = companies.reduce((acc, company) => {
    const industry = company.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const industryData = Object.entries(industryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 industries

  // Lead score distribution
  const scoreRanges = [
    { range: '0-20', count: companies.filter(c => (c.score || 0) >= 0 && (c.score || 0) <= 20).length },
    { range: '21-40', count: companies.filter(c => (c.score || 0) >= 21 && (c.score || 0) <= 40).length },
    { range: '41-60', count: companies.filter(c => (c.score || 0) >= 41 && (c.score || 0) <= 60).length },
    { range: '61-80', count: companies.filter(c => (c.score || 0) >= 61 && (c.score || 0) <= 80).length },
    { range: '81-100', count: companies.filter(c => (c.score || 0) >= 81 && (c.score || 0) <= 100).length },
  ].filter(item => item.count > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Pipeline Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Pipeline Status Chart */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📈 Pipeline Status
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry Distribution */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🏭 Industry Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={industryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string | number; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {industryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Score Distribution */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎯 Lead Score Ranges
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{companies.length}</div>
          <div className="text-sm text-blue-800">Total Companies</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {companies.filter(c => c.status === 'WON').length}
          </div>
          <div className="text-sm text-green-800">Won Deals</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {companies.filter(c => ['QUALIFIED', 'CONTACTED', 'MEETING'].includes(c.status)).length}
          </div>
          <div className="text-sm text-yellow-800">Active Pipeline</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(companies.reduce((sum, c) => sum + (c.score || 0), 0) / companies.length) || 0}
          </div>
          <div className="text-sm text-purple-800">Avg Lead Score</div>
        </div>
      </div>
    </div>
  );
}