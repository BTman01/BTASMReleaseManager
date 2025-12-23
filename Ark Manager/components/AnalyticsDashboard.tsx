import React, { useState, useEffect, useRef } from 'react';
import { AnalyticsDataPoint } from '../types';
import { getAnalyticsData, clearAnalyticsData } from '../services/directoryService';
import { ChartBarIcon, ServerIcon, UsersIcon, TrashIcon } from './icons';
import { confirm } from '@tauri-apps/plugin-dialog';

interface AnalyticsDashboardProps {
  profileId: string;
  profileName: string;
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
};

const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTimeFull = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ profileId, profileName }) => {
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [loading, setLoading] = useState(false);
  
  // Tooltip State
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const loadData = async () => {
    setLoading(true);
    let durationMs = 60 * 60 * 1000; // 1h
    if (timeRange === '6h') durationMs *= 6;
    if (timeRange === '24h') durationMs *= 24;

    const startTime = Date.now() - durationMs;
    try {
        const results = await getAnalyticsData(profileId, startTime);
        setData(results);
    } catch (error) {
        console.error("Failed to load analytics data:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [profileId, timeRange]);

  const handleClearHistory = async () => {
      const confirmed = await confirm(
          `Are you sure you want to clear all analytics history for "${profileName}"? This action cannot be undone.`,
          { title: 'Clear History', kind: 'warning' }
      );

      if (confirmed) {
          try {
              await clearAnalyticsData(profileId);
              setData([]); // Clear local state immediately
          } catch (error) {
              console.error("Failed to clear analytics:", error);
          }
      }
  };

  // Chart Rendering Logic
  const renderChart = (type: 'memory' | 'players') => {
      if (loading) return <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>;
      if (data.length < 2) return <div className="h-64 flex items-center justify-center text-gray-500">Not enough data to display chart.</div>;

      const width = 1000;
      const height = 300;
      const padding = 40; // Increased padding for labels

      const timestamps = data.map(d => d.timestamp);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const timeRangeDuration = maxTime - minTime;
      
      const values = data.map(d => type === 'memory' ? d.memoryUsage : d.playerCount);
      const minValue = 0; // Always start at 0 for context
      const maxValue = Math.max(...values) * 1.1; // Add 10% headroom
      const valueRange = maxValue - minValue;

      // Coordinate Calculation Helper
      const getX = (ts: number) => {
          const xRatio = timeRangeDuration === 0 ? 0 : (ts - minTime) / timeRangeDuration;
          return xRatio * (width - 2 * padding) + padding;
      };

      const getY = (val: number) => {
          const yRatio = valueRange === 0 ? 0 : (val - minValue) / valueRange;
          return height - padding - yRatio * (height - 2 * padding);
      };

      const points = data.map(d => {
          const val = type === 'memory' ? d.memoryUsage : d.playerCount;
          return `${getX(d.timestamp)},${getY(val)}`;
      }).join(' ');

      // Area path for fill (only for memory)
      const firstX = getX(timestamps[0]);
      const lastX = getX(timestamps[timestamps.length - 1]);
      const bottomY = height - padding;
      const areaPath = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

      const currentVal = values[values.length - 1];
      const maxVal = Math.max(...values);

      // Tooltip Data Calculation
      const hoveredData = hoverIndex !== null ? data[hoverIndex] : null;
      const hoveredX = hoveredData ? getX(hoveredData.timestamp) : 0;
      const hoveredY = hoveredData ? getY(type === 'memory' ? hoveredData.memoryUsage : hoveredData.playerCount) : 0;

      const handleMouseMove = (e: React.MouseEvent) => {
          const rect = chartRefs.current[type]?.getBoundingClientRect();
          if (!rect) return;
          
          const mouseX = e.clientX - rect.left;
          const chartWidth = rect.width;
          
          // Map mouse X back to data index
          // SVG coordinate X relative to chart width
          const svgX = (mouseX / chartWidth) * width;
          
          // Reverse engineer timestamp from X
          // x = ratio * (w - 2p) + p  => ratio = (x - p) / (w - 2p)
          const ratio = (svgX - padding) / (width - 2 * padding);
          const estimatedTs = minTime + ratio * timeRangeDuration;

          // Find closest data point
          let closestIndex = 0;
          let minDiff = Infinity;

          data.forEach((d, i) => {
              const diff = Math.abs(d.timestamp - estimatedTs);
              if (diff < minDiff) {
                  minDiff = diff;
                  closestIndex = i;
              }
          });

          setHoverIndex(closestIndex);
      };

      return (
          <div 
            className="relative w-full h-64 bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden group cursor-crosshair"
            ref={el => chartRefs.current[type] = el}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                      <linearGradient id={`gradient-${type}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={type === 'memory' ? '#06b6d4' : '#22c55e'} stopOpacity="0.4"/>
                          <stop offset="100%" stopColor={type === 'memory' ? '#06b6d4' : '#22c55e'} stopOpacity="0"/>
                      </linearGradient>
                  </defs>

                  {/* Grid Lines & Y-Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                      const y = height - padding - (ratio * (height - 2 * padding));
                      const labelVal = minValue + ratio * valueRange;
                      return (
                          <g key={ratio}>
                              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#374151" strokeDasharray="4" strokeWidth="1" />
                              <text x={padding - 5} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                                  {type === 'memory' ? formatBytes(labelVal) : Math.round(labelVal)}
                              </text>
                          </g>
                      );
                  })}

                  {/* X-Axis Labels */}
                  <text x={padding} y={height - 15} textAnchor="start" fill="#6b7280" fontSize="10" fontFamily="monospace">{formatTime(minTime)}</text>
                  <text x={width - padding} y={height - 15} textAnchor="end" fill="#6b7280" fontSize="10" fontFamily="monospace">{formatTime(maxTime)}</text>

                  {/* Chart Paths */}
                  <polygon points={areaPath} fill={`url(#gradient-${type})`} />
                  <polyline 
                    points={points} 
                    fill="none" 
                    className={type === 'memory' ? 'stroke-cyan-400' : 'stroke-green-400'} 
                    strokeWidth="2" 
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                  />

                  {/* Hover Interactivity */}
                  {hoveredData && (
                      <g>
                          {/* Vertical Line */}
                          <line 
                            x1={hoveredX} y1={padding} 
                            x2={hoveredX} y2={height - padding} 
                            stroke="#e5e7eb" 
                            strokeWidth="1" 
                            strokeDasharray="4"
                            className="opacity-50"
                          />
                          {/* Data Point Circle */}
                          <circle cx={hoveredX} cy={hoveredY} r="4" fill="#fff" stroke={type === 'memory' ? '#06b6d4' : '#22c55e'} strokeWidth="2" />
                      </g>
                  )}
              </svg>
              
              {/* Floating Tooltip HTML Overlay */}
              {hoveredData && (
                  <div 
                    className="absolute bg-gray-900/95 border border-gray-600 p-2 rounded shadow-xl text-xs z-10 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 transition-all duration-75"
                    style={{ 
                        left: `${(getX(hoveredData.timestamp) / width) * 100}%`, 
                        top: `${(hoveredY / height) * 100}%` 
                    }}
                  >
                      <div className="font-bold text-white mb-1">{formatTimeFull(hoveredData.timestamp)}</div>
                      <div className="text-gray-300">
                          {type === 'memory' ? (
                              <>Memory: <span className="text-cyan-400 font-mono">{formatBytes(hoveredData.memoryUsage)}</span></>
                          ) : (
                              <>Players: <span className="text-green-400 font-mono">{hoveredData.playerCount}</span></>
                          )}
                      </div>
                  </div>
              )}
              
              {/* Static Overlay stats (Hidden if hovering to reduce clutter) */}
              {!hoveredData && (
                  <div className="absolute top-2 right-4 text-xs text-gray-300 bg-gray-900/80 border border-gray-700 px-3 py-1.5 rounded shadow-lg flex space-x-4 pointer-events-none">
                      <div>
                          <span className="text-gray-500 mr-1">Current:</span>
                          <span className="font-mono font-bold text-white">
                              {type === 'memory' ? formatBytes(currentVal) : currentVal}
                          </span>
                      </div>
                      <div>
                          <span className="text-gray-500 mr-1">Max:</span>
                          <span className="font-mono font-bold text-white">
                              {type === 'memory' ? formatBytes(maxVal) : maxVal}
                          </span>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-6 animate-fade-in">
        <div className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center space-x-3">
                <ChartBarIcon className="w-6 h-6 text-cyan-400" />
                <div>
                    <h3 className="text-lg font-bold text-white">Analytics Dashboard</h3>
                    <p className="text-xs text-gray-400">Performance metrics for {profileName}</p>
                </div>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="flex bg-gray-900 rounded-md p-1 border border-gray-700">
                    {(['1h', '6h', '24h'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === range ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            {range.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleClearHistory}
                    disabled={loading || data.length === 0}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear History"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-y-auto custom-scrollbar pb-6">
            {/* Memory Chart */}
            <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-center mb-4">
                    <ServerIcon className="w-5 h-5 text-cyan-400 mr-2" />
                    <h4 className="font-semibold text-gray-200">Memory Usage Trend</h4>
                </div>
                {renderChart('memory')}
                <p className="text-xs text-gray-500 mt-2 text-center">RAM usage over the last {timeRange}. Look for upward trends indicating leaks.</p>
            </div>

            {/* Player Chart */}
            <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-center mb-4">
                    <UsersIcon className="w-5 h-5 text-green-400 mr-2" />
                    <h4 className="font-semibold text-gray-200">Player Population</h4>
                </div>
                {renderChart('players')}
                <p className="text-xs text-gray-500 mt-2 text-center">Concurrent players over the last {timeRange}.</p>
            </div>
        </div>
    </div>
  );
};

export default AnalyticsDashboard;