import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Map as MapIcon, Loader2, Save, Users, Trash2, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';

const defaultCenter: [number, number] = [9.5, 76.5];

interface Ward {
  id: number;
  name: string;
  geom: any;
}

interface UserProfile {
  id: string;
  phone: string;
  role: string;
  wards_allocated: number[];
}

// Leaflet Control Component
function DrawControl({ setDrawnWkt, drawnWkt }: { setDrawnWkt: (wkt: string) => void, drawnWkt: string }) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;
    
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: 'topright',
      edit: {
        featureGroup: drawnItems,
        remove: true
      },
      draw: {
        polygon: {
          shapeOptions: {
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.4,
            weight: 2
          }
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      }
    });

    map.addControl(drawControl);

    const constructWkt = (layer: any) => {
      const latlngs = layer.getLatLngs()[0];
      const coords = latlngs.map((ll: any) => `${ll.lng} ${ll.lat}`);
      coords.push(`${latlngs[0].lng} ${latlngs[0].lat}`);
      return `POLYGON((${coords.join(', ')}))`;
    };

    const onDrawCreated = (e: any) => {
      if (e.layerType === 'polygon') {
         drawnItems.clearLayers();
         drawnItems.addLayer(e.layer);
         setDrawnWkt(constructWkt(e.layer));
      }
    };

    const onDrawEdited = (e: any) => {
       e.layers.eachLayer((layer: any) => {
          setDrawnWkt(constructWkt(layer));
       });
    };

    const onDrawDeleted = () => {
       setDrawnWkt('');
    }

    map.on(L.Draw.Event.CREATED, onDrawCreated);
    map.on(L.Draw.Event.EDITED, onDrawEdited);
    map.on(L.Draw.Event.DELETED, onDrawDeleted);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, onDrawCreated);
      map.off(L.Draw.Event.EDITED, onDrawEdited);
      map.off(L.Draw.Event.DELETED, onDrawDeleted);
      if (drawnItemsRef.current) {
          map.removeLayer(drawnItemsRef.current);
      }
    };
  }, [map, setDrawnWkt]);

  // Clear drawing on map if parent cleared WKT (e.g. after successful save)
  useEffect(() => {
     if (!drawnWkt && drawnItemsRef.current) {
         drawnItemsRef.current.clearLayers();
     }
  }, [drawnWkt]);

  return null;
}

