/**
 * BusRoster
 * ------------------------------------------------------------------
 * Printable modal displaying a bus route roster:
 * - Route & staff metadata
 * - Time-sorted pickup/drop stops
 * - Optimized for print output
 */

import { useMemo } from 'react';
import { TransportRoute, TransportStop } from '../types';
import '../styles/components/BusRoster.css';

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */

const ROSTER_EFFECTIVE_DATE = '01 Jan 2025';
const CAMPUS_KEYWORD = 'CAMPUS';
const DEFAULT_CAMPUS_DROP_TIME = '1610 Hrs';

/* ------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------ */

interface BusRosterProps {
  route: TransportRoute;
  stops: TransportStop[];
  onClose: () => void;
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

const BusRoster = ({ route, stops, onClose }: BusRosterProps) => {
  /**
   * Stops sorted by pickup time (ascending)
   */
  const sortedStops = useMemo(
    () =>
      [...stops].sort((a, b) =>
        a.pickupTime.localeCompare(b.pickupTime)
      ),
    [stops]
  );

  return (
    <div className="roster-overlay">
      <div className="roster-modal">

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="roster-close-btn"
          aria-label="Close bus roster"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" stroke="currentColor" fill="none">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <header className="roster-header">
          <h1>K R MANGALAM UNIVERSITY</h1>
          <p>Sohna – Gurgaon Road, Sohna 122103</p>
          <p className="roster-date">
            BUS ROUTE ROSTER W.E.F – {ROSTER_EFFECTIVE_DATE}
          </p>
        </header>

        {/* Table */}
        <table className="roster-table" role="table">
          <tbody>

            {/* Route Info */}
            <tr className="roster-yellow">
              <td>BUS ROUTE NO.</td>
              <td className="roster-route-name">{route.routeName}</td>
              <td>DRIVER NAME :</td>
              <td className="roster-driver-name">{route.driverName}</td>
            </tr>

            <tr className="roster-yellow">
              <td>BUS REG. NO.</td>
              <td className="roster-reg-no">{route.busRegNo || 'N/A'}</td>
              <td>HELPER NAME :</td>
              <td className="roster-helper">{route.helperName || 'N/A'}</td>
            </tr>

            <tr className="roster-yellow">
              <td>BUS MOBILE NO.</td>
              <td className="roster-phone">#{route.driverPhone}</td>
              <td>STARTING TIME :</td>
              <td className="roster-time">{route.morningTime}</td>
            </tr>

            {/* Column Headers */}
            <tr className="roster-yellow">
              <th className="roster-col-header">SR. NO.</th>
              <th className="roster-col-header">BUS STOP</th>
              <th className="roster-col-header">PICK-UP TIME AM</th>
              <th className="roster-col-header">DROP TIME PM</th>
            </tr>

            {/* Stops */}
            {sortedStops.map((stop, index) => {
              const isCampus = stop.stopName
                .toUpperCase()
                .includes(CAMPUS_KEYWORD);

              return (
                <tr key={stop.id}>
                  <td className="roster-col-header">{index + 1}</td>
                  <td className="roster-stop-name">{stop.stopName}</td>
                  <td className="roster-pickup-time">{stop.pickupTime}</td>
                  <td className="roster-drop-time">
                    {isCampus
                      ? stop.dropTime || DEFAULT_CAMPUS_DROP_TIME
                      : ''}
                  </td>
                </tr>
              );
            })}

            {/* Footer */}
            <tr className="roster-yellow">
              <td colSpan={4} className="roster-footer">
                Please Be In Time
              </td>
            </tr>

          </tbody>
        </table>

        {/* Print */}
        <div className="roster-print-btn-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="roster-print-btn"
            aria-label="Print bus roster"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" fill="none">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default BusRoster;