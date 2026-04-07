import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { TransportRoute, TransportStop } from '../types';
import { Search, Bus, MapPin, Phone, Clock, ChevronRight, AlertCircle, ArrowLeft, FileText, Download, Star, CheckCircle, Info } from 'lucide-react';
import { downloadCSV } from '../utils/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import BusRoster from '../components/BusRoster';
import { useTheme } from '../contexts/ThemeContext';
import { useRefresh } from '../contexts/RefreshContext';
import { Link } from 'react-router-dom';

const TransportPortal: React.FC = () => {
  const { theme } = useTheme();
  const { refreshKey } = useRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStop, setSelectedStop] = useState<TransportStop | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<TransportRoute[]>([]);
  const [selectedRosterRoute, setSelectedRosterRoute] = useState<TransportRoute | null>(null);

  useEffect(() => {
    fetchTransportData();
  }, [refreshKey]);

  const fetchTransportData = async () => {
    setLoading(true);
    try {
      const { data: stopsData, error: stopsError } = await supabase
        .from('transport_stops')
        .select('*');
      
      if (stopsError) throw stopsError;

      const { data: routesData, error: routesError } = await supabase
        .from('transport_routes')
        .select('*');

      if (routesError) throw routesError;

      setStops(stopsData.map(s => ({
        id: s.id,
        stopName: s.stop_name,
        routeId: s.route_id,
        pickupTime: s.pickup_time,
        dropTime: s.drop_time,
        location: s.location,
        routes: s.routes || []
      })));

      setRoutes(routesData.map(r => ({
        id: r.id,
        routeName: r.route_name,
        busNumber: r.bus_number,
        busRegNo: r.bus_reg_no || '',
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
        helperName: r.helper_name || '',
        morningTime: r.morning_time,
        eveningTime: r.evening_time,
        isActive: r.is_active,
        stops: r.stops || []
      })));
    } catch (err: any) {
      console.error('Error fetching transport data:', err);
      setError('Failed to load transport information. Please ensure the transport tables exist in your database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedStop(null);
    setAvailableRoutes([]);
  };

  const filteredStops = stops.filter(stop => 
    stop.stopName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectStop = (stop: TransportStop) => {
    setSelectedStop(stop);
    const stopRoutes = routes.filter(route => 
      (route.stops && route.stops.some(s => s.toLowerCase() === stop.stopName.toLowerCase())) ||
      (stop.routes && stop.routes.includes(route.id)) ||
      route.id === stop.routeId
    );
    setAvailableRoutes(stopRoutes);
    setSearchTerm(stop.stopName);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => downloadCSV(routes, 'transport_routes')}
                className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 shadow-sm'}`}
                title="Download Routes CSV"
              >
                <Download className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                  <Bus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight uppercase">Transport Portal</h1>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Route & Stop Finder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4 tracking-tight">Find Your Bus Stop</h2>
          <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Enter your stop name to see available routes and bus details.</p>
        </div>

        {/* Search Section */}
        <div className="relative mb-8">
          <div className={`relative group transition-all duration-300 ${theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-xl shadow-slate-200/50'} rounded-3xl border ${theme === 'dark' ? 'border-white/10 focus-within:border-orange-500/50' : 'border-slate-200 focus-within:border-orange-500'}`}>
            <Search className={`absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search for a stop (e.g., City Center, Station Road...)"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-16 pr-6 py-6 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder:text-slate-500"
            />
          </div>

          {/* Search Suggestions */}
          <AnimatePresence>
            {searchTerm && !selectedStop && filteredStops.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-full left-0 right-0 mt-2 z-40 rounded-2xl border overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
              >
                {filteredStops.map(stop => (
                  <button
                    key={stop.id}
                    onClick={() => selectStop(stop)}
                    className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${theme === 'dark' ? 'hover:bg-white/5 border-b border-white/5 last:border-none' : 'hover:bg-slate-50 border-b border-slate-100 last:border-none'}`}
                  >
                    <div className="flex items-center space-x-4">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      <span className="font-bold">{stop.stopName}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Loading Transport Data...</p>
          </div>
        ) : error ? (
          <div className={`p-8 rounded-3xl border flex items-start space-x-4 ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div>
              <h3 className="font-black uppercase tracking-tight mb-1">System Error</h3>
              <p className="text-sm font-medium opacity-90">{error}</p>
              <div className="mt-4 p-4 bg-black/20 rounded-xl font-mono text-xs overflow-x-auto">
                <p className="mb-2">Please run this SQL in your Supabase Editor:</p>
                <pre>{`CREATE TABLE transport_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_name TEXT NOT NULL,
  bus_number TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  stops TEXT[] DEFAULT '{}',
  start_time TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transport_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_name TEXT NOT NULL,
  location TEXT,
  routes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample Data
INSERT INTO transport_stops (stop_name, location) VALUES 
('City Center', 'Main Square'),
('Railway Station', 'Platform 1 Entrance'),
('University Gate', 'Main Campus Entrance');`}</pre>
              </div>
            </div>
          </div>
        ) : selectedStop ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={`p-8 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-orange-500/10 p-4 rounded-2xl">
                    <MapPin className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{selectedStop.stopName}</h3>
                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{selectedStop.location || 'No location details'}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                  {availableRoutes.length} Available Routes
                </div>
              </div>

              <div className="grid gap-6">
                {availableRoutes.length > 0 ? (
                  availableRoutes.map((route, index) => {
                    const isPrimary = route.id === selectedStop.routeId;
                    
                    return (
                      <motion.div 
                        key={route.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-6 rounded-3xl border-2 transition-all hover:scale-[1.01] relative overflow-hidden ${
                          isPrimary 
                            ? theme === 'dark' 
                              ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]' 
                              : 'bg-orange-50 border-orange-500 shadow-xl shadow-orange-500/10'
                            : theme === 'dark'
                              ? 'bg-white/5 border-white/10 hover:bg-white/10'
                              : 'bg-slate-50 border-slate-100 hover:bg-slate-100 shadow-sm'
                        }`}
                      >
                        {/* Status Badges */}
                        <div className="absolute top-0 right-0 flex items-center">
                          {route.isActive && (
                            <div className={`px-3 py-1.5 flex items-center space-x-1.5 ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'} text-[10px] font-black uppercase tracking-widest rounded-bl-xl`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                              <span>Active</span>
                            </div>
                          )}
                          {isPrimary && (
                            <div className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 flex items-center space-x-1.5 shadow-lg">
                              <Star className="h-3 w-3 fill-white" />
                              <span>Primary Route</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-6 mt-4 sm:mt-0">
                          <div className="flex items-center space-x-5">
                            <div className={`p-4 rounded-2xl transition-all ${
                              isPrimary 
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                                : theme === 'dark' ? 'bg-slate-800 text-orange-500' : 'bg-white text-orange-500 shadow-sm'
                            }`}>
                              <Bus className="h-7 w-7" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h4 className="font-black text-xl uppercase tracking-tight">{route.routeName}</h4>
                                {!isPrimary && (
                                  <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Servicing Stop</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-2">
                                <div className="flex items-center space-x-1.5">
                                  <Info className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                  <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Bus: {route.busNumber}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <Clock className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                  <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Morning: {route.morningTime}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <Clock className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                  <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Evening: {route.eveningTime}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Driver Contact</p>
                              <p className="font-black text-lg">{route.driverName}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <a 
                                href={`tel:${route.driverPhone}`}
                                className={`p-4 rounded-2xl transition-all ${
                                  isPrimary 
                                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20' 
                                    : theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Call Driver"
                              >
                                <Phone className="h-5 w-5" />
                              </a>
                              <button 
                                onClick={() => setSelectedRosterRoute(route)}
                                className={`p-4 rounded-2xl transition-all ${
                                  theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                                }`}
                                title="View Full Roster"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Route Path Visualization */}
                        {route.stops && route.stops.length > 0 && (
                          <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200/50'}`}>
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-slate-500" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Route Sequence</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Your Stop</span>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-hide">
                                {route.stops.map((stopName, idx) => {
                                  const isCurrentStop = stopName.toLowerCase() === selectedStop.stopName.toLowerCase();
                                  return (
                                    <React.Fragment key={idx}>
                                      <motion.div 
                                        whileHover={{ scale: 1.05 }}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 flex items-center space-x-2 ${
                                          isCurrentStop
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/40 ring-4 ring-orange-500/20 z-10' 
                                            : theme === 'dark' 
                                              ? 'bg-white/5 text-slate-400 border border-white/5' 
                                              : 'bg-white text-slate-600 border border-slate-200 shadow-sm'
                                        }`}
                                      >
                                        {isCurrentStop && <MapPin className="h-3 w-3" />}
                                        <span>{stopName}</span>
                                      </motion.div>
                                      {idx < route.stops.length - 1 && (
                                        <div className={`shrink-0 h-0.5 w-4 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                              <div className="absolute left-0 right-0 bottom-0 h-4 bg-gradient-to-t from-transparent to-transparent pointer-events-none"></div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="font-bold text-slate-500">No active routes found for this stop.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : searchTerm && filteredStops.length === 0 ? (
          <div className="text-center py-20">
            <div className={`inline-block p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
              <Search className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">No Stops Found</h3>
            <p className={`text-lg ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>We couldn't find any stops matching "{searchTerm}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-black uppercase tracking-tight">Recent Searches</h3>
              </div>
              <p className="text-sm text-slate-500 font-medium italic">Your recent searches will appear here.</p>
            </div>
            <div className={`p-8 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <Bus className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-black uppercase tracking-tight">Popular Stops</h3>
              </div>
              <div className="space-y-3">
                {stops.slice(0, 3).map(stop => (
                  <button
                    key={stop.id}
                    onClick={() => selectStop(stop)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span className="font-bold">{stop.stopName}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Roster Modal */}
      {selectedRosterRoute && (
        <BusRoster 
          route={selectedRosterRoute}
          stops={stops.filter(s => s.routeId === selectedRosterRoute.id)}
          onClose={() => setSelectedRosterRoute(null)}
        />
      )}

      {/* Footer */}
      <footer className={`py-12 border-t ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            &copy; 2026 Transport Management System &bull; All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TransportPortal;