export default function SuperAdmin() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [authError, setAuthError] = useState('');

  const [newWardName, setNewWardName] = useState('');
  const [drawnWkt, setDrawnWkt] = useState('');
  
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wardsRes, usersRes] = await Promise.all([
        axios.get(`${apiUrl}/wards`),
        axios.get(`${apiUrl}/admin/users`)
      ]);
      setWards(wardsRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch boundary and user data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Sync checkboxes when ward selection changes or users fetch completes
  useEffect(() => {
    if (selectedWard) {
      setSelectedAdminIds(
        users.filter(u => u.wards_allocated.includes(selectedWard.id) && u.role === 'admin').map(u => u.id)
      );
    } else {
      setSelectedAdminIds([]);
    }
  }, [selectedWard, users]);

  const handleCreateWard = async () => {
    if (!newWardName) {
      setError('Please provide a name for the new ward.');
      return;
    }
    if (!drawnWkt) {
      setError('Please draw a polygon boundary on the map first.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setActionLoading(true);
      await axios.post(`${apiUrl}/wards`, {
        name: newWardName,
        geom_wkt: drawnWkt
      });
      
      setSuccess(`Ward ${newWardName} created successfully!`);
      setNewWardName('');
      setDrawnWkt('');
      fetchData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(`Overlap Error: Your boundary intersects with existing wards: ${err.response.data.conflicts?.join(', ')}`);
      } else {
        setError(err.response?.data?.error || 'Failed to save new ward boundary.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedWard) return;
    
    try {
      setError('');
      setSuccess('');
      setActionLoading(true);
      await axios.post(`${apiUrl}/wards/${selectedWard.id}/admin`, {
        user_ids: selectedAdminIds
      });
      
      setSuccess(`Admins successfully synchronized with ${selectedWard.name}!`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign admin.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWard = async () => {
    if (!selectedWard) return;
    if (!window.confirm(`Are you absolutely sure you want to delete ${selectedWard.name}? This will unlink all associated current issues!`)) {
        return;
    }

    try {
      setError('');
      setSuccess('');
      setActionLoading(true);
      await axios.delete(`${apiUrl}/wards/${selectedWard.id}`);
      
      setSuccess(`Ward ${selectedWard.name} was deleted.`);
      setSelectedWard(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete ward.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderExistingWards = () => {
    return wards.map((ward) => {
      if (!ward.geom || ward.geom.type !== 'Polygon' || !ward.geom.coordinates || !ward.geom.coordinates[0]) return null;

      const paths = ward.geom.coordinates[0].map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
      
      const isSelected = selectedWard?.id === ward.id;

      return (
        <Polygon
          key={ward.id}
          positions={paths}
          eventHandlers={{
            click: () => {
              setSelectedWard(ward);
              setError('');
              setSuccess('');
            }
          }}
          pathOptions={{
            fillColor: isSelected ? '#F59E0B' : '#EF4444', 
            fillOpacity: isSelected ? 0.6 : 0.35,
            color: isSelected ? '#D97706' : '#B91C1C', 
            opacity: 0.8,
            weight: 2,
            interactive: true,
            className: 'cursor-pointer hover:fill-opacity-50'
          }}
        />
      );
    });
  };
  
  const getCenter = (): [number, number] => {
    if (wards.length > 0 && wards[0].geom && wards[0].geom.coordinates && wards[0].geom.coordinates[0] && wards[0].geom.coordinates[0][0]) {
      return [
        wards[0].geom.coordinates[0][0][1],
        wards[0].geom.coordinates[0][0][0]
      ];
    }
    return defaultCenter;
  }

  const currentAdmins = selectedWard 
    ? users.filter(u => u.wards_allocated.includes(selectedWard.id) && u.role === 'admin') 
    : [];

  const toggleAdmin = (userId: string) => {
    setSelectedAdminIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordAttempt === import.meta.env.VITE_SUPER_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect master operational password.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-slate-100 relative">
           <Link to="/" className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div className="text-center mb-6 mt-4">
             <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldCheck className="w-8 h-8 text-blue-600" />
             </div>
             <h1 className="text-2xl font-bold text-slate-900">System Core</h1>
             <p className="text-sm text-slate-500 mt-2">Enter credentials to govern boundaries.</p>
           </div>
           
           {authError && (
             <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
               {authError}
             </div>
           )}

           <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Master Key"
                  value={passwordAttempt}
                  onChange={(e) => setPasswordAttempt(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-widest font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Access Portal
              </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6">
      <div className="flex items-center gap-4 px-4">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MapIcon className="w-8 h-8 text-blue-600" />
            Super Admin: Boundaries
          </h1>
          <p className="text-slate-500">Draw, assign, and manage civic authorities.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mx-4">
        {error && (
           <div className="bg-red-50 text-red-700 p-4 border-b border-red-100 flex items-center justify-between">
            <span className="font-medium text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 focus:outline-none">&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 flex items-center justify-between">
            <span className="font-medium text-sm">{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-800 focus:outline-none">&times;</button>
          </div>
        )}

        <div className="p-6 md:flex flex-col md:flex-row gap-6 items-stretch">
          
          {/* LEFT PANEL */}
          <div className="md:w-1/3 flex flex-col space-y-6">
            
            {/* Create Mode vs Edit Mode Toggle Header */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
               <button 
                  onClick={() => setSelectedWard(null)} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!selectedWard ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Create Ward
               </button>
               <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors text-slate-400 cursor-default ${selectedWard ? 'bg-white shadow-sm text-amber-600' : ''}`}
               >
                 Edit Ward
               </button>
            </div>

            {/* ------------ CREATE WARD VIEW ------------ */}
            {!selectedWard && (
               <div className="flex-1 flex flex-col space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Ward Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                      placeholder="e.g. Downtown Sector 4"
                      value={newWardName}
                      onChange={(e) => setNewWardName(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100/50 text-sm text-slate-600 shadow-sm flex-1">
                    <p className="mb-3 font-semibold text-slate-800">Map Controls:</p>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-600">
                      <li>Select the drawing tool (Polygon icon) on the map.</li>
                      <li>Click map to lay perimeter points.</li>
                      <li>Click your first point to seal the boundary.</li>
                      <li>Click any existing <span className="text-red-500 font-semibold">Red Ward</span> to edit it instead!</li>
                    </ol>
                    <div className={`mt-4 pt-3 border-t border-blue-100 font-mono text-xs break-all ${drawnWkt ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                      {drawnWkt ? 'Geospatial vector built!' : 'Awaiting manual entry...'}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateWard}
                    disabled={actionLoading || loading}
                    className="w-full py-4 mt-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:bg-blue-300 disabled:shadow-none"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Boundary
                  </button>
               </div>
            )}

            {/* ------------ EDIT WARD VIEW ------------ */}
            {selectedWard && (
               <div className="flex-1 flex flex-col space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                     <div>
                       <h2 className="text-xl font-bold text-amber-900">{selectedWard.name}</h2>
                       <p className="text-xs font-medium text-amber-600 uppercase tracking-widest mt-1">Ward Selection</p>
                     </div>
                     <MapIcon className="text-amber-300 w-8 h-8"/>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                       <Users className="w-4 h-4" /> Authority Assignment
                     </h3>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                       <div className="flex items-center justify-between text-sm py-1">
                         <span className="text-slate-500">Current Admins:</span>
                         <div className="flex flex-wrap gap-2 justify-end">
                            {currentAdmins.length > 0 ? (
                               currentAdmins.map(admin => (
                                 <span key={`badge-${admin.id}`} className="font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-md">
                                   {admin.phone}
                                 </span>
                               ))
                            ) : (
                               <span className="text-slate-400 italic">None</span>
                            )}
                         </div>
                       </div>
                       
                       <div className="pt-2 border-t border-slate-200">
                         <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Select Users for Admin Privileges</label>
                         
                         <div className="space-y-2">
                           <div className="relative">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                             <input
                               type="text"
                               placeholder="Search by phone number..."
                               value={userSearch}
                               onChange={(e) => setUserSearch(e.target.value)}
                               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-shadow"
                             />
                           </div>
                           
                           <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-inner">
                             {users.filter(u => u.phone.includes(userSearch)).map(u => (
                               <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                 <input 
                                   type="checkbox" 
                                   checked={selectedAdminIds.includes(u.id)}
                                   onChange={() => toggleAdmin(u.id)}
                                   className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                                 />
                                 <div className="flex-1 min-w-0">
                                   <p className="text-sm font-medium text-slate-900 truncate">{u.phone}</p>
                                   {u.role === 'admin' && (
                                      <p className="text-xs text-amber-600 font-medium tracking-wide">Admin {u.wards_allocated.length > 0 ? `(Assigned Wards: ${u.wards_allocated.join(', ')})` : ''}</p>
                                   )}
                                 </div>
                               </label>
                             ))}
                             {users.filter(u => u.phone.includes(userSearch)).length === 0 && (
                                <div className="p-4 text-center text-sm text-slate-500">No users match that phone.</div>
                             )}
                           </div>
                         </div>

                         <button
                           onClick={handleAssignAdmin}
                           disabled={actionLoading}
                           className="w-full mt-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                         >
                           {actionLoading ? 'Saving...' : 'Save Privileges'}
                         </button>
                       </div>
                     </div>
                  </div>

                  <div className="mt-auto pt-4 border-t">
                     <button
                       onClick={handleDeleteWard}
                       disabled={actionLoading}
                       className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                     >
                       <Trash2 className="w-4 h-4" /> Delete Entire Ward
                     </button>
                  </div>
               </div>
            )}
          </div>

          {/* RIGHT PANEL - MAP */}
          <div className="md:w-2/3 h-[600px] bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative z-10 flex flex-col">
              {loading && wards.length === 0 ? (
                 <div className="absolute inset-0 z-20 bg-slate-100/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    Loading OpenStreetMap Data...
                 </div>
              ) : null}
              <MapContainer center={getCenter()} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <DrawControl setDrawnWkt={setDrawnWkt} drawnWkt={drawnWkt} />
                {renderExistingWards()}
              </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
