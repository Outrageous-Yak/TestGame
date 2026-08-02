import L from "leaflet";

export class WorldMapView {
  private map: L.Map;
  private markers: L.LayerGroup;

  constructor(container: HTMLElement, onClick: (lat: number, lon: number) => void) {
    this.map = L.map(container, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
    this.map.on("click", (e: L.LeafletMouseEvent) => onClick(e.latlng.lat, e.latlng.lng));
  }

  setStations(stations: { lat: number; lon: number; label: string }[]) {
    this.markers.clearLayers();
    for (const s of stations) {
      L.marker([s.lat, s.lon]).bindPopup(s.label).addTo(this.markers);
    }
  }

  invalidateSize() {
    setTimeout(() => this.map.invalidateSize(), 200);
  }
}
