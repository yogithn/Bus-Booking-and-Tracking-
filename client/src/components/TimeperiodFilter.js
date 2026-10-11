import React, { useState, useEffect } from 'react';
import './TimeperiodFilter.css';

/**
 * TimeperiodFilter Component
 * Displays available time periods for bus routes with seat availability
 * and allows users to filter buses by time period
 */
function TimeperiodFilter({ from, to, date, onPeriodSelect }) {
  const [timePeriods, setTimePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch time periods when from, to, or date changes
  useEffect(() => {
    if (from && to && date) {
      fetchTimePeriods();
    }
  }, [from, to, date]);

  const fetchTimePeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/buses/schedule/time-periods?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch time periods');
      }

      const data = await response.json();
      setTimePeriods(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching time periods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period.period);
    if (onPeriodSelect) {
      onPeriodSelect(period.period);
    }
  };

  const getOccupancyColor = (occupancyRate) => {
    const rate = parseFloat(occupancyRate);
    if (rate > 0.8) return 'occupancy-high';
    if (rate > 0.5) return 'occupancy-medium';
    return 'occupancy-low';
  };

  const getAvailabilityStatus = (availableSeats, totalSeats) => {
    if (availableSeats === 0) return 'Full';
    if (availableSeats < totalSeats * 0.2) return 'Limited';
    return 'Available';
  };

  if (loading) {
    return <div className="time-period-filter loading">Loading time periods...</div>;
  }

  if (error) {
    return <div className="time-period-filter error">Error: {error}</div>;
  }

  return (
    <div className="time-period-filter">
      <h3 className="filter-title">Select Travel Time</h3>
      
      <div className="time-periods-grid">
        {timePeriods.map((period) => (
          <div
            key={period.period}
            className={`period-card ${selectedPeriod === period.period ? 'active' : ''} ${
              period.availableBuses === 0 ? 'unavailable' : ''
            }`}
            onClick={() => handlePeriodSelect(period)}
          >
            <div className="period-header">
              <div className="period-icon">
                {getPeriodIcon(period.period)}
              </div>
              <h4 className="period-name">{period.name}</h4>
            </div>

            <div className="period-time">
              {period.startHour}:00 - {period.endHour}:00
            </div>

            <div className="period-stats">
              <div className="stat">
                <span className="stat-label">Buses:</span>
                <span className="stat-value">{period.availableBuses}</span>
              </div>

              <div className="stat">
                <span className="stat-label">Available Seats:</span>
                <span className="stat-value">
                  {period.availableSeats}/{period.totalSeats}
                </span>
              </div>

              <div className={`stat occupancy ${getOccupancyColor(period.occupancyRate)}`}>
                <span className="stat-label">Occupancy:</span>
                <span className="stat-value">
                  {Math.round(parseFloat(period.occupancyRate) * 100)}%
                </span>
              </div>
            </div>

            <div className={`availability-badge ${getAvailabilityStatus(
              period.availableSeats,
              period.totalSeats
            ).toLowerCase()}`}>
              {getAvailabilityStatus(period.availableSeats, period.totalSeats)}
            </div>

            <div className="period-description">
              {period.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Get appropriate icon for each time period
 */
function getPeriodIcon(period) {
  const icons = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙'
  };
  return icons[period] || '🚌';
}

export default TimeperiodFilter;
