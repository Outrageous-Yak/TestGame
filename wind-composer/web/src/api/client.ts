import type { SettingsDto, StationDto, TickResponse } from "../types";

const API_BASE = "";

export class ApiClient {
  sessionId: string | null = null;

  async createSession(): Promise<string> {
    const res = await fetch(`${API_BASE}/api/session`, { method: "POST" });
    const data = await res.json();
    this.sessionId = data.session_id;
    return data.session_id;
  }

  private sid(): string {
    if (!this.sessionId) throw new Error("No session");
    return this.sessionId;
  }

  async getSettings(): Promise<SettingsDto> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/settings`);
    return res.json();
  }

  async updateSettings(patch: Partial<SettingsDto>): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async tick(body: {
    mic_energy: number;
    gust: boolean;
    sample_delta: number;
    fft: number[];
  }): Promise<TickResponse> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async start(): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/start`, { method: "POST" });
  }

  async stop(): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/stop`, { method: "POST" });
  }

  async searchLocations(query: string): Promise<GeoLocationDto[]> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/weather/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    return res.json();
  }

  async listStations(): Promise<StationDto[]> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/stations`);
    return res.json();
  }

  async addStation(location: object, mix = 1): Promise<StationDto> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, mix }),
    });
    return res.json();
  }

  async mapClick(lat: number, lon: number): Promise<StationDto> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/stations/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });
    return res.json();
  }

  async updateMix(stationId: string, mix: number): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/stations/${stationId}/mix`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mix }),
    });
  }

  async removeStation(stationId: string): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/stations/${stationId}`, {
      method: "DELETE",
    });
  }

  async listFavourites(): Promise<{ id: string; label: string; location: object }[]> {
    const res = await fetch(`${API_BASE}/api/session/${this.sid()}/favourites`);
    return res.json();
  }

  async addFavourite(label: string, location: object): Promise<void> {
    await fetch(`${API_BASE}/api/session/${this.sid()}/favourites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, location }),
    });
  }
}

export interface GeoLocationDto {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}
