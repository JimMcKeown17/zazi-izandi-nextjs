"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface SchoolLocation {
  name: string;
  latitude: number;
  longitude: number;
  area: string;
  circuit?: string;
  phase?: string;
  grR?: number;
  gr1?: number;
  years?: string;
}

interface SchoolMapProps {
  schools: SchoolLocation[];
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

    // Initialize map centered on Eastern Cape, South Africa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [27.9, -32.3], // Eastern Cape coordinates
      zoom: 8,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);

      if (!map.current) return;

      // Convert schools to GeoJSON format
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: schools.map((school) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [school.longitude, school.latitude],
          },
          properties: {
            name: school.name,
            area: school.area || "N/A",
            circuit: school.circuit || "N/A",
            phase: school.phase || "N/A",
            grR: school.grR || 0,
            gr1: school.gr1 || 0,
            years: school.years || "N/A",
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

      // Add cluster circles
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

      // Add individual school markers
      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "schools",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#2c5aa0",
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

        // Create popup content
        const popupContent = `
          <div style="padding: 12px; min-width: 220px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #2c5aa0;">
              ${props?.name || "Unknown School"}
            </h3>
            <div style="font-size: 13px; color: #4b5563; line-height: 1.6;">
              <p style="margin: 4px 0;"><strong>Area:</strong> ${props?.area}</p>
              <p style="margin: 4px 0;"><strong>Circuit:</strong> ${props?.circuit}</p>
              <p style="margin: 4px 0;"><strong>Phase:</strong> ${props?.phase}</p>
              <p style="margin: 4px 0;"><strong>Grade R:</strong> ${props?.grR} students</p>
              <p style="margin: 4px 0;"><strong>Grade 1:</strong> ${props?.gr1} students</p>
              <p style="margin: 4px 0;"><strong>Years Active:</strong> ${props?.years}</p>
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