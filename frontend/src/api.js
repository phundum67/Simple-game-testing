const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong while talking to the backend.");
  }

  return data;
}

export async function fetchCharacters() {
  return request("/api/characters");
}

export async function fetchLeaderboard(limit = 10) {
  return request(`/api/leaderboard?limit=${limit}`);
}

export async function submitScore(payload) {
  return request("/api/scores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

