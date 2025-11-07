"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface SchoolData {
  NatEmis: number | null;
  Official_Institution_Name: string;
  CMC?: string | null;
  EICircuit?: string | null;
  Phase_PED?: string | null;
  "Gr R"?: number | null;
  "Gr 1"?: number | null;
  "Year(s) on the Programme"?: string | null;
  Matched_GPS_Coordinates: string | null;
  Matched_Area?: string | null;
  performance?: string | null; // Optional - for future use
}

interface SchoolMapProps {
  schools: SchoolData[];
}

export default function SchoolMap({ schools }: SchoolMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      console.error("Mapbox token not found. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local");
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Parse schools data and assign random performance (80% green for now)
    const parsedSchools = schools
      .map(school => {
        // Parse coordinates string (format: "lat, long" with space)
        const coords = school.Matched_GPS_Coordinates?.split(',').map(c => parseFloat(c.trim()));
        
        if (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
          console.warn(`Invalid coordinates for ${school.Official_Institution_Name}:`, school.Matched_GPS_Coordinates);
          return null;
        }

        // Assign performance: use provided or randomize (80% high, 10% good, 10% low)
        let performance = school.performance;
        if (!performance) {
          const rand = Math.random();
          if (rand < 0.8) performance = "high";
          else if (rand < 0.9) performance = "good";
          else performance = "low";
        }

        return {
          name: school.Official_Institution_Name || 'Unknown School',
          latitude: coords[0],
          longitude: coords[1],
          area: school.Matched_Area || 'N/A',
          circuit: school.EICircuit || 'N/A',
          cmc: school.CMC || 'N/A',
          phase: school.Phase_PED || 'N/A',
          grR: school["Gr R"] || 0,
          gr1: school["Gr 1"] || 0,
          years: school["Year(s) on the Programme"] || 'N/A',
          natEmis: school.NatEmis?.toString() || 'N/A',
          performance: performance,
        };
      })
      .filter(school => school !== null);

    console.log(`Loaded ${parsedSchools.length} schools with valid coordinates`);

    // Count performance levels
    const performanceCounts = {
      high: parsedSchools.filter(s => s.performance === 'high').length,
      good: parsedSchools.filter(s => s.performance === 'good').length,
      low: parsedSchools.filter(s => s.performance === 'low').length,
    };
    console.log('Performance distribution:', performanceCounts);

    // Initialize map centered on Eastern Cape, South Africa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [25.6, -33.9], // Port Elizabeth/Gqeberha area
      zoom: 9,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);

      if (!map.current) return;

      // Convert schools to GeoJSON format
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: parsedSchools.map((school) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [school.longitude, school.latitude],
          },
          properties: {
            name: school.name,
            area: school.area,
            circuit: school.circuit,
            cmc: school.cmc,
            phase: school.phase,
            grR: school.grR,
            gr1: school.gr1,
            years: school.years,
            natEmis: school.natEmis,
            performance: school.performance,
          },
        })),
      };

      // Add source
      map.current.addSource("schools", {
        type: "geojson",
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add cluster circles (keep existing cluster styling)
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "schools",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981", // Green for small clusters
            10,
            "#f59e0b", // Orange for medium
            30,
            "#ef4444", // Red for large
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20, // Small clusters
            10,
            30, // Medium clusters
            30,
            40, // Large clusters
          ],
        },
      });

      // Add cluster count labels
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "schools",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add individual school markers - NOW COLOR-CODED by performance
      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "schools",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "performance"],
            "high", "#10b981",  // Green for high performance
            "good", "#f59e0b",  // Yellow/Orange for good
            "low", "#ef4444",   // Red for low
            "#2c5aa0"           // Default blue (fallback)
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Add click handler for clusters
      map.current.on("click", "clusters", (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });

        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource("schools") as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;

          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.current.easeTo({
            center: [coordinates[0], coordinates[1]],
            zoom: zoom || 10,
          });
        });
      });

      // Add click handler for individual schools
      map.current.on("click", "unclustered-point", (e) => {
        if (!map.current || !e.features || !e.features[0]) return;

        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
        const props = e.features[0].properties;

        // Get performance label and color
        const performanceLabels: Record<string, { label: string; color: string }> = {
          high: { label: "High Impact", color: "#10b981" },
          good: { label: "Good Progress", color: "#f59e0b" },
          low: { label: "Needs Support", color: "#ef4444" },
        };
        
        const perfInfo = performanceLabels[props?.performance] || { label: "Unknown", color: "#2c5aa0" };

        // Create popup content
        const popupContent = `
          <div style="padding: 12px; min-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #2c5aa0;">
                ${props?.name || "Unknown School"}
              </h3>
              <span style="background: ${perfInfo.color}; color: white; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 12px;">
                ${perfInfo.label}
              </span>
            </div>
            <div style="font-size: 13px; color: #4b5563; line-height: 1.6;">
              <p style="margin: 4px 0;"><strong>NatEmis:</strong> ${props?.natEmis}</p>
              <p style="margin: 4px 0;"><strong>Area:</strong> ${props?.area}</p>
              <p style="margin: 4px 0;"><strong>CMC:</strong> ${props?.cmc}</p>
              <p style="margin: 4px 0;"><strong>Circuit:</strong> ${props?.circuit}</p>
              <p style="margin: 4px 0;"><strong>Phase:</strong> ${props?.phase}</p>
              <p style="margin: 4px 0;"><strong>Grade R:</strong> ${props?.grR} students</p>
              <p style="margin: 4px 0;"><strong>Grade 1:</strong> ${props?.gr1} students</p>
              <p style="margin: 4px 0;"><strong>Years:</strong> ${props?.years}</p>
            </div>
          </div>
        `;

        new mapboxgl.Popup()
          .setLngLat([coordinates[0], coordinates[1]])
          .setHTML(popupContent)
          .addTo(map.current);
      });

      // Change cursor on hover
      map.current.on("mouseenter", "clusters", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "clusters", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
      map.current.on("mouseenter", "unclustered-point", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "unclustered-point", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [schools]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}