declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export function ComposableMap(props: ComposableMapProps): JSX.Element;

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMoveStart?: (pos: unknown) => void;
    onMoveEnd?: (pos: unknown) => void;
    children?: React.ReactNode;
  }
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element;

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: any[] }) => React.ReactNode;
  }
  export function Geographies(props: GeographiesProps): JSX.Element;

  export interface GeographyProps {
    key?: string;
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }
  export function Geography(props: GeographyProps): JSX.Element;

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    style?: React.CSSProperties;
  }
  export function Marker(props: MarkerProps): JSX.Element;

  export interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    step?: [number, number];
  }
  export function Graticule(props: GraticuleProps): JSX.Element;
}
