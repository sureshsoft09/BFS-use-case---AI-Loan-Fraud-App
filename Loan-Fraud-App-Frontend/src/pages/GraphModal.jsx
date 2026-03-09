import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './GraphModal.css';
import CrossIcon from '../assets/agentIcons/cross.png';

const DETAILS = {
  Approved: [
    { percent: '65%', desc: 'User behavior matches standard human patterns.' },
    { percent: '20%', desc: 'Approved based on verified identity, documents & credit score.' },
    { percent: '15%', desc: 'All critical data points matches across sources.' },
  ],
  Rejected: [
    { percent: '45%', desc: `User behavior doesn't matches with standard human patterns.` },
    { percent: '35%', desc: 'Rejected based on verified identity, documents, and credit score.' },
    { percent: '20%', desc: 'Rejected due to failure in critical validation steps.' },
  ],
};

const COLORS = {
  Approved: {
    stroke: '#00C951', // green
    fill: 'url(#colorApproved)',
    dot: '#1DB954',
    gradient: (
      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#1DB954" stopOpacity={0.2}/>
        <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
      </linearGradient>
    ),
  },
  Rejected: {
    stroke: '#B81F2D', // red
    fill: 'url(#colorRejected)',
    dot: '#B81F2D',
    gradient: (
      <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#E53935" stopOpacity={0.2}/>
        <stop offset="95%" stopColor="#E53935" stopOpacity={0}/>
      </linearGradient>
    ),
  },
};

const TITLES = {
  Approved: 'Approved Applications Overview',
  Rejected: 'Rejected Applications Overview',
};

const GraphModal = ({ isOpen, onClose, data, status }) => {
  if (!isOpen) return null;
  const isApproved = status === 'Approved';
  const isRejected = status === 'Rejected';
  const colorSet = isApproved ? COLORS.Approved : isRejected ? COLORS.Rejected : COLORS.Approved;
  const details = isApproved ? DETAILS.Approved : isRejected ? DETAILS.Rejected : [];
  const title = TITLES[status] || 'Applications Overview';

  const formatDate = (tickItem) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Sort data by weekday (Mon-Sun) for X axis
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const getDayShort = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };
  const sortedData = Array.isArray(data)
    ? [...data].sort((a, b) =>
        weekdayOrder.indexOf(getDayShort(a.date)) - weekdayOrder.indexOf(getDayShort(b.date))
      )
    : data;

  // Custom ring dot for tooltip
  const RingDot = (props) => {
    const { cx, cy, stroke } = props;
    return (
      <circle cx={cx} cy={cy} r={7} stroke={stroke} strokeWidth={3} fill="white" />
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content graph-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-card">
          <h3>{title}</h3>
          <button className="stream-close-x" onClick={onClose}>
            <img src={CrossIcon} alt="x" />
          </button>
        </div>
        <div className="graph-body">
          <div className="graph-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {colorSet.gradient}
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#E0E0E0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate} 
                  tick={{fill: '#9E9E9E', fontSize: 12}}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{fill: '#000048', fontSize: 15, fontFamily: 'Gellix'}} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ stroke: colorSet.stroke, strokeWidth: 1, strokeDasharray: '5 5' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="custom-tooltip">
                          <p className="tooltip-value" style={{color: colorSet.stroke}}>{`${payload[0].value} Applications`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="natural"
                  dataKey="applicants" 
                  stroke={colorSet.stroke}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill={colorSet.fill}
                  activeDot={<RingDot stroke={colorSet.stroke} />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Details below the graph */}
          {(isApproved || isRejected) && (
            <div className="graph-details-row">
              {details.map((d, i) => (
                <div className="graph-detail-col" key={i}>
                  <div className="graph-detail-percent" style={{color: colorSet.stroke}}>{d.percent}</div>
                  <div className="graph-detail-desc">{d.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
