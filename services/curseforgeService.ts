
import { CurseForgeMod } from '../types';

const API_KEY = process.env.CURSEFORGE_API_KEY;
const BASE_URL = 'https://api.curseforge.com/v1';
const GAME_ID = '83374';

interface CurseForgeApiResponse {
  data: CurseForgeMod[];
}

interface CurseForgeDescriptionResponse {
  data: string;
}

export async function searchMods(searchTerm: string, sortOption: string): Promise<CurseForgeMod[]> {
  if (!API_KEY) {
    throw new Error("CurseForge API key is not configured.");
  }
  
  let sortField = '2'; // Popularity
  let sortOrder = 'desc';

  switch (sortOption) {
    case 'Popularity':
      sortField = '2';
      sortOrder = 'desc';
      break;
    case 'Last Updated':
      sortField = '3';
      sortOrder = 'desc';
      break;
    case 'Name':
      sortField = '4';
      sortOrder = 'asc';
      break;
    case 'Total Downloads':
       sortField = '6';
       sortOrder = 'desc';
       break;
  }

  const url = `${BASE_URL}/mods/search?gameId=${GAME_ID}&searchFilter=${encodeURIComponent(searchTerm)}&sortField=${sortField}&sortOrder=${sortOrder}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      console.error('CurseForge API Error:', errorData);
      throw new Error(`Failed to fetch mods from CurseForge. Status: ${response.status}`);
    }

    const result: CurseForgeApiResponse = await response.json();
    return result.data;

  } catch (error) {
    console.error("Error in searchMods:", error);
    throw error;
  }
}

export async function getModsByIds(modIds: number[]): Promise<CurseForgeMod[]> {
  if (!API_KEY) {
    throw new Error("CurseForge API key is not configured.");
  }
  if (modIds.length === 0) {
    return [];
  }

  const url = `${BASE_URL}/mods`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      console.error('CurseForge API Error:', errorData);
      throw new Error(`Failed to fetch mod details from CurseForge. Status: ${response.status}`);
    }

    const result: CurseForgeApiResponse = await response.json();
    return result.data;

  } catch (error) {
    console.error("Error in getModsByIds:", error);
    throw error;
  }
}

export async function getModDescription(modId: string | number): Promise<string> {
  if (!API_KEY) {
    throw new Error("CurseForge API key is not configured.");
  }

  const url = `${BASE_URL}/mods/${modId}/description`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mod description. Status: ${response.status}`);
    }

    const result: CurseForgeDescriptionResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching mod description:", error);
    return "Failed to load detailed description.";
  }
}
