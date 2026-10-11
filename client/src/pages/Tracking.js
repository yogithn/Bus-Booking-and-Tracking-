import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { formatDateTime as formatDateTimeValue } from '../utils/dateTime';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function getDistanceInKm(from, to) {
  const toRad = (value) => (value * Math.PI) / 180;
  const lat1 = from[0];
  const lon1 = from[1];
  const lat2 = to[0];
  const lon2 = to[1];
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function getFallbackRoadDistanceKm(start, end) {
  if (!start || !end) {
    return null;
  }

  const straightLineKm = getDistanceInKm([start.lat, start.lng], [end.lat, end.lng]);
  return Number((straightLineKm * 1.25).toFixed(1));
}

function isReasonableRouteDetails(routeDetails, fallbackDurationMinutes, fallbackDistanceKm) {
  if (!routeDetails?.coordinates?.length || routeDetails.coordinates.length < 2) {
    return false;
  }

  const routeDuration = Number(routeDetails.durationMinutes);
  const routeDistance = Number(routeDetails.distanceKm);

  if (!Number.isFinite(routeDuration) || routeDuration <= 0 || !Number.isFinite(routeDistance) || routeDistance <= 0) {
    return false;
  }

  if (Number.isFinite(fallbackDurationMinutes) && fallbackDurationMinutes >= 90 && routeDuration < fallbackDurationMinutes * 0.45) {
    return false;
  }

  if (Number.isFinite(fallbackDistanceKm) && fallbackDistanceKm >= 80 && routeDistance < fallbackDistanceKm * 0.5) {
    return false;
  }

  return true;
}

function getRouteProgressMetrics(route, currentPosition, routeDurationMinutes) {
  if (!Array.isArray(route) || route.length < 2) {
    return {
      totalDistanceKm: 0,
      remainingDistanceKm: 0,
      remainingDurationMinutes: Number.isFinite(routeDurationMinutes) ? Math.max(0, Math.round(routeDurationMinutes)) : null
    };
  }

  const cumulativeDistances = [0];
  let totalDistanceKm = 0;

  for (let index = 1; index < route.length; index += 1) {
    totalDistanceKm += getDistanceInKm(route[index - 1], route[index]);
    cumulativeDistances.push(totalDistanceKm);
  }

  if (!currentPosition || totalDistanceKm <= 0) {
    return {
      totalDistanceKm,
      remainingDistanceKm: totalDistanceKm,
      remainingDurationMinutes: Number.isFinite(routeDurationMinutes) ? Math.max(0, Math.round(routeDurationMinutes)) : null
    };
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  route.forEach((point, index) => {
    const distance = getDistanceInKm(point, currentPosition);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  const completedDistanceKm = cumulativeDistances[nearestIndex] || 0;
  const remainingDistanceKm = Math.max(0, totalDistanceKm - completedDistanceKm);
  const remainingRatio = totalDistanceKm > 0 ? remainingDistanceKm / totalDistanceKm : 0;

  return {
    totalDistanceKm,
    remainingDistanceKm,
    remainingDurationMinutes: Number.isFinite(routeDurationMinutes)
      ? Math.max(0, Math.round(routeDurationMinutes * remainingRatio))
      : null
  };
}

function getPointAlongRoute(route, progressPercent) {
  if (!Array.isArray(route) || route.length === 0) {
    return null;
  }

  if (route.length === 1) {
    return route[0];
  }

  const progress = Math.min(1, Math.max(0, Number(progressPercent || 0) / 100));
  if (progress <= 0) {
    return route[0];
  }
  if (progress >= 1) {
    return route[route.length - 1];
  }

  const segmentLengths = [];
  let totalDistanceKm = 0;

  for (let index = 1; index < route.length; index += 1) {
    const segmentDistance = getDistanceInKm(route[index - 1], route[index]);
    segmentLengths.push(segmentDistance);
    totalDistanceKm += segmentDistance;
  }

  if (totalDistanceKm <= 0) {
    return route[0];
  }

  const targetDistance = totalDistanceKm * progress;
  let traversedDistance = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentDistance = segmentLengths[index];
    const nextTraversedDistance = traversedDistance + segmentDistance;

    if (targetDistance <= nextTraversedDistance) {
      const [startLat, startLng] = route[index];
      const [endLat, endLng] = route[index + 1];
      const segmentProgress = segmentDistance > 0
        ? (targetDistance - traversedDistance) / segmentDistance
        : 0;

      return [
        Number((startLat + ((endLat - startLat) * segmentProgress)).toFixed(6)),
        Number((startLng + ((endLng - startLng) * segmentProgress)).toFixed(6))
      ];
    }

    traversedDistance = nextTraversedDistance;
  }

  return route[route.length - 1];
}

function generateTrackingId(value) {
  const normalized = String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  return `TRK-${normalized.slice(-8).padStart(8, '0')}`;
}

const MapInstanceBinder = ({ onReady }) => {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
};

const Tracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState([20.5937, 78.9629]);
  const [trackingBus, setTrackingBus] = useState(null);
  const [overview, setOverview] = useState({ incoming: [], ongoing: [] });
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [currentStreet, setCurrentStreet] = useState('');
  const [routeError, setRouteError] = useState('');
  const [isStopped, setIsStopped] = useState(false);
  const lastBusCoordsRef = useRef(null);

  const routePoints = useMemo(() => (
    routePath.length > 1
      ? routePath
      : trackingBus?.routeEndpoints
        ? [
            [trackingBus.routeEndpoints.start.lat, trackingBus.routeEndpoints.start.lng],
            [trackingBus.routeEndpoints.end.lat, trackingBus.routeEndpoints.end.lng],
          ]
        : []
  ), [routePath, trackingBus]);

  const routeProgressMetrics = useMemo(
    () => getRouteProgressMetrics(routePoints, position, routeDurationMinutes),
    [routePoints, position, routeDurationMinutes]
  );

  const displayedEtaMinutes = Number.isFinite(routeProgressMetrics.remainingDurationMinutes)
    ? routeProgressMetrics.remainingDurationMinutes
    : trackingBus?.durationMinutes;

  useEffect(() => {
    let isMounted = true;

    const fetchRoutePath = async (start, end) => {
      if (!start || !end) {
        return null;
      }

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const routeResponse = await axios.get(osrmUrl);
        const primaryRoute = routeResponse.data.routes?.[0];
        const coordinates = primaryRoute?.geometry?.coordinates || [];

        return {
          coordinates: coordinates.map(([lng, lat]) => [lat, lng]),
          durationMinutes: primaryRoute?.duration ? Math.round(primaryRoute.duration / 60) : null,
          distanceKm: primaryRoute?.distance ? Number((primaryRoute.distance / 1000).toFixed(1)) : null
        };
      } catch (routeFetchError) {
        console.warn('OSRM route fetch failed:', routeFetchError?.message || routeFetchError);
        return null;
      }
    };

    const reverseGeocodeRoad = async (coords) => {
      if (!coords) return '';
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}&addressdetails=1`;
        const response = await axios.get(nominatimUrl, {
          headers: { 'Accept-Language': 'en' }
        });
        const address = response.data.address || {};
        return address.road || address.pedestrian || address.neighbourhood || address.suburb || '';
      } catch (reverseError) {
        console.warn('Reverse geocode failed:', reverseError?.message || reverseError);
        return '';
      }
    };

    const fetchTrackingData = async () => {
      try {
        const [trackResult, overviewResult] = await Promise.allSettled([
          axios.get(`http://localhost:5000/api/buses/tracking/track/${id}`),
          axios.get('http://localhost:5000/api/buses/tracking/overview?limit=6&incomingWindowMinutes=240')
        ]);

        if (!isMounted) {
          return;
        }

        if (trackResult.status !== 'fulfilled') {
          throw trackResult.reason;
        }

        const trackData = trackResult.value.data;
        setTrackingBus(trackData);
        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value.data);
        }
        setError('');

        let resolvedPosition = [trackData.coordinates.lat, trackData.coordinates.lng];

        if (trackData.routeEndpoints) {
          const fallbackDurationMinutes = Number(trackData.durationMinutes);
          const fallbackDistanceKm = Number(trackData.distance)
            || getFallbackRoadDistanceKm(trackData.routeEndpoints.start, trackData.routeEndpoints.end);
          const routeDetails = await fetchRoutePath(trackData.routeEndpoints.start, trackData.routeEndpoints.end);

          if (isReasonableRouteDetails(routeDetails, fallbackDurationMinutes, fallbackDistanceKm)) {
            const snappedPosition = getPointAlongRoute(
              routeDetails.coordinates,
              trackData.progressPercent
            );

            setRoutePath(routeDetails.coordinates);
            setRouteDurationMinutes(routeDetails.durationMinutes);
            setRouteDistanceKm(routeDetails.distanceKm);
            setRouteError('');

            if (snappedPosition) {
              resolvedPosition = snappedPosition;
            }
          } else {
            setRoutePath([]);
            setRouteDurationMinutes(Number.isFinite(fallbackDurationMinutes) ? fallbackDurationMinutes : null);
            setRouteDistanceKm(Number.isFinite(fallbackDistanceKm) ? fallbackDistanceKm : null);
            setRouteError('');
          }
        }

        setPosition(resolvedPosition);

        const currentCoords = resolvedPosition;
        const street = await reverseGeocodeRoad(currentCoords);
        if (!isMounted) {
          return;
        }
        setCurrentStreet(street || 'Road name unavailable');

        if (lastBusCoordsRef.current) {
          const distance = getDistanceInKm(lastBusCoordsRef.current, currentCoords);
          setIsStopped(distance < 0.03);
        }
        lastBusCoordsRef.current = currentCoords;
      } catch (fetchError) {
        if (isMounted) {
          setTrackingBus(null);
          setRoutePath([]);
          setCurrentStreet('');
          setError('Unable to load live bus tracking right now.');
        }
      }
    };

    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // ignore geolocation errors
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!mapInstance || routePoints.length === 0) {
      return;
    }

    const bounds = [...routePoints];
    if (currentLocation) {
      bounds.push(currentLocation);
    }

    mapInstance.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [mapInstance, currentLocation, routePoints]);

  const formatDateTime = (value) => formatDateTimeValue(value);
  const formatEta = (minutes) => {
    if (!Number.isFinite(minutes)) return 'ETA unavailable';
    if (minutes <= 0) return 'Due now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };
  const formatDistance = (distanceKm) => (
    Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : 'Distance unavailable'
  );

  const nearbyPlacesLookup = {
    goa: ['Panaji Bus Stand', 'Madgaon Junction', 'Mapusa Market', 'Ponda Circle'],
    bangalore: ['Majestic Bus Station', 'Yeshwantpur', 'Krishna Rajendra Market', 'Electronic City'],
    bengaluru: ['Majestic Bus Station', 'Yeshwantpur', 'Krishna Rajendra Market', 'Electronic City'],
    mangalore: ['Mangalore KSRTC Bus Stand', 'Bejai', 'Hampankatta', 'Kankanady'],
    mangaluru: ['Mangalore KSRTC Bus Stand', 'Bejai', 'Hampankatta', 'Kankanady'],
    manglore: ['Mangalore KSRTC Bus Stand', 'Bejai', 'Hampankatta', 'Kankanady'],
    mysore: ['Mysore Suburban Bus Stand', 'Mysore Palace', 'KR Circle', 'Mysore Railway Station'],
    mysuru: ['Mysore Suburban Bus Stand', 'Mysore Palace', 'KR Circle', 'Mysore Railway Station'],
    mumbai: ['Bandra Terminus', 'Dadar', 'Andheri', 'Borivali'],
    chennai: ['CMBT', 'Egmore', 'Tambaram', 'Guindy'],
    hyderabad: ['MGBS', 'Secunderabad', 'Kacheguda', 'Lingampally'],
    jaipur: ['Sindhi Camp', 'Birla Mandir', 'Badi Chaupar', 'Jaipur Railway Station'],
  };

  const getNearbyPlaces = (city) => {
    if (!city) return [];
    const normalizedCity = String(city).trim().toLowerCase().replace(/[^a-z]/g, '');
    return nearbyPlacesLookup[normalizedCity] || ['Central Bus Stand', 'Main City Station', 'Downtown Pickup Point'];
  };

  const pickupNearby = getNearbyPlaces(trackingBus?.source);
  const dropNearby = getNearbyPlaces(trackingBus?.destination);
  const displayTrackingId = trackingBus
    ? trackingBus.trackingId || generateTrackingId(trackingBus.busId || id)
    : '';
  const progressPercent = Math.min(100, Math.max(0, Number(trackingBus?.progressPercent || 0)));
  const statusLabel = trackingBus?.isOngoing ? (isStopped ? 'Possibly stopped' : 'In motion') : 'Upcoming';
  const statusTone = trackingBus?.isOngoing ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  const routeTimeText = formatEta(routeDurationMinutes);
  const reachingTimeText = formatEta(displayedEtaMinutes);
  const routeDistanceText = formatDistance(routeDistanceKm || routeProgressMetrics.totalDistanceKm);

  const detailItems = trackingBus ? [
    ['Operator', trackingBus.operator],
    ['Bus Type', trackingBus.busType],
    ['Pickup', trackingBus.source],
    ['Drop', trackingBus.destination],
    ['Pickup Time', formatDateTime(trackingBus.scheduledDeparture)],
    ['Drop Time', formatDateTime(trackingBus.scheduledArrival)],
    ['Current Road', currentStreet || 'Loading road name...'],
    ['Movement', trackingBus.isOngoing ? (isStopped ? 'Possibly stopped' : 'In motion') : 'Not yet on route'],
    ['Pickup Nearby', pickupNearby.join(', ')],
    ['Drop Nearby', dropNearby.join(', ')],
  ] : [];

  const summaryItems = trackingBus ? [
    ['Route Time', routeTimeText],
    ['Reaching Time', reachingTimeText],
    ['Distance', routeDistanceText],
    ['Seats Left', trackingBus.availableSeats],
  ] : [];

  const relocateMapView = () => {
    if (!mapInstance) {
      return;
    }

    if (position) {
      mapInstance.flyTo(position, 13, { animate: true, duration: 0.8 });
    }
  };

  return (
    <div className="tracking-shell min-h-screen overflow-hidden px-5 py-6 md:px-10">
      <div className="tracking-orb tracking-orb-one" />
      <div className="tracking-orb tracking-orb-two" />
      <div className="relative z-10 mx-auto max-w-[1520px]">
      <div className="tracking-hero mb-6 flex flex-col gap-5 rounded-[34px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(36,54,83,0.14)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-[#d35f4f]">Live tracking console</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Live Bus Tracking</h1>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600">
            Cleaner journey view with route tracking, animated progress, and nearby live buses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#d35f4f]"
        >
          <span className="mr-2 transition group-hover:-translate-x-1">Back</span>
          to Home
        </button>
      </div>
      {error ? (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-red-700 shadow-sm">{error}</div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)]">
        <div>
          <div className="tracking-card mb-5 rounded-[34px] border border-white/75 bg-white/85 p-6 shadow-[0_20px_70px_rgba(36,54,83,0.13)] backdrop-blur">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">{trackingBus ? trackingBus.route : 'Loading route...'}</h2>
                  {trackingBus ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${statusTone}`}>
                      {statusLabel}
                    </span>
                  ) : null}
                </div>
                {trackingBus ? (
                  <p className="mt-2 text-sm font-semibold text-slate-500">Track ID: {displayTrackingId}</p>
                ) : null}
              </div>
              {trackingBus ? (
                <div className="tracking-id-badge inline-flex rounded-3xl border border-[#cfe1ff] bg-[#eef6ff] px-5 py-4 text-sm font-black tracking-[0.22em] text-[#2357d8]">
                  {displayTrackingId}
                </div>
              ) : null}
            </div>
            {trackingBus ? (
              <div>
                <div className="mb-5 grid gap-3 md:grid-cols-4">
                  {summaryItems.map(([label, value], index) => (
                    <div key={label} className="tracking-stat rounded-3xl border border-slate-100 bg-slate-50/90 p-4" style={{ animationDelay: `${index * 80}ms` }}>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
                      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-5 rounded-3xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">
                    <span>Journey progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="tracking-progress-track">
                    <div className="tracking-progress-fill" style={{ width: `${progressPercent}%` }}>
                      <span className="tracking-bus-dot" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  {detailItems.map(([label, value], index) => (
                    <div key={label} className="tracking-detail rounded-2xl border border-slate-100 bg-white/80 px-4 py-3" style={{ animationDelay: `${index * 45}ms` }}>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                      <p className="mt-1 font-semibold leading-6 text-slate-800">{value || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Loading live tracking...</p>
            )}
          </div>
          <div className="tracking-map-card relative overflow-hidden rounded-[34px] border border-white/70 bg-white/80 p-3 shadow-[0_22px_70px_rgba(36,54,83,0.16)]">
            {routeError ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 text-sm">
                {routeError}
              </div>
            ) : null}
            <button
              type="button"
              onClick={relocateMapView}
              disabled={!mapInstance}
              className="absolute right-7 top-7 z-[1000] rounded-full border border-white bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#d35f4f]"
            >
              Relocate
            </button>
            <MapContainer center={position} zoom={7} className="tracking-map" style={{ height: '470px', width: '100%' }}>
              <MapInstanceBinder onReady={setMapInstance} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {routePoints.length > 1 && (
                <Polyline positions={routePoints} pathOptions={{ color: '#d7302b', weight: 5, opacity: 0.8 }} />
              )}
              {trackingBus?.routeEndpoints && (
                <>
                  <Marker position={routePoints[0]}>
                    <Popup>
                      Pickup: {trackingBus.source}
                    </Popup>
                  </Marker>
                  <Marker position={routePoints[routePoints.length - 1]}>
                    <Popup>
                      Drop: {trackingBus.destination}
                    </Popup>
                  </Marker>
                </>
              )}
              {currentLocation && (
                <CircleMarker center={currentLocation} pathOptions={{ color: '#2a9d8f', fillColor: '#2a9d8f' }} radius={8}>
                  <Popup>Your location</Popup>
                </CircleMarker>
              )}
              <Marker position={position}>
                <Popup>
                  {trackingBus ? `${trackingBus.route}` : 'Bus Location'}<br />
                  {trackingBus ? `${trackingBus.progressPercent}% of trip completed` : 'Loading'}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
        <div>
          <section className="tracking-live-card rounded-[34px] border border-white/75 bg-white/85 p-6 shadow-[0_20px_70px_rgba(36,54,83,0.13)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d35f4f]">Nearby activity</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Live bus updates</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">Scroll</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto pr-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Next Incoming Buses</h3>
                <div className="mt-3 space-y-3">
                  {overview.incoming?.length ? overview.incoming.map((bus) => (
                    <div key={`${bus.busId}-incoming`} className="tracking-update-row rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.16)]" />
                        <div>
                          <p className="font-black text-slate-900">{bus.route}</p>
                          <p className="text-sm font-semibold text-slate-500">{bus.operator}</p>
                          <p className="mt-1 text-sm font-bold text-[#d35f4f]">Arrives in {formatEta(bus.minutesToArrival)}</p>
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-500">No incoming buses in the selected tracking window.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Ongoing Buses</h3>
                <div className="mt-3 space-y-3">
                  {overview.ongoing?.length ? overview.ongoing.map((bus) => (
                    <div key={`${bus.busId}-ongoing`} className="tracking-update-row rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="font-black text-slate-900">{bus.route}</p>
                      <p className="text-sm font-semibold text-slate-500">{bus.operator}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#d35f4f]" style={{ width: `${Math.min(100, Math.max(0, Number(bus.progressPercent || 0)))}%` }} />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-700">{bus.progressPercent}% completed</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No buses are currently shown on the road.</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Tracking;
