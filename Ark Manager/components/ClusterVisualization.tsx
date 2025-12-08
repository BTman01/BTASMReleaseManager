
import React, { useMemo } from 'react';
import { ServerProfile, ServerStatus } from '../types';
import { NetworkIcon, ServerIcon, AlertTriangleIcon, CheckCircleIcon, FolderIcon } from './icons';

interface ClusterVisualizationProps {
  profiles: ServerProfile[];
  onSelectProfile: (id: string) => void;
}

const ClusterVisualization: React.FC<ClusterVisualizationProps> = ({ profiles, onSelectProfile }) => {
  const clusters = useMemo(() => {
    const groups: Record<string, ServerProfile[]> = {};
    profiles.forEach(p => {
      if (p.config.bEnableClustering && p.config.clusterId) {
        if (!groups[p.config.clusterId]) groups[p.config.clusterId] = [];
        groups[p.config.clusterId].push(p);
      }
    });

    return Object.entries(groups).map(([id, servers]) => {
      const firstDir = servers[0]?.config.clusterDirOverride;
      // Normalizing path separators for comparison might be needed in a real app, 
      // but for now strict equality is a good baseline warning.
      const consistentDir = servers.every(s => s.config.clusterDirOverride === firstDir);
      
      return {
        clusterId: id,
        servers,
        consistentDir,
        sharedDir: firstDir
      };
    });
  }, [profiles]);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-6">
          <NetworkIcon className="w-6 h-6" />
          <h3>Server Clusters</h3>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {clusters.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <NetworkIcon className="w-20 h-20 opacity-20" />
              <div className="text-center">
                <h4 className="text-xl font-semibold text-gray-300 mb-2">No Connected Clusters</h4>
                <p className="max-w-md mx-auto">
                    Enable clustering and set a matching 
                    <span className="font-mono text-cyan-400 bg-gray-900 px-1 mx-1 rounded">Cluster ID</span> 
                    in the Server Configuration tab for multiple servers to see them connected here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {clusters.map((cluster) => (
                <div key={cluster.clusterId} className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Cluster Header */}
                  <div className="bg-gray-900/80 p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                            <NetworkIcon className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cluster ID</span>
                            <h4 className="text-lg font-bold text-white tracking-wide font-mono">{cluster.clusterId}</h4>
                        </div>
                    </div>
                    
                    {/* Directory Consistency Status */}
                    <div className={`flex items-center px-3 py-1.5 rounded-md border text-sm ${cluster.consistentDir ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                        {cluster.consistentDir ? (
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                        ) : (
                            <AlertTriangleIcon className="w-4 h-4 mr-2" />
                        )}
                        <div className="flex flex-col">
                            <span className="font-semibold">{cluster.consistentDir ? 'Configuration Match' : 'Configuration Mismatch'}</span>
                            <span className="text-xs opacity-80 flex items-center mt-0.5">
                                <FolderIcon className="w-3 h-3 mr-1" />
                                {cluster.consistentDir ? 'Shared Directory Synced' : 'Shared Directory Mismatch'}
                            </span>
                        </div>
                    </div>
                  </div>

                  {/* Server Grid */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cluster.servers.map(server => (
                        <button
                            key={server.id}
                            onClick={() => onSelectProfile(server.id)}
                            className="text-left group relative bg-gray-800 border border-gray-700 hover:border-cyan-500/50 hover:bg-gray-800/80 rounded-lg p-4 transition-all duration-200 shadow-sm hover:shadow-cyan-500/10"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${server.status === ServerStatus.Running ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`}></div>
                                <span className="text-xs text-gray-500 font-mono bg-black/30 px-1.5 py-0.5 rounded">{server.config.map}</span>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <ServerIcon className="w-10 h-10 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                                <div>
                                    <h5 className="font-semibold text-gray-200 group-hover:text-white truncate pr-2" title={server.profileName}>{server.profileName}</h5>
                                    <p className="text-xs text-gray-500 mt-1 truncate" title={server.config.sessionName}>{server.config.sessionName}</p>
                                </div>
                            </div>
                            
                            {!cluster.consistentDir && server.config.clusterDirOverride !== cluster.sharedDir && (
                                <div className="absolute top-2 right-2 text-red-500" title="This server has a different shared directory than others in the cluster.">
                                    <AlertTriangleIcon className="w-4 h-4" />
                                </div>
                            )}
                        </button>
                    ))}
                  </div>
                  
                  {/* Footer info for cluster */}
                  <div className="px-4 py-2 bg-gray-900/30 border-t border-gray-800 text-xs text-gray-500 flex items-center">
                    <FolderIcon className="w-3 h-3 mr-2" />
                    <span className="truncate font-mono opacity-70">Shared Path: {cluster.sharedDir || "Not Set"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClusterVisualization;
