import React from 'react';
import { TransportRoute, TransportStop } from '../types';

interface BusRosterProps {
  route: TransportRoute;
  stops: TransportStop[];
  onClose: () => void;
}

const BusRoster: React.FC<BusRosterProps> = ({ route, stops, onClose }) => {
  // Sort stops by pickup time or some sequence if available
  const sortedStops = [...stops].sort((a, b) => {
    // Simple sort by pickup time string for now
    return a.pickupTime.localeCompare(b.pickupTime);
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full p-8 relative print:p-0 print:shadow-none print:rounded-none">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors print:hidden"
        >
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold underline uppercase tracking-tight">K R MANGALAM UNIVERSITY</h1>
          <p className="text-xl font-bold underline uppercase mt-1">Sohna - Gurgaon Road , Sohna 122103</p>
          <p className="text-base font-bold underline uppercase mt-4">BUS ROUTE ROSTER W.E.F- 01 Jan 2025</p>
        </div>

        <table className="w-full border-collapse border-[3px] border-black text-sm font-bold">
          <tbody>
            <tr className="bg-[#FFFF00]">
              <td className="border-2 border-black p-2 uppercase w-[20%]">BUS ROUTE NO.</td>
              <td className="border-2 border-black p-2 text-center text-red-600 text-xl w-[30%] font-black">{route.routeName}</td>
              <td className="border-2 border-black p-2 uppercase w-[25%]">DRIVER NAME :</td>
              <td className="border-2 border-black p-2 text-center w-[25%] text-lg">{route.driverName}</td>
            </tr>
            <tr className="bg-[#FFFF00]">
              <td className="border-2 border-black p-2 uppercase">BUS REG. NO.</td>
              <td className="border-2 border-black p-2 text-center text-lg">{route.busRegNo || 'N/A'}</td>
              <td className="border-2 border-black p-2 uppercase">HELPER NAME :</td>
              <td className="border-2 border-black p-2 text-center text-lg">{route.helperName || 'N/A'}</td>
            </tr>
            <tr className="bg-[#FFFF00]">
              <td className="border-2 border-black p-2 uppercase">BUS MOBILE NO.</td>
              <td className="border-2 border-black p-2 text-center text-lg">#{route.driverPhone}</td>
              <td className="border-2 border-black p-2 uppercase">STARTING TIME :</td>
              <td className="border-2 border-black p-2 text-center text-lg">{route.morningTime}</td>
            </tr>
            <tr className="bg-[#FFFF00]">
              <td className="border-2 border-black p-2 text-center w-16">SR. NO.</td>
              <td className="border-2 border-black p-2 text-center">BUS STOP</td>
              <td className="border-2 border-black p-2 text-center">PICK-UP TIME AM</td>
              <td className="border-2 border-black p-2 text-center">DROP TIME PM</td>
            </tr>
            {sortedStops.map((stop, index) => (
              <tr key={stop.id} className="hover:bg-gray-50 transition-colors">
                <td className="border-2 border-black p-2 text-center text-lg">{index + 1}</td>
                <td className="border-2 border-black p-3 italic font-serif text-lg font-black">{stop.stopName}</td>
                <td className="border-2 border-black p-2 text-center text-2xl italic font-serif font-black">{stop.pickupTime}</td>
                <td className="border-2 border-black p-2 text-center text-red-600 text-lg font-black">
                  {stop.stopName.toUpperCase().includes('CAMPUS') ? (stop.dropTime || '1610Hrs') : ''}
                </td>
              </tr>
            ))}
            <tr className="bg-[#FFFF00]">
              <td colSpan={4} className="border-2 border-black p-3 text-center text-3xl font-black">
                Please Be In Time
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Roster</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusRoster;
