// Type definitions for react-leaflet components
declare module "react-leaflet" {
  import { ReactNode } from "react";
  import * as L from "leaflet";

  export interface MapContainerProps
    extends React.HTMLAttributes<HTMLDivElement> {
    center: L.LatLngExpression;
    zoom: number;
    whenCreated?: (map: L.Map) => void;
    children?: ReactNode;
  }

  export const MapContainer: React.FC<MapContainerProps>;
  export const TileLayer: React.FC<{
    url: string;
    attribution?: string;
  }>;

  export interface GeoJSONProps {
    data: GeoJSON.GeoJsonObject;
    onEachFeature?: (feature: any, layer: L.Layer) => void;
    style?: L.PathOptions | ((feature?: any) => L.PathOptions);
  }

  export const GeoJSON: React.FC<GeoJSONProps>;

  export interface MarkerProps {
    position: L.LatLngExpression;
    icon?: L.Icon | L.DivIcon;
    eventHandlers?: L.LeafletEventHandlerFnMap;
    ref?: any;
    children?: ReactNode;
  }

  export const Marker: React.FC<MarkerProps>;

  export interface PopupProps {
    children?: ReactNode;
  }

  export const Popup: React.FC<PopupProps>;

  export interface CircleProps {
    center: L.LatLngExpression;
    radius: number;
    pathOptions?: L.PathOptions;
    children?: ReactNode;
  }

  export const Circle: React.FC<CircleProps>;

  export function useMap(): L.Map;
}
